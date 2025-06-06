-- Enhanced Chat History Tables for Memory System

-- Table for storing individual chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}', -- For storing additional context like function calls, workspace actions, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_chat_messages_child_created (child_id, created_at DESC),
    INDEX idx_chat_messages_created (created_at)
);

-- Table for storing conversation summaries
CREATE TABLE IF NOT EXISTS conversation_summaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    message_count INTEGER NOT NULL DEFAULT 0,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_conversation_summaries_child_period (child_id, period_end DESC),
    INDEX idx_conversation_summaries_created (created_at)
);

-- Add constraints to ensure data integrity
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_content_not_empty CHECK (LENGTH(TRIM(content)) > 0);
ALTER TABLE conversation_summaries ADD CONSTRAINT conversation_summaries_summary_not_empty CHECK (LENGTH(TRIM(summary)) > 0);
ALTER TABLE conversation_summaries ADD CONSTRAINT conversation_summaries_positive_count CHECK (message_count > 0);
ALTER TABLE conversation_summaries ADD CONSTRAINT conversation_summaries_valid_period CHECK (period_end >= period_start);

-- Optional: Add RLS (Row Level Security) if using Supabase auth
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies (adjust based on your auth system)
CREATE POLICY "Children can access their own chat messages" ON chat_messages
    FOR ALL USING (child_id IN (
        SELECT id FROM children WHERE parent_id = auth.uid()
    ));

CREATE POLICY "Children can access their own conversation summaries" ON conversation_summaries
    FOR ALL USING (child_id IN (
        SELECT id FROM children WHERE parent_id = auth.uid()
    ));

-- Function to automatically trigger cleanup when needed
CREATE OR REPLACE FUNCTION trigger_chat_cleanup()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if this child has too many messages (more than 75)
    IF (SELECT COUNT(*) FROM chat_messages WHERE child_id = NEW.child_id) > 75 THEN
        -- You could add a job queue entry here to trigger async cleanup
        -- For now, we'll handle this in the application layer
        NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check for cleanup needs after each message
CREATE TRIGGER check_chat_cleanup_trigger
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION trigger_chat_cleanup();

-- Optional: Create a function to get chat statistics
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