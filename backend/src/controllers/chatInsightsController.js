const supabase = require('../utils/supabaseClient');
const { getUnixTime, startOfDay } = require('date-fns');

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
            .from('chat_history')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('timestamp', { ascending: true });

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
    getTestInsights
};
