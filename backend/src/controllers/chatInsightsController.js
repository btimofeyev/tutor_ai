const supabase = require('../utils/supabaseClient');

// Placeholder for getTestInsights
const getTestInsights = (req, res) => {
    res.status(200).json({ message: "This is a test insight from the backend." });
};

const getChildrenWithConversations = async (req, res) => {
    const parentId = req.user.id;
    try {
        const { data, error } = await supabase.rpc('get_children_with_conversations', { p_parent_id: parentId });
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching children with conversations:', error);
        res.status(500).json({ message: "Failed to fetch children's conversation data." });
    }
};

const getConversationSummaries = async (req, res) => {
    const { childId } = req.params;
     try {
        const { data, error } = await supabase
            .from('conversation_summaries')
            .select('*')
            .eq('child_id', childId)
            .order('summary_date', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching conversation summaries:', error);
        res.status(500).json({ message: "Failed to fetch conversation summaries." });
    }
};

const getConversationDetail = async (req, res) => {
    const { conversationId } = req.params;
    try {
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching conversation detail:', error);
        res.status(500).json({ message: "Failed to fetch conversation details." });
    }
};

const getUnreadConversationNotifications = async (req, res) => {
    const parentId = req.user.id;
    try {
        const { data, error } = await supabase
            .from('parent_conversation_notifications')
            .select('*, conversation_summaries(child_id, children(name))')
            .eq('parent_id', parentId)
            .eq('is_read', false);

        if (error) {
            console.error("Error fetching unread notifications:", error);
            throw error;
        }
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch unread notifications." });
    }
};

const markNotificationsAsRead = async (req, res) => {
    const parentId = req.user.id;
    const { notification_ids } = req.body;
    try {
        const { error } = await supabase
            .from('parent_conversation_notifications')
            .update({ is_read: true })
            .eq('parent_id', parentId)
            .in('id', notification_ids);

        if (error) throw error;
        res.status(200).send({ message: 'Notifications marked as read.' });
    } catch (error) {
        console.error('Error marking notifications as read:', error);
        res.status(500).json({ message: "Failed to mark notifications as read." });
    }
};

const getStickyNotesByChild = async (req, res) => {
    const { childId } = req.params;
    const parentId = req.user.id;

    try {
        // First, verify this parent is allowed to see this child's notes.
        const { data: childData, error: childError } = await supabase
            .from('children')
            .select('id')
            .eq('id', childId)
            .eq('parent_id', parentId)
            .single();

        if (childError || !childData) {
             return res.status(404).json({ message: 'Child not found or access denied.' });
        }

        const { data, error } = await supabase
            .from('sticky_notes')
            .select('*')
            .eq('child_id', childId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching sticky notes:', error);
        res.status(500).json({ message: 'Failed to fetch sticky notes.' });
    }
};

const addStickyNote = async (req, res) => {
    const { child_id, note_text, created_by } = req.body;
    const parentId = req.user.id;

     try {
        // Verify this parent is allowed to add a note for this child.
        const { data: childData, error: childError } = await supabase
            .from('children')
            .select('id')
            .eq('id', child_id)
            .eq('parent_id', parentId)
            .single();

        if (childError || !childData) {
             return res.status(404).json({ message: 'Child not found or access denied.' });
        }

        const { data, error } = await supabase
            .from('sticky_notes')
            .insert([{ child_id, note_text, created_by: parentId }])
            .select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (error) {
        console.error('Error adding sticky note:', error);
        res.status(500).json({ message: 'Failed to add sticky note.' });
    }
};

const updateStickyNote = async (req, res) => {
    const { noteId } = req.params;
    const { note_text } = req.body;
    const parentId = req.user.id;

    try {
        // Verify parent owns the note they are trying to update
        const { data: noteData, error: noteError } = await supabase
            .from('sticky_notes')
            .select('created_by')
            .eq('id', noteId)
            .single();

        if (noteError || !noteData || noteData.created_by !== parentId) {
            return res.status(404).json({ message: 'Note not found or access denied.' });
        }

        const { data, error } = await supabase
            .from('sticky_notes')
            .update({ note_text })
            .eq('id', noteId)
            .select();

        if (error) throw error;
        res.json(data[0]);
    } catch (error) {
        console.error('Error updating sticky note:', error);
        res.status(500).json({ message: 'Failed to update sticky note.' });
    }
};

const deleteStickyNote = async (req, res) => {
    const { noteId } = req.params;
    const parentId = req.user.id;
     try {
        // Verify parent owns the note they are trying to delete
        const { data: noteData, error: noteError } = await supabase
            .from('sticky_notes')
            .select('created_by')
            .eq('id', noteId)
            .single();

        if (noteError || !noteData || noteData.created_by !== parentId) {
            return res.status(404).json({ message: 'Note not found or access denied.' });
        }
        const { error } = await supabase
            .from('sticky_notes')
            .delete()
            .eq('id', noteId);

        if (error) throw error;
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting sticky note:', error);
        res.status(500).json({ message: 'Failed to delete sticky note.' });
    }
};

// New unified chat insights endpoint
const getChatInsights = async (req, res) => {
    const parentId = req.user.id;
    const { days = 14, status = 'all', childId } = req.query;

    try {
        // Calculate date range
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(days));

        let query = supabase
            .from('parent_conversation_notifications')
            .select(`
                *,
                children!child_id(name, id)
            `)
            .eq('parent_id', parentId)
            .gte('created_at', daysAgo.toISOString());

        // Apply status filter - use 'status' column instead of 'is_read'
        if (status === 'read') {
            query = query.eq('status', 'read');
        } else if (status === 'unread') {
            query = query.eq('status', 'unread');
        }

        // Apply child filter
        if (childId) {
            query = query.eq('child_id', childId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        // Group insights by date
        const groupedInsights = {};
        data.forEach(insight => {
            const date = new Date(insight.created_at).toISOString().split('T')[0];
            if (!groupedInsights[date]) {
                groupedInsights[date] = {
                    date,
                    summaries: []
                };
            }

            groupedInsights[date].summaries.push({
                id: insight.id,
                status: insight.status,
                childId: insight.child_id,
                createdAt: insight.created_at,
                conversationId: insight.id,
                // Flatten summary_data to top level for frontend compatibility
                ...insight.summary_data,
                // Override childName if it exists in summary_data
                childName: insight.summary_data?.childName || insight.children?.name || 'Unknown Child'
            });
        });

        // Convert to array format expected by frontend
        const chatInsights = Object.values(groupedInsights).sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        res.json({
            success: true,
            chatInsights
        });

    } catch (error) {
        console.error('Error fetching chat insights:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch chat insights'
        });
    }
};

// Mark a specific insight as read
const markChatInsightAsRead = async (req, res) => {
    const { id } = req.params;
    const parentId = req.user.id;

    try {
        const { error } = await supabase
            .from('parent_conversation_notifications')
            .update({ status: 'read' })
            .eq('id', id)
            .eq('parent_id', parentId);

        if (error) throw error;

        res.json({ success: true });
    } catch (error) {
        console.error('Error marking insight as read:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark insight as read'
        });
    }
};

// Delete a specific insight
const deleteChatInsight = async (req, res) => {
    const { id } = req.params;
    const parentId = req.user.id;

    try {
        const { error } = await supabase
            .from('parent_conversation_notifications')
            .delete()
            .eq('id', id)
            .eq('parent_id', parentId);

        if (error) throw error;

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting insight:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete insight'
        });
    }
};

// Mark all insights as read
const markAllChatInsightsAsRead = async (req, res) => {
    const parentId = req.user.id;
    const { childId } = req.body;

    try {
        let query = supabase
            .from('parent_conversation_notifications')
            .update({ status: 'read' })
            .eq('parent_id', parentId)
            .eq('status', 'unread');

        if (childId) {
            query = query.eq('child_id', childId);
        }

        const { data, error } = await query.select('id');

        if (error) throw error;

        res.json({
            success: true,
            updatedCount: data.length
        });
    } catch (error) {
        console.error('Error marking all insights as read:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark all insights as read'
        });
    }
};

module.exports = {
    getChildrenWithConversations,
    getConversationSummaries,
    getConversationDetail,
    getUnreadConversationNotifications,
    markNotificationsAsRead,
    getStickyNotesByChild,
    addStickyNote,
    updateStickyNote,
    deleteStickyNote,
    getTestInsights,
    getChatInsights,
    markChatInsightAsRead,
    deleteChatInsight,
    markAllChatInsightsAsRead
};
