// const Lead = require('@/models/appModels/Lead.js');

const create = async (req, res) => {
  // Your custom create logic for Lead
  // Example:

  console.log("poc creation api hitted");
//   req.body.createdBy = req.user.id;
  const result = await new Lead(req.body).save();

  return res.status(201).json({
    success: true,
    result,
    message: 'Lead created successfully',
  });
};

module.exports = create;
