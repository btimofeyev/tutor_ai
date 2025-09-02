-- Migration: Create conversation sessions table for OpenAI Responses API integration
-- This enables persistent conversation tracking with response chaining

-- Create conversation_sessions table
CREATE TABLE IF NOT EXISTS conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  openai_conversation_id TEXT,
  last_response_id TEXT,
  topic TEXT,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Ensure unique session per child
  UNIQUE(child_id, session_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_child_id ON conversation_sessions(child_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_session_id ON conversation_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_openai_id ON conversation_sessions(openai_conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_last_active ON conversation_sessions(last_active DESC);

-- Create RLS policies for security
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Children can only access their own conversations
CREATE POLICY "Children can view own conversations" ON conversation_sessions
  FOR SELECT USING (
    auth.uid()::text IN (
      SELECT parent_id::text FROM children WHERE id = conversation_sessions.child_id
    )
  );

-- Policy: Allow service role to manage all conversations
CREATE POLICY "Service role full access" ON conversation_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- Add comment for documentation
COMMENT ON TABLE conversation_sessions IS 'Stores conversation session metadata for OpenAI Responses API integration with persistent chat history and response chaining';
COMMENT ON COLUMN conversation_sessions.session_id IS 'Frontend session identifier matching the tutoring session';
COMMENT ON COLUMN conversation_sessions.openai_conversation_id IS 'OpenAI conversation ID for 30-day retention and retrieval';
COMMENT ON COLUMN conversation_sessions.last_response_id IS 'Last OpenAI response ID for chaining context';
COMMENT ON COLUMN conversation_sessions.topic IS 'Inferred conversation topic for organization';
COMMENT ON COLUMN conversation_sessions.message_count IS 'Number of messages in this conversation';
COMMENT ON COLUMN conversation_sessions.metadata IS 'Additional session data (grade, subjects covered, etc.)';