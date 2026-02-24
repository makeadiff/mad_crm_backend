const Joi = require('joi');
const { Mou, Partner, PartnerAgreement, sequelize } = require('../../../../models');
const { uploadFileToS3 } = require('../../../middlewares/uploadMiddleware/uploadFileToS3');

const renewMouSchema = Joi.object({
  mou_sign_date: Joi.date().required(),
  mou_start_date: Joi.date().required(),
  mou_end_date: Joi.date().required(),
  confirmed_child_count: Joi.number().integer().required(),
});

const renewMou = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const partnerId = req.params.id;

    // Validate body fields
    const { error, value } = renewMouSchema.validate(req.body, { allowUnknown: true });
    if (error) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        details: error.details.map((d) => d.message),
      });
    }

    const { mou_sign_date, mou_start_date, mou_end_date, confirmed_child_count } = value;

    // Check partner exists
    const partner = await Partner.findByPk(partnerId, { transaction: t });
    if (!partner) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Partner not found' });
    }

    // Upload MOU document to S3
    const file = req.files && req.files.mou_document;
    if (!file) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'MOU document is required' });
    }

    const originalName = file.name || 'mou-document.pdf';

    let mou_url;
    try {
      mou_url = await uploadFileToS3(file, 'mou_documents', originalName);
    } catch (uploadError) {
      await t.rollback();
      console.error('Error uploading MOU to S3:', uploadError);
      return res.status(500).json({ success: false, message: 'File upload failed' });
    }

    // Mark current active MOU(s) as inactive (removed stays false)
    await Mou.update(
      { mou_status: 'inactive' },
      {
        where: { partner_id: partnerId, mou_status: 'active' },
        transaction: t,
      }
    );

    // Create new renewed MOU
    const newMou = await Mou.create(
      {
        partner_id: partnerId,
        mou_sign: true,
        mou_sign_date,
        mou_start_date,
        mou_end_date,
        mou_status: 'active',
        confirmed_child_count,
        mou_url,
        removed: false,
      },
      { transaction: t }
    );

    // Record renewal in partner agreement history
    await PartnerAgreement.create(
      {
        partner_id: partnerId,
        conversion_stage: 'converted',
        current_status: 'renewed',
        removed: false,
      },
      { transaction: t }
    );

    await t.commit();

    return res.status(200).json({
      success: true,
      message: 'MOU renewed successfully',
      result: newMou,
    });
  } catch (error) {
    await t.rollback();
    console.error('Error renewing MOU:', error);
    return res.status(500).json({
      success: false,
      message: 'Error renewing MOU',
      error: error.message,
    });
  }
};

module.exports = renewMou;
