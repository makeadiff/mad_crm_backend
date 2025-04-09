const { Op } = require('sequelize');
const Joi = require('joi');
const { Partner, Poc, PocPartner } = require('../../../../models');

const remove = async (req, res) => {
  try {
    console.log('>>>>>>>>>>>>>>>>>>>poc delete api hitted<<<<<<<<<<<<<<<<<<<<<<<<<<<<');

    const pocId = req.params.id;

    // Find existing poc
    const existedPoc = await Poc.findByPk(pocId);
    if (!existedPoc) {
      return res.status(404).json({ success: false, message: 'Poc not found' });
    }

    const pocUpdate = await Poc.update(
      {
        removed: true
      },
      { where: { id: pocId } }
    );

    return res
      .status(200)
      .json({ success: true, message: 'Poc Deleted Successfull'});
  } catch (error) {
    console.error('Error deleting poc:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting poc details',
      error: error.message,
    });
  }
};

module.exports = remove;
