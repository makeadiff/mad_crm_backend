const Joi = require('joi');
const { Partner, PartnerCo, Poc, Meeting, User, sequelize } = require('../../../../models');

const reallocateSchema = Joi.object({
  partner_id: Joi.number().integer().required(),
  current_co_user_login: Joi.string().required(),
  new_co_user_login: Joi.string().required(),
  meeting_date: Joi.date().optional(),
});

const reallocatePartner = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { error, value } = reallocateSchema.validate(req.body);
    if (error) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        details: error.details.map((d) => d.message),
      });
    }

    const { partner_id, current_co_user_login, new_co_user_login, meeting_date } = value;

    // 1. Verify partner exists and is not deleted
    const partner = await Partner.findOne({
      where: { id: partner_id, removed: false },
      transaction: t,
    });
    if (!partner) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Partner not found or has been deleted',
      });
    }

    // 2. Validate current CO user
    const currentCo = await User.findOne({
      where: { user_login: current_co_user_login.toLowerCase().trim() },
      transaction: t,
    });
    if (!currentCo) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Current CO user not found',
      });
    }

    // 3. Validate new CO user
    const newCo = await User.findOne({
      where: { user_login: new_co_user_login.toLowerCase().trim() },
      transaction: t,
    });
    if (!newCo) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'New CO user not found',
      });
    }

    // 4. Fetch the latest PartnerCo assignment for this partner
    const latestPartnerCo = await PartnerCo.findOne({
      where: { partner_id },
      order: [['createdAt', 'DESC']],
      transaction: t,
    });

    // 4a. Confirm current CO is the most recently assigned CO
    if (!latestPartnerCo || Number(latestPartnerCo.co_id) !== Number(currentCo.user_id)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Current CO is not the active CO for this partner',
      });
    }

    // 5. Prevent duplicate — new CO should not already be the active CO
    if (Number(latestPartnerCo.co_id) === Number(newCo.user_id)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'New CO is already the active CO for this partner',
      });
    }

    // 6. Create new PartnerCo row for the new CO
    // Cast user_id to Number — User model stores user_id as STRING (DataTypes.STRING),
    // but PartnerCo.co_id is DECIMAL. Lead create sends co_id as Joi.number() so it's
    // always a JS number; we match that behaviour here.
    await PartnerCo.create(
      { partner_id, co_id: Number(newCo.user_id) },
      { transaction: t }
    );

    // 7. Find the latest active POC for this partner
    const latestPoc = await Poc.findOne({
      where: { partner_id, removed: false },
      order: [['createdAt', 'DESC']],
      transaction: t,
    });
    if (!latestPoc) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'No active POC found for this partner',
      });
    }

    // 8. Create a meeting record for the new CO with the latest POC
    const newMeeting = await Meeting.create(
      {
        user_id: Number(newCo.user_id),
        poc_id: latestPoc.id,
        partner_id,
        meeting_date: meeting_date || new Date(),
        follow_up_meeting_scheduled: false,
      },
      { transaction: t }
    );

    // 9. Touch Partner.updatedAt so downstream apps that sync on this timestamp
    //    pick up the reallocation event.
    await sequelize.query(
      'UPDATE partners SET "updatedAt" = NOW() WHERE id = :partner_id',
      { replacements: { partner_id }, transaction: t }
    );

    await t.commit();

    return res.status(200).json({
      success: true,
      message: 'Partner reallocated successfully',
      result: {
        partner_id,
        new_co_user_id: newCo.user_id,
        new_co_user_login: newCo.user_login,
        poc_id: latestPoc.id,
        meeting_id: newMeeting.id,
      },
    });
  } catch (err) {
    await t.rollback();
    console.error('Error reallocating partner:', err);
    return res.status(500).json({
      success: false,
      message: 'Error reallocating partner',
      error: err.message,
    });
  }
};

module.exports = reallocatePartner;
