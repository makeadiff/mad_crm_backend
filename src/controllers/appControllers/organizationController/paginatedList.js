const { Op, literal } = require('sequelize');
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
  ManagerCo,
  State,
} = require('../../../../models');

const paginatedList = async (req, res) => {
  console.log('Paginated Organization list API hit for organization :', req.query);

  const { user_id: id, user_role: role } = req.user;
  const user_id = id;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.items, 10) || 10;
  const offset = (page - 1) * limit;

  const { sortBy = 'createdAt', sortValue = 'DESC', q: searchQuery, status = 'active' } = req.query;
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
      // COs managed by this manager
      const managedCos = (
        await ManagerCo.findAll({
          where: { manager_id: user_id },
          attributes: ['co_id'],
        })
      ).map((row) => row.co_id);

      let managedPartners = [];
      if (managedCos.length > 0) {
        managedPartners = (
          await PartnerCo.findAll({
            where: { co_id: { [Op.in]: managedCos } },
            attributes: ['partner_id'],
          })
        ).map((row) => row.partner_id);
      }

      // Partners where this manager is CO directly (similar to your intent)
      const selfCreatedPartners = (
        await PartnerCo.findAll({
          where: { co_id: user_id },
          attributes: ['partner_id'],
        })
      ).map((row) => row.partner_id);

      partnerIds = [...new Set([...managedPartners, ...selfCreatedPartners])];
    } else if (
      role === 'CO Part Time' ||
      role === 'CO Full Time' ||
      role === 'CHO,CO Part Time'
    ) {
      // CO & CHO-CO sees only partners assigned to them
      const coPartners = (
        await PartnerCo.findAll({
          where: { co_id: user_id },
          attributes: ['partner_id'],
        })
      ).map((row) => row.partner_id);

      partnerIds = coPartners;
    }

    if (
      role === 'manager' ||
      role === 'CO Part Time' ||
      role === 'CO Full Time' ||
      role === 'CHO,CO Part Time'
    ) {
      whereCondition.id = { [Op.in]: partnerIds };
    }

    // If you want only non-removed orgs, uncomment:
    // whereCondition.removed = false;

    /** ✅ Build agreement filter based on status param **/
    // active  → latest agreement is 'converted'
    // inactive → latest agreement is 'dropped' with current_status = 'closed_not_renewed'
    const latestCreatedAtSubquery = literal(`(
      SELECT MAX("pa2"."createdAt")
      FROM "partner_agreements" AS "pa2"
      WHERE "pa2"."partner_id" = "agreements"."partner_id"
    )`);

    const agreementWhere = status === 'inactive'
      ? {
          conversion_stage: 'dropped',
          current_status: 'closed_not_renewed',
          createdAt: { [Op.eq]: latestCreatedAtSubquery },
        }
      : {
          conversion_stage: 'converted',
          createdAt: { [Op.eq]: latestCreatedAtSubquery },
        };

    /** ✅ STEP 2: Fetch partners whose *latest* agreement matches status **/
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
        {
          model: PartnerAgreement,
          as: 'agreements',
          required: true,
          attributes: [
            'id',
            'partner_id',
            'conversion_stage',
            'createdAt',
            'potential_child_count',
            'current_status',
            'expected_conversion_day',
            'non_conversion_reason',
            'specific_doc_name',
            'specific_doc_required',
          ],
          where: agreementWhere,
        },
      ],
    });

    if (!partners.length) {
      return res.status(200).json({
        success: true,
        result: [],
        pagination: { page, pages: 0, count: 0 },
        message: 'No organizations found',
      });
    }

    const partnerIdsList = partners.map((p) => p.id);

    /** ✅ STEP 3: Agreements for tracking_history (all stages) **/
    const agreementsForPage = await PartnerAgreement.findAll({
      where: { partner_id: partnerIdsList },
      attributes: ['partner_id', 'conversion_stage', 'current_status', 'createdAt'],
      order: [['partner_id', 'ASC'], ['createdAt', 'ASC']],
      raw: true,
    });

    // Map raw conversion_stage + current_status to a meaningful display label
    const getDisplayStage = (conversion_stage, current_status) => {
      if (conversion_stage === 'converted' && current_status === 'renewed') return 'mou_renewed';
      if (conversion_stage === 'dropped' && current_status === 'closed_not_renewed') return 'partnership_closed';
      return conversion_stage;
    };

    const historyMap = new Map(); // partner_id -> [ { stage, display_stage, current_status, createdAt } ]
    for (const a of agreementsForPage) {
      if (!historyMap.has(a.partner_id)) historyMap.set(a.partner_id, []);
      historyMap.get(a.partner_id).push({
        stage: a.conversion_stage,
        display_stage: getDisplayStage(a.conversion_stage, a.current_status),
        current_status: a.current_status || null,
        createdAt: a.createdAt,
      });
    }

    /** ✅ STEP 4: Latest POC per partner (PocPartner + Poc bulk) **/
    const pocPartners = await PocPartner.findAll({
      where: { partner_id: partnerIdsList },
      attributes: ['partner_id', 'poc_id', 'createdAt'],
      order: [['partner_id', 'ASC'], ['createdAt', 'ASC']],
      raw: true,
    });

    const latestPocPartnerMap = new Map(); // partner_id -> poc_id
    for (const pp of pocPartners) {
      latestPocPartnerMap.set(pp.partner_id, pp.poc_id); // last one per partner
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

    /** ✅ STEP 5: Latest CO mapping per partner (PartnerCo + User bulk) **/
    const partnerCos = await PartnerCo.findAll({
      where: { partner_id: partnerIdsList },
      include: [
        {
          model: User,
          as: 'co',
          attributes: ['user_id', 'user_display_name'],
        },
      ],
      order: [['partner_id', 'ASC'], ['createdAt', 'ASC']],
    });

    const partnerCoMap = new Map(); // partner_id -> PartnerCo
    partnerCos.forEach((pc) => {
      partnerCoMap.set(pc.partner_id, pc); // last one per partner
    });

    /** ✅ STEP 6: All MOUs per partner (where removed = false) **/
    const mous = await Mou.findAll({
      where: { partner_id: partnerIdsList, removed: false },
      order: [['partner_id', 'ASC'], ['createdAt', 'DESC']],
      raw: true,
    });

    const mouMap = new Map(); // partner_id -> [MOU, MOU, ...]
    for (const m of mous) {
      if (!mouMap.has(m.partner_id)) mouMap.set(m.partner_id, []);
      mouMap.get(m.partner_id).push(m);
    }

    /** ✅ STEP 7: Latest Meeting per partner **/
    const meetings = await Meeting.findAll({
      where: { partner_id: partnerIdsList },
      order: [['partner_id', 'ASC'], ['createdAt', 'ASC']],
      raw: true,
    });

    const latestMeetingMap = new Map(); // partner_id -> meeting row
    for (const mt of meetings) {
      latestMeetingMap.set(mt.partner_id, mt); // last one per partner
    }

    /** ✅ STEP 8: Stitch everything together **/
    const partnersWithDetails = partners.map((partner) => {
      const latestAgreement = partner.agreements && partner.agreements[0]; // because include where ensures 1 row
      const partnerCo = partnerCoMap.get(partner.id);
      const latestPocId = latestPocPartnerMap.get(partner.id);
      const poc = latestPocId ? pocMap.get(latestPocId) : null;
      const partnerMous = mouMap.get(partner.id) || [];
      const latestMou = partnerMous.length > 0 ? partnerMous[0] : null; // first is most recent (DESC)
      const latestMeeting = latestMeetingMap.get(partner.id);

      const partnerData = {
        id: partner.id,
        partner_name: partner.partner_name,
        address_line_1: partner.address_line_1,
        address_line_2: partner.address_line_2 || null,
        city_id: partner.city_id || null,
        city: partner.city ? partner.city.city_name : null,
        state_id: partner.state_id || null,
        state: partner.state ? partner.state.state_name : null,
        pincode: partner.pincode || null,
        lead_source: partner.lead_source || null,
        interested: partner.interested,
        school_type: partner.school_type || null,
        partner_affiliation_type: partner.partner_affiliation_type || null,
        total_child_count: partner.total_child_count || null,
        classes: partner.classes || null,
        low_income_resource: partner.low_income_resource || null,
        created_by: partner.created_by || null,

        // Latest converted agreement fields
        conversion_stage: latestAgreement ? latestAgreement.conversion_stage : null,
        potential_child_count: latestAgreement
          ? latestAgreement.potential_child_count
          : null,
        current_status: latestAgreement ? latestAgreement.current_status : null,
        expected_conversion_day: latestAgreement
          ? latestAgreement.expected_conversion_day
          : null,
        non_conversion_reason: latestAgreement
          ? latestAgreement.non_conversion_reason
          : null,
        specific_doc_name: latestAgreement ? latestAgreement.specific_doc_name : null,
        specific_doc_required: latestAgreement
          ? latestAgreement.specific_doc_required
          : null,

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

        // Latest active MOU (backward compatibility)
        latest_mou_id: latestMou ? latestMou.id : null,
        mou_sign: latestMou ? latestMou.mou_sign : null,
        mou_url: latestMou ? latestMou.mou_url : null,
        mou_start_date: latestMou ? latestMou.mou_start_date : null,
        mou_end_date: latestMou ? latestMou.mou_end_date : null,
        mou_sign_date: latestMou ? latestMou.mou_sign_date : null,
        mou_status: latestMou ? latestMou.mou_status : null,
        pending_mou_reason: latestMou ? latestMou.pending_mou_reason : null,
        confirmed_child_count: latestMou ? latestMou.confirmed_child_count : null,

        // All MOUs (removed=false, ordered by createdAt DESC)
        mous: partnerMous,

        // Latest meeting
        follow_up_meeting_scheduled: latestMeeting
          ? latestMeeting.follow_up_meeting_scheduled
          : null,

        // Partnership status (derived from status query param)
        partnership_status: status,

        // Locks the MOU Review action if renewal or closure is already recorded
        mou_review_locked: !!(
          latestAgreement && (
            latestAgreement.current_status === 'renewed' ||
            latestAgreement.current_status === 'closed_not_renewed'
          )
        ),

        // Tracking history (all agreement stages)
        tracking_history: historyMap.get(partner.id) || [],
      };

      return partnerData;
    });

    const pages = Math.ceil(count / limit);
    const pagination = { page, pages, count };

    return res.status(200).json({
      success: true,
      result: partnersWithDetails,
      pagination,
      message:
        'Successfully retrieved organizations with latest converted agreement, tracking history, and related details',
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
