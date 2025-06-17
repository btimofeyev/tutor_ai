const express = require('express');
const router = express.Router();
const chatInsightsController = require('../controllers/chatInsightsController');
// Correctly import 'authenticateParent' by destructuring it from the module's exports
const { authenticateParent } = require('../middleware/auth');

// Fetch children with conversations for the parent dashboard
router.get('/children-with-conversations', authenticateParent, chatInsightsController.getChildrenWithConversations);

// Fetch conversation summaries for a specific child
router.get('/conversation-summaries/:childId', authenticateParent, chatInsightsController.getConversationSummaries);

// Fetch a specific conversation detail
router.get('/conversation/:conversationId', authenticateParent, chatInsightsController.getConversationDetail);

// Fetch unread conversation notifications
router.get('/unread-notifications', authenticateParent, chatInsightsController.getUnreadConversationNotifications);

// Mark conversation notifications as read
router.post('/mark-notifications-read', authenticateParent, chatInsightsController.markNotificationsAsRead);

// Fetch sticky notes for a specific child
router.get('/sticky-notes/:childId', authenticateParent, chatInsightsController.getStickyNotesByChild);

// Add a new sticky note
router.post('/sticky-notes', authenticateParent, chatInsightsController.addStickyNote);

// Update an existing sticky note
router.put('/sticky-notes/:noteId', authenticateParent, chatInsightsController.updateStickyNote);

// Delete a sticky note
router.delete('/sticky-notes/:noteId', authenticateParent, chatInsightsController.deleteStickyNote);

// Test route to ensure insights endpoint is reachable
router.get('/test-insights', chatInsightsController.getTestInsights);

module.exports = router;
