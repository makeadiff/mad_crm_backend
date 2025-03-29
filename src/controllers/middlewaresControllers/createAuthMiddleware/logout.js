const { Op } = require("sequelize");

const { UserPassword } = require('../../../../models');

const logout = async (req, res, { models }) => {

  // Extract token from Authorization header
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  try {
    if (token) {
      // Remove specific session token from loggedSessions array
      await UserPassword.update(
        {
          loggedSessions: Sequelize.fn(
            "array_remove",
            Sequelize.col("loggedSessions"),
            token
          ),
        },
        { where: { user_id: req.admin.id } }
      );
    } else {
      // Clear all sessions (Full Logout)
      await UserPassword.update(
        { loggedSessions: [] },
        { where: { user_id: req.admin.id } }
      );
    }

    return res.json({
      success: true,
      result: {},
      message: "Successfully logged out",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

module.exports = logout;
