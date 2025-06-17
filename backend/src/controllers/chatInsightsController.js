// backend/src/controllers/chatInsightsController.js
const supabase = require('../utils/supabaseClient');

/**
 * Get conversation summaries for a parent's children
 * Returns daily summaries grouped by date, filtered by selected child if specified
 */
exports.getChatInsights = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { childId, days = 7, status = 'unread' } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Build query filters
    let query = supabase
      .from('parent_conversation_notifications')
      .select(`
        *,
        children:child_id (
          id,
          name,
          grade
        )
      `)
      .eq('parent_id', userId)
      .gte('conversation_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('conversation_date', { ascending: false })
      .order('created_at', { ascending: false });

    // Filter by child if specified
    if (childId) {
      query = query.eq('child_id', childId);
    }

    // Filter by status if specified (default to unread)
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error('Error fetching chat insights:', error);
      return res.status(500).json({ error: 'Failed to fetch chat insights' });
    }

    // Group notifications by date
    const groupedByDate = notifications.reduce((acc, notification) => {
      const dateKey = notification.conversation_date;
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push({
        id: notification.id,
        childId: notification.child_id,
        childName: notification.children?.name || 'Unknown',
        childGrade: notification.children?.grade,
        date: notification.conversation_date,
        status: notification.status,
        createdAt: notification.created_at,
        expiresAt: notification.expires_at,
        ...notification.summary_data
      });
      return acc;
    }, {});

    // Convert to array and sort dates
    const result = Object.entries(groupedByDate)
      .map(([date, summaries]) => ({
        date,
        summaries: summaries.sort((a, b) => a.childName.localeCompare(b.childName))
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      chatInsights: result,
      totalCount: notifications.length
    });

  } catch (error) {
    console.error('Error in getChatInsights:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Mark a conversation summary as read
 */
exports.markSummaryAsRead = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { summaryId } = req.params;

    if (!userId || !summaryId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Verify ownership and update status
    const { data, error } = await supabase
      .from('parent_conversation_notifications')
      .update({ 
        status: 'read',
        updated_at: new Date().toISOString()
      })
      .eq('id', summaryId)
      .eq('parent_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error marking summary as read:', error);
      return res.status(500).json({ error: 'Failed to update summary' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Summary not found or unauthorized' });
    }

    res.json({
      success: true,
      message: 'Summary marked as read',
      summary: data
    });

  } catch (error) {
    console.error('Error in markSummaryAsRead:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete a conversation summary
 */
exports.deleteSummary = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { summaryId } = req.params;

    if (!userId || !summaryId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Verify ownership and delete
    const { data, error } = await supabase
      .from('parent_conversation_notifications')
      .delete()
      .eq('id', summaryId)
      .eq('parent_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error deleting summary:', error);
      return res.status(500).json({ error: 'Failed to delete summary' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Summary not found or unauthorized' });
    }

    res.json({
      success: true,
      message: 'Summary deleted successfully'
    });

  } catch (error) {
    console.error('Error in deleteSummary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Bulk mark summaries as read (for "mark all as read" functionality)
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { childId, beforeDate } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let query = supabase
      .from('parent_conversation_notifications')
      .update({ 
        status: 'read',
        updated_at: new Date().toISOString()
      })
      .eq('parent_id', userId)
      .eq('status', 'unread');

    // Optional filters
    if (childId) {
      query = query.eq('child_id', childId);
    }

    if (beforeDate) {
      query = query.lte('conversation_date', beforeDate);
    }

    const { data, error } = await query.select();

    if (error) {
      console.error('Error marking all as read:', error);
      return res.status(500).json({ error: 'Failed to update summaries' });
    }

    res.json({
      success: true,
      message: `Marked ${data.length} summaries as read`,
      updatedCount: data.length
    });

  } catch (error) {
    console.error('Error in markAllAsRead:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get summary statistics for parent dashboard
 */
exports.getSummaryStats = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get counts by status and recent activity
    const { data: stats, error } = await supabase
      .from('parent_conversation_notifications')
      .select('status, conversation_date, child_id')
      .eq('parent_id', userId)
      .gte('conversation_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (error) {
      console.error('Error fetching summary stats:', error);
      return res.status(500).json({ error: 'Failed to fetch statistics' });
    }

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const statistics = {
      unreadCount: stats.filter(s => s.status === 'unread').length,
      todayCount: stats.filter(s => s.conversation_date === today).length,
      yesterdayCount: stats.filter(s => s.conversation_date === yesterday).length,
      totalThisMonth: stats.length,
      activeChildren: [...new Set(stats.map(s => s.child_id))].length
    };

    res.json({
      success: true,
      statistics
    });

  } catch (error) {
    console.error('Error in getSummaryStats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Clean up expired summaries (called by cron job)
 */
exports.cleanupExpiredSummaries = async (req, res) => {
  try {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('parent_conversation_notifications')
      .delete()
      .lt('expires_at', now)
      .select('id, parent_id, child_id, conversation_date');

    if (error) {
      console.error('Error cleaning up expired summaries:', error);
      return res.status(500).json({ error: 'Failed to cleanup expired summaries' });
    }

    console.log(`Cleaned up ${data.length} expired conversation summaries`);

    res.json({
      success: true,
      message: `Cleaned up ${data.length} expired summaries`,
      cleanedCount: data.length
    });

  } catch (error) {
    console.error('Error in cleanupExpiredSummaries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};