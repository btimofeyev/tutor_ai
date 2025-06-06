const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { enrichWithMCPContext } = require('../middleware/mcpContext');
const { enforceAIAccess } = require('../middleware/subscriptionEnforcement');
const { verifyChildToken } = require('../middleware/childAuth');

// All chat routes require child authentication first, then AI access
router.use(verifyChildToken);
router.use(enforceAIAccess);

// Chat endpoint with MCP context
router.post('/message', enrichWithMCPContext, chatController.chat);

// Other endpoints
router.get('/suggestions', enrichWithMCPContext, chatController.getSuggestions);
router.get('/lesson-help/:lessonId', chatController.getLessonHelp);
router.post('/report', chatController.reportMessage);

// Debug endpoint for testing enhanced memory system
router.get('/debug/memory', enrichWithMCPContext, chatController.debugMemory);

module.exports = router;