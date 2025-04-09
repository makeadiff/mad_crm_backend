const { Op } = require('sequelize');
const Joi = require('joi');
const { Partner, Poc, PocPartner } = require('../../../../models');

const remove = async (req, res) => {
  try {
    console.log('>>>>>>>>>>>>>>>>>>>partner/Lead delete api hitted<<<<<<<<<<<<<<<<<<<<<<<<<<<<');

    const partnerId = req.params.id;

    // Find existing poc
    const existedPartner = await Partner.findByPk(partnerId);
    if (!existedPartner) {
      return res.status(404).json({ success: false, message: 'Partner not found' });
    }

    const partnerUpdate = await Partner.update(
      {
        removed: true
      },
      { where: { id: partnerId } }
    );

    if (!partnerUpdate) {
      return res.status(404).json({ success: false, message: 'Error deleting lead' });
    }

    return res
      .status(200)
      .json({ success: true, message: 'Lead Deleted Successfull'});
  } catch (error) {
    console.error('Error deleting lead:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting lead details',
      error: error.message,
    });
  }
};

module.exports = remove;
