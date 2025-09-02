const express = require('express');
const router = express.Router();
const simpleTutorController = require('../controllers/simpleTutorController');
const { verifyChildToken } = require('../middleware/childAuth');
const { enforceAIAccess } = require('../middleware/subscriptionEnforcement');

/**
 * Simple AI Tutor Routes - Clean ChatGPT-like functionality
 * All routes require child authentication and AI access subscription
 */

// Health check endpoint (no authentication required)
router.get('/health', simpleTutorController.getHealth);

// Cleanup endpoint (no authentication required)
router.post('/cleanup/empty', simpleTutorController.cleanupEmptyConversations);

// Apply child authentication to all other AI tutor routes
router.use(verifyChildToken);

// Statistics endpoint (no AI access required)
router.get('/stats', simpleTutorController.getStats);

// Core chat endpoints (require AI access)
router.post('/session/start', enforceAIAccess, simpleTutorController.startSession);
router.post('/session/end', enforceAIAccess, simpleTutorController.endSession);
router.post('/chat', enforceAIAccess, simpleTutorController.handleMessage);

// Conversation management with Responses API
router.get('/conversations/:childId', enforceAIAccess, simpleTutorController.getConversations);
router.get('/conversations/:childId/recent', enforceAIAccess, simpleTutorController.getRecentConversations);
router.delete('/conversation/:sessionId', enforceAIAccess, simpleTutorController.deleteConversation);

// Optional: Get conversation history (legacy)
router.get('/session/:sessionId/history', enforceAIAccess, simpleTutorController.getHistory);

module.exports = router;