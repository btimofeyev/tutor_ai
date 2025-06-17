-- Create chat_history table for adaptive conversation intelligence
CREATE TABLE IF NOT EXISTS public.chat_history (
    id SERIAL PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_history_child_id ON chat_history(child_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_timestamp ON chat_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_chat_history_child_timestamp ON chat_history(child_id, timestamp DESC);

-- Add some sample data to test adaptive intelligence
INSERT INTO chat_history (child_id, role, content, timestamp) VALUES 
-- Student who tends to give up
('e7599701-f337-4fab-bb88-531aa01bc9f0', 'user', 'I don''t know how to do this', NOW() - INTERVAL '5 minutes'),
('e7599701-f337-4fab-bb88-531aa01bc9f0', 'assistant', 'That''s okay! Let''s break it down step by step. What part seems confusing?', NOW() - INTERVAL '4 minutes'),
('e7599701-f337-4fab-bb88-531aa01bc9f0', 'user', 'This is too hard', NOW() - INTERVAL '3 minutes'),
('e7599701-f337-4fab-bb88-531aa01bc9f0', 'assistant', 'I believe in you! Let''s start with something easier first.', NOW() - INTERVAL '2 minutes'),
('e7599701-f337-4fab-bb88-531aa01bc9f0', 'user', 'Can you help me?', NOW() - INTERVAL '1 minute'),
('e7599701-f337-4fab-bb88-531aa01bc9f0', 'assistant', 'Of course! I''m here to help you learn.', NOW());

COMMENT ON TABLE chat_history IS 'Stores chat messages for adaptive conversation intelligence analysis';