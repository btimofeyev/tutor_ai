-- Create parent_conversation_notifications table
CREATE TABLE IF NOT EXISTS parent_conversation_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Summary data stored as JSONB for flexibility
    summary_data JSONB NOT NULL DEFAULT '{}',
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read')),
    
    -- Auto-cleanup functionality
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(parent_id, child_id, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_parent_conv_notifications_parent_id ON parent_conversation_notifications(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_conv_notifications_child_id ON parent_conversation_notifications(child_id);
CREATE INDEX IF NOT EXISTS idx_parent_conv_notifications_date ON parent_conversation_notifications(date);
CREATE INDEX IF NOT EXISTS idx_parent_conv_notifications_status ON parent_conversation_notifications(status);
CREATE INDEX IF NOT EXISTS idx_parent_conv_notifications_expires_at ON parent_conversation_notifications(expires_at);

-- Create GIN index on the entire JSONB column for general queries
CREATE INDEX IF NOT EXISTS idx_parent_conv_notifications_summary_data_gin 
ON parent_conversation_notifications USING GIN (summary_data);

-- Create specific BTREE indexes for commonly queried JSONB fields
CREATE INDEX IF NOT EXISTS idx_parent_conv_notifications_child_name 
ON parent_conversation_notifications USING BTREE ((summary_data->>'childName'));

CREATE INDEX IF NOT EXISTS idx_parent_conv_notifications_session_count 
ON parent_conversation_notifications USING BTREE (((summary_data->>'sessionCount')::integer));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
CREATE TRIGGER update_parent_conversation_notifications_updated_at 
    BEFORE UPDATE ON parent_conversation_notifications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM parent_conversation_notifications 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add table and column comments
COMMENT ON TABLE parent_conversation_notifications IS 'Stores daily conversation summaries for parents to track their children''s learning progress';
COMMENT ON COLUMN parent_conversation_notifications.summary_data IS 'JSONB containing conversation summary, topics, progress, etc.';
COMMENT ON COLUMN parent_conversation_notifications.expires_at IS 'Auto-cleanup timestamp - summaries delete after this time';