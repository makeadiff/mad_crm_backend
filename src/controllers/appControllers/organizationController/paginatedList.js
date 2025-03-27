const { Op } = require('sequelize');
const {
  Partner,
  PartnerAgreement,
  Mou,
  Meeting,
  PartnerCo,
  User,
  City,
  Poc,
  PocPartner,
  ManagerCo
} = require('../../../../models');

const paginatedList = async (req, res) => {
  console.log('Paginated list API hit for organization');

  const { id, role } = req.user; // Extract role from request
  const user_id = id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.items) || 10;
  const offset = (page - 1) * limit;

  const { sortBy = 'createdAt', sortValue = 'DESC', q: searchQuery } = req.query;
  const searchableFields = ['partner_name', 'address_line_1', 'lead_source'];

  let whereCondition = {};

  if (searchQuery) {
    whereCondition[Op.or] = searchableFields.map((field) => ({
      [field]: { [Op.iLike]: `%${searchQuery}%` },
    }));
  }

  try {
    /** ✅ STEP 1: ROLE-BASED FILTERING **/
    let partnerIds = [];

      if (role === 'manager') {
      // Get COs managed by this manager
      const managedCos = await ManagerCo.findAll({
        where: { manager_id: user_id },
        attributes: ['co_id'],
      }).then((rows) => rows.map((row) => row.co_id));

      console.log("cos under the manager in organization list :", managedCos)

      let managedPartners = [];
      if (managedCos.length > 0) {
        // Get partners assigned to these COs
        managedPartners = await PartnerCo.findAll({
          where: { co_id: { [Op.in]: managedCos } },
          attributes: ['partner_id'],
        }).then((rows) => rows.map((row) => row.partner_id));
      }

      console.log("managed Partner list by manager of cos :", managedPartners)

      // Get partners created by this manager
      const selfCreatedPartners = await PartnerCo.findAll({
        where: { co_id: user_id },
        attributes: ['id'],
      }).then((rows) => rows.map((row) => row.id));

      // Combine both lists, ensuring unique partner IDs
      partnerIds = [...new Set([...managedPartners, ...selfCreatedPartners])];
    } else if (role === 'co') {

      console.log("finding organization list for cos")
      // **Employee sees only partners assigned to them**
      const coPartners = await PartnerCo.findAll({
        where: { co_id: user_id },
        attributes: ['partner_id'],
      }).then((rows) => rows.map((row) => row.partner_id));

      console.log("co partners list for organization -------> ", coPartners)
      partnerIds = coPartners;
    }

    // Apply filtering for manager and employee
    if (role === 'manager' || role === 'co') {
      whereCondition.id = { [Op.in]: partnerIds };
    }

    /** ✅ STEP 2: Fetch only partners where the latest agreement is "converted" **/
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
          model: PartnerAgreement,
          as: 'agreements',
          where: { conversion_stage: 'converted' }, // ✅ Filter only converted agreements
          attributes: ['id', 'partner_id', 'conversion_stage', 'createdAt'],
          required: true, // ✅ Ensures only partners with a converted agreement are fetched
        },
      ],
    });

    /** ✅ STEP 3: Fetch additional details **/
    const partnerIdsList = partners.map((partner) => partner.id);

    const latestAgreements = await PartnerAgreement.findAll({
      where: { partner_id: partnerIdsList, conversion_stage: 'converted' },
      order: [['createdAt', 'DESC']],
      group: ['partner_id', 'id'],
    });

    const latestPocPartners = await PocPartner.findAll({
      where: { partner_id: partnerIdsList },
      order: [['createdAt', 'DESC']],
      group: ['partner_id', 'id'],
    });

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
          city: partner.city ? partner.city.city_name : null,
          state_id: partner.state_id || null,
          pincode: partner.pincode || null,
          lead_source: partner.lead_source || null,
          school_type: partner.school_type || null,
          partner_affiliation_type: partner.partner_affiliation_type || null,
          total_child_count: partner.total_child_count || null,
          classes: partner.classes || null,
          low_income_resource: partner.low_income_resource || null,
          created_by: partner.created_by || null,
          conversion_stage: latestAgreement ? latestAgreement.conversion_stage : null,
          potential_child_count: latestAgreement ? latestAgreement.potential_child_count : null,
          current_status: latestAgreement ? latestAgreement.current_status : null,
          expected_conversion_day: latestAgreement ? latestAgreement.expected_conversion_day : null,
          non_conversion_reason: latestAgreement ? latestAgreement.non_conversion_reason : null,
          specific_doc_name: latestAgreement ? latestAgreement.specific_doc_name : null,
          specific_doc_required: latestAgreement ? latestAgreement.specific_doc_required : null,
          co_id: null,
          co_name: null,
        };

        // Fetch CO details
        const partnerCo = await PartnerCo.findOne({
          where: { partner_id: partner.id },
          include: [
            {
              model: User,
              as: 'co',
              attributes: ['id', 'first_name', 'last_name'],
            },
          ],
        });

        if (partnerCo && partnerCo.co) {
          partnerData.co_id = partnerCo.co.id;
          partnerData.co_name = `${partnerCo.co.first_name} ${partnerCo.co.last_name}`.trim();
        }

        if (latestAgreement) {
          // Fetch MOU and Meeting details
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

          if (meetings.length > 0) {
            partnerData.follow_up_meeting_scheduled = meetings[0].follow_up_meeting_scheduled;
          }
        }

        // Fetch POC details
        if (latestPocPartner) {
          const poc = await Poc.findOne({
            where: { id: latestPocPartner.poc_id },
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
    const pagination = { page, pages, count };

    return res.status(200).json({
      success: true,
      result: partnersWithDetails,
      pagination,
      message: 'Successfully retrieved partners with converted agreements and all related details',
    });
  } catch (error) {
    console.error('Error fetching partners:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error retrieving partners',
      error: error.message,
    });
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
//   PocPartner,
// } = require('../../../../models');

// const paginatedList = async (req, res) => {
//   console.log('Paginated list API hit for organization');

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
//     // Step 1: Fetch only partners where the latest agreement is "converted"
//     const { rows: partners, count } = await Partner.findAndCountAll({
//       where: whereCondition,
//       limit,
//       offset,
//       order: [[sortBy, sortValue]],
//       include: [
//         {
//           model: City,
//           as: 'city',
//           attributes: ['id', 'city_name'],
//         },
//         {
//           model: PartnerAgreement,
//           as: 'agreements',
//           where: { conversion_stage: 'converted' }, // ✅ Filter only converted agreements
//           attributes: ['id', 'partner_id', 'conversion_stage', 'createdAt'],
//           required: true, // ✅ Ensures only partners with a converted agreement are fetched
//         },
//       ],
//     });

//     const partnerIds = partners.map((partner) => partner.id);

//     // Step 2: Fetch the latest PartnerAgreement for each partner
//     const latestAgreements = await PartnerAgreement.findAll({
//       where: { partner_id: partnerIds, conversion_stage: 'converted' },
//       order: [['createdAt', 'DESC']],
//       group: ['partner_id', 'id'], // ✅ Ensures latest agreement
//     });

//     // Step 3: Fetch additional details
//     const latestPocPartners = await PocPartner.findAll({
//       where: { partner_id: partnerIds },
//       order: [['createdAt', 'DESC']],
//       group: ['partner_id', 'id'], // ✅ Ensures latest POC partner
//     });

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
//           co_id: null,
//           co_name: null,
//         };

//         // Fetch CO details
//         const partnerCo = await PartnerCo.findOne({
//           where: { partner_id: partner.id },
//           include: [
//             {
//               model: User,
//               as: 'co',
//               attributes: ['id', 'first_name', 'last_name'],
//             },
//           ],
//         });

//         if (partnerCo && partnerCo.co) {
//           partnerData.co_id = partnerCo.co.id;
//           partnerData.co_name = `${partnerCo.co.first_name} ${partnerCo.co.last_name}`.trim();
//         }

//         if (latestAgreement) {
//           // Fetch MOU and Meeting details
//           const mou = await Mou.findOne({ where: { partner_id: partner.id } });
//           const meetings = await Meeting.findAll({ where: { partner_id: partner.id } });

//           if (mou) {
//             partnerData.mou_sign = mou.mou_sign;
//             partnerData.mou_url = mou.mou_url;
//             partnerData.mou_start_date = mou.mou_start_date;
//             partnerData.mou_end_date = mou.mou_end_date;
//             partnerData.mou_sign_date = mou.mou_sign_date;
//             partnerData.mou_status = mou.mou_status;
//             partnerData.pending_mou_reason = mou.pending_mou_reason;
//             partnerData.confirmed_child_count = mou.confirmed_child_count;
//           }

//           if (meetings.length > 0) {
//             partnerData.follow_up_meeting_scheduled = meetings[0].follow_up_meeting_scheduled;
//           }
//         }

//         // Fetch POC details
//         if (latestPocPartner) {
//           const poc = await Poc.findOne({
//             where: { id: latestPocPartner.poc_id },
//             attributes: [
//               'id',
//               'poc_name',
//               'poc_email',
//               'poc_contact',
//               'poc_designation',
//               'date_of_first_contact',
//             ],
//           });

//           if (poc) {
//             partnerData.poc_id = poc.id;
//             partnerData.poc_name = poc.poc_name;
//             partnerData.poc_contact = poc.poc_contact;
//             partnerData.poc_designation = poc.poc_designation;
//             partnerData.date_of_first_contact = poc.date_of_first_contact;
//             partnerData.poc_email = poc.poc_email;
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
//       message: 'Successfully retrieved partners with converted agreements and all related details',
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
