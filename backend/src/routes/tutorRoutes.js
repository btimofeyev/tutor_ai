const express = require('express');
const router = express.Router();
const tutorController = require('../controllers/tutorController');
const { verifyChildToken } = require('../middleware/childAuth');
const { enforceAIAccess } = require('../middleware/subscriptionEnforcement');

// Apply child authentication to all tutor routes
router.use(verifyChildToken);

// Chat endpoint with AI access enforcement
router.post('/chat', enforceAIAccess, tutorController.handleChat);

// Session history endpoint (no AI access required - just reading session data)
router.get('/session', tutorController.getSessionHistory);


module.exports = router;