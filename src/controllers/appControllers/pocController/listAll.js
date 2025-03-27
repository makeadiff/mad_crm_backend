const Lead = require('@/models/appModels/Lead');

const listAll = async (req, res) => {
  console.log("list all api hitted");
  const sort = req.query.sort || 'desc';
  const enabled = req.query.enabled || undefined;

  try {
    let query = { removed: false };

    // Add enabled filter if specified
    if (enabled !== undefined) {
      query.enabled = enabled;
    }

    const leads = await Lead.find(query)
      .sort({ created: sort })
      .populate('assignedTo', 'name email') // Assuming leads can be assigned to users
      .populate('company', 'name') // Assuming leads are associated with companies
      .exec();

    if (leads.length > 0) {
      return res.status(200).json({
        success: true,
        result: leads,
        message: 'Successfully found all leads',
      });
    } else {
      return res.status(203).json({
        success: false,
        result: [],
        message: 'No leads found',
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error finding leads',
      error: error.message,
    });
  }
};

module.exports = listAll;
