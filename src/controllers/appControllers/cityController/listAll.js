const { City } = require('../../../../models');

const listAll = async (req, res) => {
console.log("city fetched api hittted")
  const { stateId } = req.query;

  // Validate input
  if (!stateId || isNaN(stateId)) {
    return res.status(400).json({ success: false, message: 'Invalid state ID' });
  }

  try {
    // Fetch cities based on state ID
    const cities = await City.findAll({
      where: { state_id: stateId },
      attributes: ['id', 'city_name'],
    });
    
    if (!cities.length) {
      return res.status(404).json({ success: false, message: 'No cities found for this state' });
    }

    res.json({ success: true, cities });
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};

module.exports = listAll;
