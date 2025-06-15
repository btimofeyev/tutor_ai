-- Migration: Create schedule management tables
-- Date: 2025-06-14
-- Description: Add schedule_entries and child_schedule_preferences tables for the scheduler feature

-- Create schedule_entries table
CREATE TABLE IF NOT EXISTS schedule_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    material_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    subject_name VARCHAR(255), -- For generic study time without specific material
    scheduled_date DATE NOT NULL,
    start_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'skipped')),
    created_by VARCHAR(20) DEFAULT 'parent' CHECK (created_by IN ('parent', 'ai_suggestion')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create child_schedule_preferences table
CREATE TABLE IF NOT EXISTS child_schedule_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE UNIQUE,
    preferred_start_time TIME DEFAULT '09:00',
    preferred_end_time TIME DEFAULT '15:00',
    max_daily_study_minutes INTEGER DEFAULT 240 CHECK (max_daily_study_minutes > 0),
    break_duration_minutes INTEGER DEFAULT 15 CHECK (break_duration_minutes >= 0),
    difficult_subjects_morning BOOLEAN DEFAULT true,
    study_days JSONB DEFAULT '["monday","tuesday","wednesday","thursday","friday"]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_schedule_entries_child_id ON schedule_entries(child_id);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_date ON schedule_entries(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_status ON schedule_entries(status);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_child_date ON schedule_entries(child_id, scheduled_date);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to both tables
CREATE TRIGGER update_schedule_entries_updated_at 
    BEFORE UPDATE ON schedule_entries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_preferences_updated_at 
    BEFORE UPDATE ON child_schedule_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE schedule_entries IS 'Stores scheduled study time blocks for children';
COMMENT ON TABLE child_schedule_preferences IS 'Stores scheduling preferences and constraints for each child';

COMMENT ON COLUMN schedule_entries.material_id IS 'Optional reference to specific lesson/material, null for generic study time';
COMMENT ON COLUMN schedule_entries.subject_name IS 'Subject name for display, used when material_id is null';
COMMENT ON COLUMN schedule_entries.duration_minutes IS 'Duration of the scheduled study session in minutes';
COMMENT ON COLUMN schedule_entries.created_by IS 'Indicates whether entry was created by parent or AI suggestion';

COMMENT ON COLUMN child_schedule_preferences.study_days IS 'JSON array of weekday names when child typically studies';
COMMENT ON COLUMN child_schedule_preferences.difficult_subjects_morning IS 'Whether to schedule difficult subjects in the morning';