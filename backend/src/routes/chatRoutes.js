const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { verifyChildToken } = require('../middleware/childAuth');
const { enrichWithMCPContext } = require('../middleware/mcpContext');

const rateLimit = require('express-rate-limit');

// Rate limiting for chat messages
const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute max
  message: "Whoa, slow down! Let's take a breath. Try again in a minute! 🐢",
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting and auth to all routes
router.use(verifyChildToken);
router.use(enrichWithMCPContext);


// Chat endpoints
router.post('/message', chatLimiter, chatController.chat);
router.get('/suggestions', chatController.getSuggestions);
router.get('/lesson/:lessonId/help', chatController.getLessonHelp);
router.post('/report', chatController.reportMessage);

module.exports = router;
