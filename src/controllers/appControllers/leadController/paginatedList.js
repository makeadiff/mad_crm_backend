const { Op, literal } = require('sequelize');
const {
  Partner,
  PartnerAgreement,
  Meeting,
  PartnerCo,
  ManagerCo,
  User,
  City,
  Poc,
  PocPartner,
  State,
} = require('../../../../models');

const paginatedList = async (req, res) => {
  console.log('Paginated lead list API hit for partners');

  const { user_role: role, user_id } = req.user;

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.items, 10) || 10;
  const offset = (page - 1) * limit;
  const { sortBy = 'createdAt', sortValue = 'DESC', q: searchQuery } = req.query;

  const searchableFields = ['partner_name', 'address_line_1', 'lead_source'];
  let whereCondition = { id: { [Op.ne]: null } };

  if (searchQuery) {
    whereCondition[Op.or] = searchableFields.map((field) => ({
      [field]: { [Op.iLike]: `%${searchQuery}%` },
    }));
  }

  // 1) Exclude partners whose *latest* agreement is converted
  const latestConvertedAgreements = await PartnerAgreement.findAll({
    attributes: ['partner_id'],
    where: {
      conversion_stage: 'converted',
      createdAt: {
        [Op.eq]: literal(`(
          SELECT MAX("pa2"."createdAt")
          FROM "partner_agreements" AS "pa2"
          WHERE "pa2"."partner_id" = "PartnerAgreement"."partner_id"
        )`),
      },
    },
    raw: true,
  });

  const excludedPartnerIds = latestConvertedAgreements.map((a) => a.partner_id);

  // 2) Role-based access
  if (role === 'manager') {
    const managedCos = (
      await ManagerCo.findAll({
        where: { manager_id: user_id },
        attributes: ['co_id'],
      })
    ).map((row) => row.co_id);

    const managerCoPartners = (
      await PartnerCo.findAll({
        where: { co_id: { [Op.in]: managedCos } },
        attributes: ['partner_id'],
      })
    ).map((row) => row.partner_id);

    const managerDirectPartners = (
      await Partner.findAll({
        where: { created_by: user_id, removed: false },
        attributes: ['id'],
      })
    ).map((partner) => partner.id);

    const managerPartners = [...new Set([...managerCoPartners, ...managerDirectPartners])];

    whereCondition.id = {
      [Op.in]: managerPartners,
      [Op.notIn]: excludedPartnerIds,
    };
  } else if (
    role === 'CO Part Time' ||
    role === 'CO Full Time' ||
    role === 'CHO,CO Part Time'
  ) {
    const coPartners = (
      await PartnerCo.findAll({
        where: { co_id: user_id },
        attributes: ['partner_id'],
      })
    ).map((row) => row.partner_id);

    whereCondition.id = {
      [Op.in]: coPartners,
      [Op.notIn]: excludedPartnerIds,
    };
  } else {
    whereCondition.id = { [Op.notIn]: excludedPartnerIds };
  }

  // Only non-deleted leads
  whereCondition.removed = false;

  try {
    // STEP 1: Partners page
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

    if (!partners.length) {
      return res.status(200).json({
        success: true,
        result: [],
        pagination: { page, pages: 0, count: 0 },
      });
    }

    const partnerIds = partners.map((p) => p.id);

    // STEP 2: All agreements for these partners → tracking_history + latestAgreementMap
    const allAgreementsForPage = await PartnerAgreement.findAll({
      where: { partner_id: partnerIds },
      attributes: ['partner_id', 'conversion_stage', 'createdAt', 'potential_child_count', 'current_status', 'expected_conversion_day', 'non_conversion_reason', 'agreement_drop_date', 'specific_doc_name', 'specific_doc_required'],
      order: [['partner_id', 'ASC'], ['createdAt', 'ASC']],
      raw: true,
    });

    const historyMap = new Map(); // partner_id -> [ { stage, createdAt } ]
    const latestAgreementMap = new Map(); // partner_id -> last agreement row

    for (const a of allAgreementsForPage) {
      if (!historyMap.has(a.partner_id)) historyMap.set(a.partner_id, []);
      historyMap.get(a.partner_id).push({
        stage: a.conversion_stage,
        createdAt: a.createdAt,
      });
      // Because we ordered ASC by createdAt, overwriting gives us the latest
      latestAgreementMap.set(a.partner_id, a);
    }

    // STEP 3: Latest PocPartner per partner → then bulk fetch those POCs
    const allPocPartners = await PocPartner.findAll({
      where: { partner_id: partnerIds },
      attributes: ['partner_id', 'poc_id', 'createdAt'],
      order: [['partner_id', 'ASC'], ['createdAt', 'ASC']],
      raw: true,
    });

    const latestPocPartnerMap = new Map(); // partner_id -> poc_id
    for (const pp of allPocPartners) {
      // same trick: last one per partner_id is the latest
      latestPocPartnerMap.set(pp.partner_id, pp.poc_id);
    }

    const pocIds = [...new Set([...latestPocPartnerMap.values()])];

    let pocMap = new Map();
    if (pocIds.length) {
      const pocs = await Poc.findAll({
        where: { id: pocIds },
        attributes: [
          'id',
          'poc_name',
          'poc_email',
          'poc_contact',
          'poc_designation',
          'date_of_first_contact',
        ],
        raw: true,
      });
      pocMap = new Map(pocs.map((p) => [p.id, p]));
    }

    // STEP 4: PartnerCo with CO info (bulk)
    const partnerCos = await PartnerCo.findAll({
      where: { partner_id: partnerIds },
      include: [
        {
          model: User,
          as: 'co',
          attributes: ['user_id', 'user_display_name'],
        },
      ],
    });

    const partnerCoMap = new Map(); // partner_id -> PartnerCo (with co)
    partnerCos.forEach((pc) => {
      partnerCoMap.set(pc.partner_id, pc);
    });

    // STEP 5: Latest meetings per partner
    const allMeetings = await Meeting.findAll({
      where: { partner_id: partnerIds },
      order: [['partner_id', 'ASC'], ['createdAt', 'ASC']],
      raw: true,
    });

    const latestMeetingMap = new Map(); // partner_id -> meeting row
    for (const m of allMeetings) {
      latestMeetingMap.set(m.partner_id, m);
    }

    // STEP 6: Stitch everything together
    const partnersWithDetails = partners.map((partner) => {
      const latestAgreement = latestAgreementMap.get(partner.id);
      const partnerCo = partnerCoMap.get(partner.id);
      const latestPocId = latestPocPartnerMap.get(partner.id);
      const poc = latestPocId ? pocMap.get(latestPocId) : null;
      const latestMeeting = latestMeetingMap.get(partner.id);

      const partnerData = {
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
        low_income_resource: partner.low_income_resource || null,
        interested: partner.interested,
        created_by: partner.created_by || null,

        // Latest agreement fields
        conversion_stage: latestAgreement ? latestAgreement.conversion_stage : null,
        potential_child_count: latestAgreement ? latestAgreement.potential_child_count : null,
        current_status: latestAgreement ? latestAgreement.current_status : null,
        expected_conversion_day: latestAgreement ? latestAgreement.expected_conversion_day : null,
        non_conversion_reason: latestAgreement ? latestAgreement.non_conversion_reason : null,
        agreement_drop_date: latestAgreement ? latestAgreement.agreement_drop_date : null,
        specific_doc_name: latestAgreement ? latestAgreement.specific_doc_name : null,
        specific_doc_required: latestAgreement ? latestAgreement.specific_doc_required : null,

        // CO
        co_id: partnerCo && partnerCo.co ? partnerCo.co.user_id : null,
        co_name:
          partnerCo && partnerCo.co ? `${partnerCo.co.user_display_name}`.trim() : null,

        // POC (latest)
        poc_id: poc ? poc.id : null,
        poc_name: poc ? poc.poc_name : null,
        poc_contact: poc ? poc.poc_contact : null,
        poc_designation: poc ? poc.poc_designation : null,
        poc_email: poc ? poc.poc_email : null,
        date_of_first_contact: poc ? poc.date_of_first_contact : null,

        // Meeting (latest)
        follow_up_meeting_scheduled: latestMeeting
          ? latestMeeting.follow_up_meeting_scheduled
          : null,

        // Tracking history
        tracking_history: historyMap.get(partner.id) || [],
      };

      return partnerData;
    });

    const pages = Math.ceil(count / limit);
    return res.status(200).json({
      success: true,
      result: partnersWithDetails,
      pagination: { page, pages, count },
    });
  } catch (error) {
    console.error('Error fetching partners:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving partners',
      error: error.message,
    });
  }
};

module.exports = paginatedList;
