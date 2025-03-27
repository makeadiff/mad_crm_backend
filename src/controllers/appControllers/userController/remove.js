const Lead = require('@/models/appModels/Lead.js');

const remove = async (req, res) => {
  try {
    console.log("remove api hitted");
    // Example: You could log who deleted this lead, or add audit fields
    const updates = {
      removed: true,
      removedBy: req.user ? req.user._id : null, // Capture who removed the lead if you have `req.user`
      removedAt: new Date(), // Optional timestamp
    };

    // Find the lead and soft-delete it
    const result = await Lead.findOneAndUpdate(
      { _id: req.params.id },
      { $set: updates },
      { new: true } // Return the updated document (soft-deleted version)
    ).exec();

    if (!result) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Lead not found',
      });
    }

    // Optional: Add post-delete hooks (like notifications or activity logs)

    return res.status(200).json({
      success: true,
      result,
      message: 'Successfully marked the Lead as removed',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error removing the Lead',
      error: error.message,
    });
  }
};

module.exports = remove;
