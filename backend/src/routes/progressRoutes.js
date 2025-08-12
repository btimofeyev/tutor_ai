// backend/src/routes/progressRoutes.js
const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const { verifyChildToken } = require('../middleware/childAuth');

// All routes require child authentication
router.use(verifyChildToken);

// Practice session management
router.post('/sessions/start', progressController.startPracticeSession);
router.post('/sessions/:session_id/end', progressController.endPracticeSession);
router.get('/sessions/:session_id/stats', progressController.getSessionStats);

// Problem attempts
router.post('/attempts', progressController.recordProblemAttempt);

// Overall progress
router.get('/child/:child_id?', progressController.getChildProgress);

// Lifetime progress stats
router.get('/lifetime', progressController.getLifetimeProgress);

// Achievement tracking
router.get('/achievements', progressController.getAchievements);

module.exports = router;
