const express = require('express');
const router = express.Router();
const childAuthController = require('../controllers/childAuthController');
const { verifyChildToken } = require('../middleware/childAuth');

// Public routes (no auth required)
router.post('/login', childAuthController.childLogin);
router.post('/refresh', childAuthController.refreshToken);
router.get('/hints', childAuthController.getLoginHints);

// Protected routes (require valid child token)
router.post('/logout', verifyChildToken, childAuthController.childLogout);
router.get('/session', verifyChildToken, childAuthController.validateSession);

module.exports = router;
