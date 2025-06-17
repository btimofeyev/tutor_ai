// backend/src/routes/chatInsightsRoutes.js
const express = require('express');
const router = express.Router();
const chatInsightsController = require('../controllers/chatInsightsController');

// Middleware to extract parent ID from header and attach to request
const extractUserFromHeader = (req, res, next) => {
  const parentId = req.headers['x-parent-id'];
  if (parentId) {
    req.user = { id: parentId };
  }
  next();
};

// Middleware to ensure user is authenticated
const requireAuth = (req, res, next) => {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Apply middlewares to all routes
router.use(extractUserFromHeader);
router.use(requireAuth);

/**
 * GET /api/parent/chat-insights
 * Get conversation summaries for parent's children
 * Query params:
 * - childId: Filter by specific child (optional)
 * - days: Number of days to look back (default: 7)
 * - status: Filter by status - 'unread', 'read', 'dismissed', 'all' (default: 'unread')
 */
router.get('/', chatInsightsController.getChatInsights);

/**
 * POST /api/parent/chat-insights/:summaryId/mark-read
 * Mark a conversation summary as read
 */
router.post('/:summaryId/mark-read', chatInsightsController.markSummaryAsRead);

/**
 * DELETE /api/parent/chat-insights/:summaryId
 * Delete a conversation summary
 */
router.delete('/:summaryId', chatInsightsController.deleteSummary);

/**
 * POST /api/parent/chat-insights/mark-all-read
 * Bulk mark summaries as read
 * Body:
 * - childId: Filter by specific child (optional)
 * - beforeDate: Mark all summaries before this date (optional)
 */
router.post('/mark-all-read', chatInsightsController.markAllAsRead);

/**
 * GET /api/parent/chat-insights/stats
 * Get summary statistics for dashboard
 */
router.get('/stats', chatInsightsController.getSummaryStats);

/**
 * POST /api/parent/chat-insights/cleanup
 * Clean up expired summaries (for cron job)
 * Note: This should ideally be protected by an internal API key in production
 */
router.post('/cleanup', chatInsightsController.cleanupExpiredSummaries);

module.exports = router;