const { Op } = require('sequelize');
const Joi = require('joi');
const { Partner, Poc, PocPartner,PartnerAgreement, Mou, sequelize } = require('../../../../models');

// Allowed delete reasons (values are what frontend will send)
const validDeleteReasons = [
  'duplicate_entry',
  'school_dropped',
  'school_inactive',
  'school_did_not_want_to_continue_with_mad'
];

const deleteSchema = Joi.object({
  delete_reason: Joi.string().valid(...validDeleteReasons).required(),
  delete_remarks: Joi.string().allow('', null),
});


const remove = async (req, res) => {
   const t = await sequelize.transaction();
  try {
    const partnerId = req.params.id;

    const { error, value } = deleteSchema.validate(req.body || {});
    if (error) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid delete payload',
        details: error.details.map(d => d.message),
      });
    }

    const { delete_reason} = req.body;

    const partner = await Partner.findOne({
      where: { id: partnerId},
      transaction: t,
    });

    if (!partner) {
      await t.rollback();
      return res
        .status(404)
        .json({ success: false, message: 'Organization not found or already deleted' });
    }

    await Partner.update(
      { removed: false },
      { where: { id: partnerId }, transaction: t }
    );


    await PartnerAgreement.create(
      {
        partner_id: partnerId,
        conversion_stage: 'dropped',
        non_conversion_reason: delete_reason,
        current_status: 'dropped',
        agreement_drop_date: new Date(),
        removed: false,
      },
      { transaction: t }
    );

    // 5️⃣ Find latest active MOU and mark it inactive
    // mou_status enum has 'inactive' (per schema), so we set to 'inactive'
    const latestActiveMou = await Mou.findOne({
      where: {
        partner_id: partnerId,
        mou_status: 'active', // adjust if your enum uses different active value
      },
      order: [['updatedAt', 'DESC']],
      transaction: t,
    });

    if (latestActiveMou) {
      await latestActiveMou.update(
        { mou_status: 'inactive' },
        { transaction: t }
      );
    }

    // 6️⃣ Commit all changes
    await t.commit();

    return res.status(200).json({
      success: true,
      message: 'Organization deleted successfully',
    });
  } catch (error) {
    await t.rollback();
    console.error('Error deleting organization:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting organization details',
      error: error.message,
    });
  }
};

module.exports = remove;