const express = require('express');
const router = express.Router();
const tutorController = require('../controllers/tutorController');
const { verifyChildToken } = require('../middleware/childAuth');
const { enforceAIAccess } = require('../middleware/subscriptionEnforcement');

// Apply child authentication to all tutor routes
router.use(verifyChildToken);

// Chat endpoint with AI access enforcement
router.post('/chat', enforceAIAccess, tutorController.handleChat);

// Session management endpoints (no AI access required - just managing session data)
router.get('/session', tutorController.getSessionHistory);
router.post('/session/end', tutorController.endSession);
router.post('/session/new', tutorController.startNewSession);

// Curriculum suggestions endpoint (no AI access required - just data parsing)
router.get('/curriculum-suggestions', tutorController.getCurriculumSuggestions);

module.exports = router;