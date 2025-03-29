const express = require('express');

const router = express.Router();
// const stateController = require('@/controllers/appControllers/stateController');

const { catchErrors } = require('../../handlers/errorHandlers');
const adminAuth = require('../../controllers/coreControllers/adminAuth');

router.route('/login').post(catchErrors(adminAuth.login));
router.route('/register').post(catchErrors(adminAuth.register));

// router.route('/state/create').post(catchErrors(stateController.create));

router.route('/forgetpassword').post(catchErrors(adminAuth.forgetPassword));
router.route('/resetpassword').post(catchErrors(adminAuth.resetPassword));

router.route('/logout').post(adminAuth.isValidAuthToken, catchErrors(adminAuth.logout));

module.exports = router;
