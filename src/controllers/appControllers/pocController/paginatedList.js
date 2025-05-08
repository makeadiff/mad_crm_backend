const { Op } = require('sequelize');
const {
  Poc,
  Partner,
  PartnerCo,
  User,
  City,
  ManagerCo,
  PocPartner,
} = require('../../../../models');

const paginatedList = async (req, res) => {
  console.log('POC paginated list API hit');

  const { user_role:role, user_id: user_id } = req.user; // Extract role and user ID
  // console.log('User Role & ID:', role, user_id); 

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.items) || 10;
  const offset = (page - 1) * limit;

  const { sortBy = 'createdAt', sortValue = 'DESC', filter, equal, q: searchQuery } = req.query;

  // Fields to search in
  const searchableFields = ['poc_name', 'poc_email', 'poc_phone'];
  let queryConditions = {};

  // Add search functionality
  if (searchQuery) {
    queryConditions[Op.or] = searchableFields.map((field) => ({
      [field]: { [Op.iLike]: `%${searchQuery}%` },
    }));
  }

  // Add filters if provided
  if (filter && equal !== undefined) {
    queryConditions[filter] = equal;
  }

  // **Apply Role-Based Access Control**
  if (role === 'manager') {
    // **1. Get COs under this manager**
    const managedCos = await ManagerCo.findAll({
      where: { manager_id: user_id },
      attributes: ['co_id'],
    }).then((rows) => rows.map((row) => row.co_id));

    // **2. Get partners associated with these COs**
    const managedPartnerIds = await PartnerCo.findAll({
      where: { co_id: { [Op.in]: managedCos } },
      attributes: ['partner_id'],
    }).then((rows) => rows.map((row) => row.partner_id));

    // **3. Get POCs associated with those partners (COs under the manager)**
    const managedPocIds = await PocPartner.findAll({
      where: { partner_id: { [Op.in]: managedPartnerIds } },
      attributes: ['poc_id'],
    }).then((rows) => rows.map((row) => row.poc_id));

    // **4. Get the manager's OWN partners from PartnerCo (co_id = manager_id)**
    const ownPartnerIds = await PartnerCo.findAll({
      where: { co_id: user_id },
      attributes: ['partner_id'],
    }).then((rows) => rows.map((row) => row.partner_id));

    // **5. Get POCs associated with the manager's OWN partners**
    const ownPocIds = await PocPartner.findAll({
      where: { partner_id: { [Op.in]: ownPartnerIds } },
      attributes: ['poc_id'],
    }).then((rows) => rows.map((row) => row.poc_id));

    // **6. Combine both lists (CO's POCs + Own POCs)**
    queryConditions.id = { [Op.in]: [...new Set([...managedPocIds, ...ownPocIds])] };
  } 
  else if (role === 'CO Part Time' || role === 'CO Full Time') {
    // **1. Get partner IDs where this CO is assigned**
    const coPartnerIds = (
      await PartnerCo.findAll({
        where: { co_id: user_id },
        attributes: ['partner_id'],
      })
    ).map((row) => row.partner_id);

    // **2. Get POCs associated with those partners**
    const coPocIds = (
      await PocPartner.findAll({
        where: { partner_id: { [Op.in]: coPartnerIds } },
        attributes: ['poc_id'],
      })
    ).map((row) => row.poc_id);

    // **3. Apply filter to only include these POCs**
    queryConditions.id = { [Op.in]: coPocIds };
  }

  //fetch only non-delted items
  queryConditions.removed = false;

  try {
    // Fetch POC details with relations
    const { rows: pocList, count } = await Poc.findAndCountAll({
      where: queryConditions,
      offset,
      limit,
      order: [[sortBy, sortValue]],
      include: [
        {
          model: Partner,
          as: 'partner',
          required: false,
          include: [
            {
              model: City, // Include City data from Partner
              as: 'city',
              attributes: ['id', 'city_name', 'state_id'],
            },
            {
              model: PartnerCo,
              as: 'partnerCos',
              required: false,
              include: [
                {
                  model: User,
                  as: 'co',
                  attributes: ['user_id', 'user_display_name', 'email'],
                },
              ],
            },
          ],
        },
      ],
    });

    // Flatten the response
    const flatPocList = pocList.map((poc) => {
      const partner = poc.partner || {};
      const partnerCo = partner.partnerCos?.[0] || {}; // Get first partnerCo
      const co = partnerCo.co || {}; // Get the associated user (co)
      const city = partner.city || {};

      return {
        id: poc.id,
        poc_name: poc.poc_name,
        poc_email: poc.poc_email,
        poc_contact: poc.poc_contact,
        poc_designation: poc.poc_designation,
        createdAt: poc.createdAt,
        updatedAt: poc.updatedAt,
        date_of_first_contact: poc.date_of_first_contact,
        // Partner details
        partner_id: partner.id || null,
        partner_name: partner.partner_name || null,
        address_line_1: partner.address_line_1 || null,
        address_line_2: partner.address_line_2 || null,
        city_id: partner.city_id || null,
        city: city.city_name || null,
        state_id: partner.state_id || null,
        pincode: partner.pincode || null,
        partner_affiliation_type: partner.partner_affiliation_type || null,
        school_type: partner.school_type || null,
        total_child_count: partner.total_child_count || null,
        lead_source: partner.lead_source || null,
        low_income_resource: partner.low_income_resource || null,

        // CO (User) details
        co_id: co.user_id || null,
        co_name: `${co.user_display_name}`.trim() || null,
        // co_last_name: co.last_name || null,
        co_email: co.email || null,
      };
    });

    const pages = Math.ceil(count / limit);
    const pagination = { page, pages, count };

    return res.status(200).json({
      success: true,
      result: flatPocList,
      pagination,
      message: count > 0 ? 'Successfully found POC records' : 'No POC records found',
    });
  } catch (error) {
    console.error('Error fetching POC details:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error finding POC records',
      error: error.message,
    });
  }
};

