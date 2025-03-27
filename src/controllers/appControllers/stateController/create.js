const { State } = require('../../../../models');

const create = async (req, res) => {
  console.log('state creation api hitted');
  try {
    const states = [
      'Andhra Pradesh',
      'Arunachal Pradesh',
      'Assam',
      'Bihar',
      'Chhattisgarh',
      'Goa',
      'Gujarat',
      'Haryana',
      'Himachal Pradesh',
      'Jharkhand',
      'Karnataka',
      'Kerala',
      'Madhya Pradesh',
      'Maharashtra',
      'Manipur',
      'Meghalaya',
      'Mizoram',
      'Nagaland',
      'Odisha',
      'Punjab',
      'Rajasthan',
      'Sikkim',
      'Tamil Nadu',
      'Telangana',
      'Tripura',
      'Uttar Pradesh',
      'Uttarakhand',
      'West Bengal',
      'Andaman and Nicobar Islands',
      'Chandigarh',
      'Dadra and Nagar Haveli and Daman and Diu',
      'Lakshadweep',
      'Delhi',
      'Puducherry',
      'Ladakh',
      'Jammu and Kashmir',
    ].map((name) => ({ state_name: name }));

    await State.bulkCreate(states, { ignoreDuplicates: true });

    return res
      .status(201)
      .json({ success: true, message: 'Indian states added successfully.', states });
  } catch (error) {
    console.log('--------------------------error in state creation--------------------------');
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: 'Something went wrong.', error: error.message });
  }
};

module.exports = create;
