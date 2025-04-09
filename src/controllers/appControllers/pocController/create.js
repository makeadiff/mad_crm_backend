const Joi = require('joi');
const { Partner, Poc, PocPartner, Meeting } = require('../../../../models');

const pocSchema = Joi.object({
  partner_id: Joi.number().integer().required(),
  poc_name: Joi.string().required(),
  poc_designation: Joi.string().required(),
  poc_contact: Joi.number().integer().required(),
  poc_email: Joi.string().required(),
  date_of_first_contact: Joi.date().iso().required()
});

const create = async (req, res) => {
  try {

    console.log(">>>>>>>>>>>>>>>>>>>poc creation api hitted<<<<<<<<<<<<<<<<<<<<<<<<<<<<")
    // Validate the request body
    const { error, value } = pocSchema.validate(req.body);

    if (error) {
      return res.status(400).json({ message: 'Validation Error', details: error.details });
    }

    const {
      partner_id,
      poc_name,
      poc_designation,
      poc_contact,
      poc_email,
      date_of_first_contact,
    } = value;

    const partner = await Partner.findByPk(partner_id);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Partner not found' });
    }

    const newPoc = await Poc.create({
              partner_id: partner_id,
              poc_name,
              poc_designation,
              poc_contact,
              poc_email,
              date_of_first_contact,
            });

    console.log('------------->PocController/create.js new poc is created<----------------- ');
    

    const newPocPartner = await PocPartner.create({
      poc_id: newPoc.dataValues.id,
      partner_id: partner_id,
    });

    console.log('------------->PocController/create.js new pocPartner is created<----------------- ');

    const newMeeting = await Meeting.create({
      user_id: partner.dataValues.created_by,
      poc_id: newPoc.dataValues.id,
      partner_id: partner_id,
      meeting_date: date_of_first_contact,
    });

    console.log(
      '------------->PocController/create.js new Meeting is created<----------------- '
    );

    return res.status(201).json({
      success: true,
      message: 'Poc created successfully.',
      result: newPoc
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

module.exports = create;
