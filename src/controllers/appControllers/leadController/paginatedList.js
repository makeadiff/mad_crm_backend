const { Op } = require('sequelize');
const {
  Partner,
  PartnerAgreement,
  Mou,
  Meeting,
  PartnerCo,
  ManagerCo,
  User,
  City,
  Poc,
  PocPartner,
  State
} = require('../../../../models');

const paginatedList = async (req, res) => {
  console.log('Paginated list API hit for partners');

  const { user_role:role, user_id: user_id } = req.user; // Extract role and user ID

  // console.log("user role and user id :", role, user_id)

  // console.log("user details on leads paginated list :", role, user_id)
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.items) || 10;
  const offset = (page - 1) * limit;
  const { sortBy = 'createdAt', sortValue = 'DESC', q: searchQuery } = req.query;

  const searchableFields = ['partner_name', 'address_line_1', 'lead_source'];
  let whereCondition = {
    id: { [Op.ne]: null }, 
  };

  if (searchQuery) {
    whereCondition[Op.or] = searchableFields.map((field) => ({
      [field]: { [Op.iLike]: `%${searchQuery}%` },
    }));
  }

  // **1. Exclude "converted" partners**
  const excludedPartnerIds = (
    await PartnerAgreement.findAll({
      where: { conversion_stage: 'converted' },
      attributes: ['partner_id'],
    })
  ).map((agreement) => agreement.partner_id);

  // **2. Apply Role-Based Access Control**
  if (role === 'manager') {
    // Fetch COs under the manager
    const managedCos = (
      await ManagerCo.findAll({
        where: { manager_id: user_id },
        attributes: ['co_id'],
      })
    ).map((row) => row.co_id);

    // Fetch partner IDs where CO is assigned
    const managerCoPartners = (
      await PartnerCo.findAll({
        where: { co_id: { [Op.in]: managedCos } },
        attributes: ['partner_id'],
      })
    ).map((row) => row.partner_id);

    // Fetch partner IDs assigned directly to the manager
    const managerDirectPartners = (
      await Partner.findAll({
        where: { created_by: user_id, removed: false}, // Assuming 'created_by' stores the manager's ID
        attributes: ['id'],
      })
    ).map((partner) => partner.id);

    // Combine both lists
    const managerPartners = [...new Set([...managerCoPartners, ...managerDirectPartners])];

    whereCondition.id = {
      [Op.in]: managerPartners,
      [Op.notIn]: excludedPartnerIds, // Ensure exclusion is still applied
    };
  } else if (role === 'CO Part Time' || role === 'CO Full Time') {
    // Fetch partner IDs where the CO is assigned
    const coPartners = (
      await PartnerCo.findAll({
        where: { co_id: user_id },
        attributes: ['partner_id'],
      })
    ).map((row) => row.partner_id);

    whereCondition.id = {
      [Op.in]: coPartners,
      [Op.notIn]: excludedPartnerIds, // Ensure exclusion is still applied
    };
  } else {
    whereCondition.id = { [Op.notIn]: excludedPartnerIds };
  }

  // this only fetch non-deleted lead/partner
  whereCondition.removed = false

  try {
    // **Step 1: Fetch Partners with Pagination & City Name**
    const { rows: partners, count } = await Partner.findAndCountAll({
      where: whereCondition,
      limit,
      offset,
      order: [[sortBy, sortValue]],
      include: [
        {
          model: City,
          as: 'city',
          attributes: ['id', 'city_name'],
        },
        {
          model: State,
          as: 'state',
          attributes: ['id', 'state_name'],
        },
      ],
    });

    const partnerIds = partners.map((partner) => partner.id);

    // **Step 2: Fetch Latest Partner Agreements**
    const latestAgreements = await PartnerAgreement.findAll({
      where: { partner_id: partnerIds },
      order: [['createdAt', 'DESC']],
      group: ['partner_id', 'id'],
    });

    const latestPocPartners = await PocPartner.findAll({
      where: { partner_id: partnerIds },
      order: [['createdAt', 'DESC']],
      group: ['partner_id', 'id'],
    });

    // console.log('----------------------latest agreement found-----------------------');

    // **Step 3: Fetch Additional Partner Details**
    const partnersWithDetails = await Promise.all(
      partners.map(async (partner) => {
        const latestAgreement = latestAgreements.find(
          (agreement) => agreement.partner_id === partner.id
        );
        const latestPocPartner = latestPocPartners.find(
          (pocPartner) => pocPartner.partner_id === partner.id
        );

        let partnerData = {
          id: partner.id,
          partner_name: partner.partner_name,
          address_line_1: partner.address_line_1,
          address_line_2: partner.address_line_2 || null,
          city_id: partner.city_id || null,
          city_name: partner.city ? partner.city.city_name : null,
          state_id: partner.state_id || null,
          state_name: partner.state ? partner.state.state_name : null,
          pincode: partner.pincode || null,
          lead_source: partner.lead_source || null,
          classes: partner.classes || null,
          school_type: partner.school_type || null,
          partner_affiliation_type: partner.partner_affiliation_type || null,
          total_child_count: partner.total_child_count || null,
          classes: partner.classes || null,
          low_income_resource: partner.low_income_resource || null,
          interested: partner.interested,
          created_by: partner.created_by || null,
          conversion_stage: latestAgreement ? latestAgreement.conversion_stage : null,
          potential_child_count: latestAgreement ? latestAgreement.potential_child_count : null,
          current_status: latestAgreement ? latestAgreement.current_status : null,
          expected_conversion_day: latestAgreement ? latestAgreement.expected_conversion_day : null,
          non_conversion_reason: latestAgreement ? latestAgreement.non_conversion_reason : null,
          agreement_drop_date: latestAgreement ? latestAgreement.agreement_drop_date : null,
          specific_doc_name: latestAgreement ? latestAgreement.specific_doc_name : null,
          specific_doc_required: latestAgreement ? latestAgreement.specific_doc_required : null,
          co_id: null,
          co_name: null,
        };

        // Fetch CO details if conversion stage is "new"
        const partnerCo = await PartnerCo.findOne({
          where: { partner_id: partner.id },
          include: [{ model: User, as: 'co', attributes: ['user_id', 'user_display_name'] }],
        });

        if (partnerCo && partnerCo.co) {
          partnerData.co_id = partnerCo.co.user_id;
          partnerData.co_name = `${partnerCo.co.user_display_name}`.trim();
        }

        if (latestAgreement && latestAgreement.conversion_stage !== 'new') {
          const mou = await Mou.findOne({ where: { partner_id: partner.id } });
          const meetings = await Meeting.findAll({ where: { partner_id: partner.id } });

          if (mou) {
            partnerData.mou_sign = mou.mou_sign;
            partnerData.mou_url = mou.mou_url;
            partnerData.mou_start_date = mou.mou_start_date;
            partnerData.mou_end_date = mou.mou_end_date;
            partnerData.mou_sign_date = mou.mou_sign_date;
            partnerData.mou_status = mou.mou_status;
            partnerData.pending_mou_reason = mou.pending_mou_reason;
            partnerData.confirmed_child_count = mou.confirmed_child_count;
          }

          if (meetings) {
            partnerData.follow_up_meeting_scheduled = meetings.follow_up_meeting_scheduled;
          }
        }

        if (latestPocPartner) {
          const poc = await Poc.findOne({
            where: { id: latestPocPartner.dataValues.poc_id },
            attributes: [
              'id',
              'poc_name',
              'poc_email',
              'poc_contact',
              'poc_designation',
              'date_of_first_contact',
            ],
          });

          if (poc) {
            partnerData.poc_id = poc.id;
            partnerData.poc_name = poc.poc_name;
            partnerData.poc_contact = poc.poc_contact;
            partnerData.poc_designation = poc.poc_designation;
            partnerData.date_of_first_contact = poc.date_of_first_contact;
            partnerData.poc_email = poc.poc_email;
          }
        }

        return partnerData;
      })
    );

    const pages = Math.ceil(count / limit);
    return res
      .status(200)
      .json({ success: true, result: partnersWithDetails, pagination: { page, pages, count } });
  } catch (error) {
    console.error('Error fetching partners:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Error retrieving partners', error: error.message });
  }
};

