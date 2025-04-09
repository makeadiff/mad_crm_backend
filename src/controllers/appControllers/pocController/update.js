const { Op } = require('sequelize');
const Joi = require('joi');
const { Partner, Poc, PocPartner } = require('../../../../models');

const pocSchema = Joi.object({
  partner_id: Joi.number().integer().required(),
  poc_name: Joi.string().required(),
  poc_designation: Joi.string().required(),
  poc_contact: Joi.number().integer().required(),
  poc_email: Joi.string().required(),
  date_of_first_contact: Joi.date().iso().required()
});


const update = async (req, res) => {
  try {
    console.log('>>>>>>>>>>>>>>>>>>>poc update api hitted<<<<<<<<<<<<<<<<<<<<<<<<<<<<');
    // Validate the request body

    const { error, value } = pocSchema.validate(req.body);

    if (error) {
      return res.status(400).json({ message: 'Validation Error', details: error.details });
    }

    const { partner_id, poc_name, poc_designation, poc_contact, poc_email, date_of_first_contact } = value;

    const pocId = req.params.id;

    // Find existing poc
    const existedPoc = await Poc.findByPk(pocId);
    if (!existedPoc) {
      return res.status(404).json({ success: false, message: 'Poc not found' });
    }

    const pocUpdate = await Poc.update(
      {
        poc_name,
        poc_designation,
        poc_contact,
        poc_email,
        date_of_first_contact
      },
      { where: { id: pocId } }
    );

    return res
      .status(200)
      .json({ success: true, message: 'Successfully updated poc details.', poc_req_status: "updated" });
  } catch (error) {
    console.error('Error updating poc:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating poc details',
      error: error.message,
    });
  }
};

module.exports = update;