module.exports = paginatedList;





// const { Op } = require('sequelize');
// const { Poc, Partner, PartnerCo, User, City } = require('../../../../models');

// const paginatedList = async (req, res) => {
//   console.log('POC paginated list API hit');
//   const page = parseInt(req.query.page) || 1;
//   const limit = parseInt(req.query.items) || 10;
//   const offset = (page - 1) * limit;

//   const { sortBy = 'createdAt', sortValue = 'DESC', filter, equal, q: searchQuery } = req.query;

//   // Fields to search in
//   const searchableFields = ['poc_name', 'poc_email', 'poc_phone'];

//   let queryConditions = {};

//   // Add search functionality
//   if (searchQuery) {
//     queryConditions[Op.or] = searchableFields.map((field) => ({
//       [field]: { [Op.iLike]: `%${searchQuery}%` },
//     }));
//   }

//   // Add filters if provided
//   if (filter && equal !== undefined) {
//     queryConditions[filter] = equal;
//   }


//   try {
//     // Fetch POC details with relations
//     const { rows: pocList, count } = await Poc.findAndCountAll({
//       where: queryConditions,
//       offset,
//       limit,
//       order: [[sortBy, sortValue]],
//       include: [
//         {
//           model: Partner,
//           as: 'partner',
//           required: false,
//           include: [
//             {
//               model: City, // Include City data from Partner
//               as: 'city',
//               attributes: ['id', 'city_name', 'state_id'], // Fetch only necessary fields
//             },
//             {
//               model: PartnerCo,
//               as: 'partnerCos',
//               required: false,
//               include: [
//                 {
//                   model: User,
//                   as: 'co',
//                   attributes: ['id', 'first_name', 'last_name', 'email'], // Fetch only necessary fields
//                 },
//               ],
//             },
//           ],
//         },
//       ],
//     });

//     const flatPocList = pocList.map((poc) => {
//       const partner = poc.partner || {};
//       const partnerCo = partner.partnerCos?.[0] || {}; // Get first partnerCo
//       const co = partnerCo.co || {}; // Get the associated user (co)
//       const city = partner.city || {}

//       return {
//         id: poc.id,
//         poc_name: poc.poc_name,
//         poc_email: poc.poc_email,
//         poc_contact: poc.poc_contact,
//         poc_designation: poc.poc_designation,
//         createdAt: poc.createdAt,
//         updatedAt: poc.updatedAt,

//         // Partner details
//         partner_id: partner.id || null,
//         partner_name: partner.partner_name || null,
//         address_line_1: partner.address_line_1 || null,
//         address_line_2: partner.address_line_2 || null,
//         city_id: partner.city_id || null,
//         city: city.city_name || null,
//         state_id: partner.state_id || null,
//         pincode: partner.pincode || null,
//         partner_affiliation_type: partner.partner_affiliation_type || null,
//         school_type: partner.school_type || null,
//         total_child_count: partner.total_child_count || null,
//         lead_source: partner.lead_source || null,
//         low_income_resource: partner.low_income_resource || null,

//         // CO (User) details
//         co_id: co.id || null,
//         co_name: `${co.first_name} ${co.last_name}` || null,
//         co_last_name: co.last_name || null,
//         co_email: co.email || null,
//       };
//     });

//     // console.log('Paginated POC details:', flatPocList);

//     const pages = Math.ceil(count / limit);
//     const pagination = { page, pages, count };

//     return res.status(200).json({
//       success: true,
//       result: flatPocList,
//       pagination,
//       message: count > 0 ? 'Successfully found POC records' : 'No POC records found',
//     });
//   } catch (error) {
//     console.error('Error fetching POC details:', error);
//     return res.status(500).json({
//       success: false,
//       result: null,
//       message: 'Error finding POC records',
//       error: error.message,
//     });
//   }
// };

// module.exports = paginatedList;