module.exports = paginatedList;

// const { Op } = require('sequelize');
// const {
//   Partner,
//   PartnerAgreement,
//   Mou,
//   Meeting,
//   PartnerCo,
//   User,
//   City,
//   Poc,
//   PocPartner
// } = require('../../../../models');

// const paginatedList = async (req, res) => {
//   console.log('Paginated list API hit for partners');
//   // console.log("requested user details :", req.user.dataValues.role)
//   const page = parseInt(req.query.page) || 1;
//   const limit = parseInt(req.query.items) || 10;
//   const offset = (page - 1) * limit;

//   const { sortBy = 'createdAt', sortValue = 'DESC', q: searchQuery } = req.query;

//   const searchableFields = ['partner_name', 'address_line_1', 'lead_source'];

//   let whereCondition = {};

//   if (searchQuery) {
//     whereCondition[Op.or] = searchableFields.map((field) => ({
//       [field]: { [Op.iLike]: `%${searchQuery}%` },
//     }));
//   }

//   try {
//     // Step 1: Fetch partners with pagination & City Name
//     const { rows: partners, count } = await Partner.findAndCountAll({
//       where: whereCondition,
//       limit,
//       offset,
//       order: [[sortBy, sortValue]],
//       include: [
//         {
//           model: City,
//           as: 'city',
//           attributes: ['id', 'city_name'], // Fetch city name
//         },
//       ],
//     });

//     const partnerIds = partners.map((partner) => partner.id);

//     // Step 2: Fetch the latest PartnerAgreement for each partner
//     const latestAgreements = await PartnerAgreement.findAll({
//       where: { partner_id: partnerIds },
//       order: [['createdAt', 'DESC']],
//       group: ['partner_id', 'id'], // Get only the latest agreement per partner
//     });

