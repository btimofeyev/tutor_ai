-- Migration: Create parent conversation notifications table
-- Date: 2025-06-16
-- Description: Add parent_conversation_notifications table for daily chat summaries

-- Create parent_conversation_notifications table
CREATE TABLE IF NOT EXISTS parent_conversation_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    conversation_date DATE NOT NULL,
    summary_data JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'dismissed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_parent_notifications_parent_id ON parent_conversation_notifications(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_notifications_child_id ON parent_conversation_notifications(child_id);
CREATE INDEX IF NOT EXISTS idx_parent_notifications_date ON parent_conversation_notifications(conversation_date);
CREATE INDEX IF NOT EXISTS idx_parent_notifications_status ON parent_conversation_notifications(status);
CREATE INDEX IF NOT EXISTS idx_parent_notifications_expires ON parent_conversation_notifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_parent_notifications_parent_child_date ON parent_conversation_notifications(parent_id, child_id, conversation_date);

-- Create unique constraint to prevent duplicate notifications for same parent/child/date
CREATE UNIQUE INDEX IF NOT EXISTS idx_parent_notifications_unique 
ON parent_conversation_notifications(parent_id, child_id, conversation_date);

-- Create trigger to update updated_at timestamp (reusing existing function)
CREATE TRIGGER update_parent_notifications_updated_at 
    BEFORE UPDATE ON parent_conversation_notifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE parent_conversation_notifications IS 'Stores daily conversation summaries for parents to review their children''s chat sessions';

COMMENT ON COLUMN parent_conversation_notifications.parent_id IS 'Parent user ID who will receive the notification';
COMMENT ON COLUMN parent_conversation_notifications.child_id IS 'Child whose conversations are being summarized';
COMMENT ON COLUMN parent_conversation_notifications.conversation_date IS 'Date of the conversations being summarized';
COMMENT ON COLUMN parent_conversation_notifications.summary_data IS 'JSON object containing conversation highlights, subjects discussed, and learning progress';
COMMENT ON COLUMN parent_conversation_notifications.status IS 'Current status: unread, read, or dismissed by parent';
COMMENT ON COLUMN parent_conversation_notifications.expires_at IS 'When this notification will be automatically deleted';

-- Example summary_data structure:
COMMENT ON COLUMN parent_conversation_notifications.summary_data IS 
'JSON structure: {
  "childName": "string",
  "sessionCount": number,
  "totalMinutes": number,
  "keyHighlights": ["string"],
  "subjectsDiscussed": ["string"],
  "learningProgress": {
    "problemsSolved": number,
    "correctAnswers": number,
    "newTopicsExplored": number,
    "struggledWith": ["string"],
    "masteredTopics": ["string"]
  },
  "materialsWorkedOn": [
    {
      "title": "string",
      "subject": "string",
      "progress": "completed|partial|struggling"
    }
  ],
  "engagementLevel": "high|medium|low",
  "sessionTimes": ["HH:MM-HH:MM"],
  "parentSuggestions": ["string"]
}';