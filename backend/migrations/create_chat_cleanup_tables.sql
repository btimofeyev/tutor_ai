-- Migration: Create tables for enhanced chat cleanup system
-- Date: 2025-06-17
-- Description: Add tables for chat message exports, archived summaries, and cleanup reports

-- Create chat_message_exports table for data backup before cleanup
CREATE TABLE IF NOT EXISTS chat_message_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    export_data JSONB NOT NULL,
    message_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conversation_summaries_archive table for long-term storage
CREATE TABLE IF NOT EXISTS conversation_summaries_archive (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    message_count INTEGER NOT NULL DEFAULT 0,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    validation_status VARCHAR(20) DEFAULT 'unknown',
    validation_score INTEGER DEFAULT 0,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create chat_cleanup_reports table for monitoring cleanup operations
CREATE TABLE IF NOT EXISTS chat_cleanup_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    children_processed INTEGER NOT NULL DEFAULT 0,
    successful_cleanups INTEGER NOT NULL DEFAULT 0,
    failed_cleanups INTEGER NOT NULL DEFAULT 0,
    summaries_created INTEGER NOT NULL DEFAULT 0,
    errors JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add new columns to existing conversation_summaries table for validation
DO $$ 
BEGIN
    -- Add validation_status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversation_summaries' 
        AND column_name = 'validation_status'
    ) THEN
        ALTER TABLE conversation_summaries 
        ADD COLUMN validation_status VARCHAR(20) DEFAULT 'unknown';
    END IF;
    
    -- Add validation_score column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversation_summaries' 
        AND column_name = 'validation_score'
    ) THEN
        ALTER TABLE conversation_summaries 
        ADD COLUMN validation_score INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create indexes for better query performance

-- Indexes for chat_message_exports
CREATE INDEX IF NOT EXISTS idx_chat_exports_child_id ON chat_message_exports(child_id);
CREATE INDEX IF NOT EXISTS idx_chat_exports_created_at ON chat_message_exports(created_at);

-- Indexes for conversation_summaries_archive
CREATE INDEX IF NOT EXISTS idx_summaries_archive_child_id ON conversation_summaries_archive(child_id);
CREATE INDEX IF NOT EXISTS idx_summaries_archive_archived_at ON conversation_summaries_archive(archived_at);
CREATE INDEX IF NOT EXISTS idx_summaries_archive_created_at ON conversation_summaries_archive(created_at);

-- Indexes for chat_cleanup_reports
CREATE INDEX IF NOT EXISTS idx_cleanup_reports_date ON chat_cleanup_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_cleanup_reports_created_at ON chat_cleanup_reports(created_at);

-- Indexes for enhanced conversation_summaries
CREATE INDEX IF NOT EXISTS idx_summaries_validation_status ON conversation_summaries(validation_status);
CREATE INDEX IF NOT EXISTS idx_summaries_validation_score ON conversation_summaries(validation_score);

-- Add comments for documentation
COMMENT ON TABLE chat_message_exports IS 'Backup exports of chat messages before cleanup deletion';
COMMENT ON COLUMN chat_message_exports.export_data IS 'JSON containing full message data for potential recovery';

COMMENT ON TABLE conversation_summaries_archive IS 'Long-term archive of conversation summaries';
COMMENT ON COLUMN conversation_summaries_archive.archived_at IS 'When this summary was moved from active to archive';

COMMENT ON TABLE chat_cleanup_reports IS 'Monitoring reports for batch cleanup operations';
COMMENT ON COLUMN chat_cleanup_reports.errors IS 'JSON array of any errors encountered during cleanup';

COMMENT ON COLUMN conversation_summaries.validation_status IS 'Quality validation status: validated, failed, unknown';
COMMENT ON COLUMN conversation_summaries.validation_score IS 'Automated quality score from 0-100';

-- Create a function to clean up very old exports automatically
CREATE OR REPLACE FUNCTION cleanup_old_exports()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Delete exports older than 1 year
    DELETE FROM chat_message_exports 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    -- Delete cleanup reports older than 2 years
    DELETE FROM chat_cleanup_reports 
    WHERE created_at < NOW() - INTERVAL '2 years';
    
    -- Log the cleanup
    RAISE NOTICE 'Cleaned up old chat exports and reports';
END;
$$;

-- Grant permissions to service role
GRANT ALL ON TABLE chat_message_exports TO service_role;
GRANT ALL ON TABLE conversation_summaries_archive TO service_role;
GRANT ALL ON TABLE chat_cleanup_reports TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_exports() TO service_role;