//     const latestPocPartners = await PocPartner.findAll({
//       where: { partner_id: partnerIds },
//       order: [['createdAt', 'DESC']],
//       group: ['partner_id', 'id'], // Get only the latest PocPartner per partner
//     });

//     console.log('----------------------latest agreement found-----------------------');

//     // Step 3: Fetch additional details based on conversion_stage
//     const partnersWithDetails = await Promise.all(
//       partners.map(async (partner) => {

//         const latestAgreement = latestAgreements.find(
//           (agreement) => agreement.partner_id === partner.id
//         );

//         const latestPocPartner = latestPocPartners.find(
//           (pocPartner) => pocPartner.partner_id === partner.id
//         );

//         let partnerData = {
//           id: partner.id,
//           partner_name: partner.partner_name,
//           address_line_1: partner.address_line_1,
//           address_line_2: partner.address_line_2 || null,
//           city_id: partner.city_id || null,
//           city: partner.city ? partner.city.city_name : null, // ✅ City Name
//           state_id: partner.state_id || null,
//           pincode: partner.pincode || null,
//           lead_source: partner.lead_source || null,
//           school_type: partner.school_type || null,
//           partner_affiliation_type: partner.partner_affiliation_type || null,
//           total_child_count: partner.total_child_count || null,
//           classes: partner.classes || null,
//           low_income_resource: partner.low_income_resource || null,
//           created_by: partner.created_by || null,
//           conversion_stage: latestAgreement ? latestAgreement.conversion_stage : null,
//           potential_child_count: latestAgreement ? latestAgreement.potential_child_count : null,
//           current_status: latestAgreement ? latestAgreement.current_status : null,
//           expected_conversion_day: latestAgreement ? latestAgreement.expected_conversion_day : null,
//           non_conversion_reason: latestAgreement ? latestAgreement.non_conversion_reason : null,
//           specific_doc_name: latestAgreement ? latestAgreement.specific_doc_name : null,
//           specific_doc_required: latestAgreement ? latestAgreement.specific_doc_required : null,
//           co_id: null, // Default value
//           co_name: null, // Default value
//         };

//         // Fetch CO details if conversion stage is "new"
//         const partnerCo = await PartnerCo.findOne({
//           where: { partner_id: partner.id },
//           include: [
//             {
//               model: User,
//               as: 'co',
//               attributes: ['id', 'first_name', 'last_name'], // ✅ Fetch CO details
//             },
//           ],
//         });

//         if (partnerCo && partnerCo.co) {
//           partnerData.co_id = partnerCo.co.id;
//           partnerData.co_name = `${partnerCo.co.first_name} ${partnerCo.co.last_name}`.trim(); // ✅ CO Name
//         }

//         if (latestAgreement && latestAgreement.conversion_stage !== 'new') {
//           // Fetch MOU details and Meeting details for other conversion stages
//           const mou = await Mou.findOne({ where: { partner_id: partner.id } });
//           const meetings = await Meeting.findAll({ where: { partner_id: partner.id } });

//           if(mou){
//             partnerData.mou_sign = mou.mou_sign
//             partnerData.mou_url = mou.mou_url;
//             partnerData.mou_start_date = mou.mou_start_date;
//             partnerData.mou_end_date = mou.mou_end_date;
//             partnerData.mou_sign_date = mou.mou_sign_date;
//             partnerData.mou_status = mou.mou_status,
//             partnerData.pending_mou_reason = mou.pending_mou_reason,
//             partnerData.confirmed_child_count = mou.confirmed_child_count
//           }
//           // partnerData.mou = mou || null;
//           // partnerData.meetings = meetings.length > 0 ? meetings : null;
//           if(meetings){
//             partnerData.follow_up_meeting_scheduled = meetings.follow_up_meeting_scheduled
//           }
//         }

//         if (latestPocPartner) {
//           const poc = await Poc.findOne({
//             where: { id: latestPocPartner.dataValues.poc_id },
//             attributes: ['id', 'poc_name', 'poc_email', 'poc_contact', 'poc_designation', 'date_of_first_contact'], // Fetch required POC fields
//           });

//           if(poc){
//             partnerData.poc_id = poc.dataValues.id,
//             partnerData.poc_name = poc.dataValues.poc_name
//             partnerData.poc_contact = poc.dataValues.poc_contact
//             partnerData.poc_designation = poc.dataValues.poc_designation
//             partnerData.date_of_first_contact = poc.dataValues.date_of_first_contact
//             partnerData.poc_email = poc.dataValues.poc_email
//           }
//         }

//         return partnerData;
//       })
//     );

//     const pages = Math.ceil(count / limit);
//     const pagination = { page, pages, count };

//     return res.status(200).json({
//       success: true,
//       result: partnersWithDetails,
//       pagination,
//       message: 'Successfully retrieved partners with agreements, MOU, meetings, and CO details',
//     });
//   } catch (error) {
//     console.error('Error fetching partners:', error);
//     return res.status(500).json({
//       success: false,
//       result: null,
//       message: 'Error retrieving partners',
//       error: error.message,
//     });
//   }
// };

// module.exports = paginatedList;
