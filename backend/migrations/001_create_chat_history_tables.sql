-- Enhanced Chat History Tables for Memory System
-- Run this migration to enable the 50-message context window and conversation summarization

-- Table for storing individual chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for storing conversation summaries
CREATE TABLE IF NOT EXISTS conversation_summaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    message_count INTEGER NOT NULL DEFAULT 0,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_child_created ON chat_messages(child_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_child_period ON conversation_summaries(child_id, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_created ON conversation_summaries(created_at);

-- Add constraints to ensure data integrity
ALTER TABLE chat_messages ADD CONSTRAINT IF NOT EXISTS chat_messages_content_not_empty CHECK (LENGTH(TRIM(content)) > 0);
ALTER TABLE conversation_summaries ADD CONSTRAINT IF NOT EXISTS conversation_summaries_summary_not_empty CHECK (LENGTH(TRIM(summary)) > 0);
ALTER TABLE conversation_summaries ADD CONSTRAINT IF NOT EXISTS conversation_summaries_positive_count CHECK (message_count > 0);
ALTER TABLE conversation_summaries ADD CONSTRAINT IF NOT EXISTS conversation_summaries_valid_period CHECK (period_end >= period_start);

-- Function to get chat statistics
CREATE OR REPLACE FUNCTION get_chat_stats(target_child_id UUID)
RETURNS TABLE (
    current_messages BIGINT,
    summarized_messages BIGINT,
    total_messages BIGINT,
    oldest_message_date TIMESTAMP WITH TIME ZONE,
    newest_message_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE((SELECT COUNT(*) FROM chat_messages WHERE child_id = target_child_id), 0) as current_messages,
        COALESCE((SELECT SUM(message_count) FROM conversation_summaries WHERE child_id = target_child_id), 0) as summarized_messages,
        COALESCE((SELECT COUNT(*) FROM chat_messages WHERE child_id = target_child_id), 0) + 
        COALESCE((SELECT SUM(message_count) FROM conversation_summaries WHERE child_id = target_child_id), 0) as total_messages,
        (SELECT MIN(created_at) FROM chat_messages WHERE child_id = target_child_id) as oldest_message_date,
        (SELECT MAX(created_at) FROM chat_messages WHERE child_id = target_child_id) as newest_message_date;
END;
$$ LANGUAGE plpgsql;