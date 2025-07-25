-- Create schedule_entries table if it doesn't exist
CREATE TABLE IF NOT EXISTS schedule_entries (
    id SERIAL PRIMARY KEY,
    child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    material_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE, -- References lesson containers
    subject_name VARCHAR(255),
    scheduled_date DATE NOT NULL,
    start_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    notes TEXT,
    created_by VARCHAR(50) DEFAULT 'parent',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_schedule_entries_child_id ON schedule_entries(child_id);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_scheduled_date ON schedule_entries(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_child_date ON schedule_entries(child_id, scheduled_date);

-- Create child_schedule_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS child_schedule_preferences (
    id SERIAL PRIMARY KEY,
    child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    preferred_start_time TIME DEFAULT '09:00:00',
    preferred_end_time TIME DEFAULT '15:00:00',
    break_duration_minutes INTEGER DEFAULT 15,
    max_subjects_per_day INTEGER DEFAULT 6,
    preferred_days JSONB DEFAULT '["monday", "tuesday", "wednesday", "thursday", "friday"]',
    auto_schedule_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(child_id)
);

-- Create or update updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_schedule_entries_updated_at ON schedule_entries;
CREATE TRIGGER update_schedule_entries_updated_at 
    BEFORE UPDATE ON schedule_entries 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_child_schedule_preferences_updated_at ON child_schedule_preferences;
CREATE TRIGGER update_child_schedule_preferences_updated_at 
    BEFORE UPDATE ON child_schedule_preferences 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions (adjust based on your Supabase setup)
-- These commands might need to be run with appropriate privileges
-- GRANT ALL ON schedule_entries TO authenticated;
-- GRANT ALL ON schedule_preferences TO authenticated;
-- GRANT USAGE ON SEQUENCE schedule_entries_id_seq TO authenticated;
-- GRANT USAGE ON SEQUENCE schedule_preferences_id_seq TO authenticated;