const Joi = require('joi');
const { Partner, PartnerCo, PartnerAgreement } = require('../../../../models');

const partnerSchema = Joi.object({
  conversion_stage: Joi.string().valid(
    'new',
    'first_conversation',
    'interested',
    'interested_but_facing_delay',
    'not_interested',
    'converted',
    'dropped'
  ),
  partner_name: Joi.string().min(3).max(255).required(),
  address_line_1: Joi.string().required(),
  address_line_2: Joi.string().allow(null, ''),
  pincode: Joi.number().integer().required(),
  partner_affiliation_type: Joi.string().allow(null, ''),
  school_type: Joi.string().allow(null, ''),
  total_child_count: Joi.number().integer().allow(null),
  state_id: Joi.number().integer().required(),
  city_id: Joi.number().integer().required(),
  lead_source: Joi.string().required(),
  classes: Joi.array().items(Joi.string()).allow(null),
  low_income_resource: Joi.boolean().default(false),
  co_id: Joi.number().integer().required(),
});

const create = async (req, res) => {
  try {

    console.log(">>>>>>>>>>>>>>>>>>>partner/ lead creation api hitted<<<<<<<<<<<<<<<<<<<<<<<<<<<<")
    // Validate the request body
    const { error, value } = partnerSchema.validate(req.body);

    if (error) {
      return res.status(400).json({ message: 'Validation Error', details: error.details });
    }

    const {
      conversion_stage = 'new',
      partner_name,
      address_line_1,
      address_line_2,
      pincode,
      partner_affiliation_type,
      school_type,
      total_child_count,
      created_by,
      state_id,
      city_id,
      lead_source,
      classes,
      low_income_resource,
      co_id,
    } = value;

    // Create a new partner
    const partner = await Partner.create({
      partner_name,
      address_line_1,
      address_line_2,
      pincode,
      // partner_affiliation_type,
      // school_type,
      // total_child_count,
      created_by : co_id,
      state_id,
      city_id,
      lead_source
      // classes,
      // low_income_resource,
    });

    console.log("-------------> create.js partner is created<----------------- ")

    // Create a PartnerCo entry
    await PartnerCo.create({
      partner_id: partner.id,
      co_id,
    });

    console.log('------------->create.js partnerCO is created<----------------- ');


    // Create an initial PartnerAgreement entry
    await PartnerAgreement.create({
      partner_id: partner.id,
      conversion_stage,
      specific_doc_required: false,
    });

    console.log('------------->create.js partner_agreement is created<----------------- ');

    return res.status(201).json({ message: 'Partner created successfully', partner });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

module.exports = create;
