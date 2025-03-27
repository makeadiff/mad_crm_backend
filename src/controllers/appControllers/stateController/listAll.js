const { State } = require('../../../../models');

// ✅ Get all states
const listAll = async (req, res) => {
  try {
    const states = await State.findAll({ order: [['state_name', 'ASC']] }); // Sort alphabetically

    return res.status(200).json({
      success: true,
      message: 'List of Indian states and union territories.',
      states,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong.',
      error: error.message,
    });
  }
};

module.exports = listAll;
