-- Add achievement tracking fields to children table
-- Migration: add_achievement_tracking.sql
-- Date: 2025-01-17

-- Add achievement fields to children table
ALTER TABLE children 
ADD COLUMN IF NOT EXISTS achievement_points INTEGER DEFAULT 0;

ALTER TABLE children 
ADD COLUMN IF NOT EXISTS last_achievement JSONB DEFAULT NULL;

-- Create achievement_history table for tracking all achievements
CREATE TABLE IF NOT EXISTS achievement_history (
    id SERIAL PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    achievement_name VARCHAR(100) NOT NULL,
    achievement_description TEXT,
    achievement_icon VARCHAR(10),
    points_awarded INTEGER NOT NULL DEFAULT 0,
    achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    trigger_data JSONB DEFAULT NULL -- Store what triggered this achievement
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_achievement_history_child_id ON achievement_history(child_id);
CREATE INDEX IF NOT EXISTS idx_achievement_history_achieved_at ON achievement_history(achieved_at);

-- Add comments for documentation
COMMENT ON COLUMN children.achievement_points IS 'Total achievement points earned by the child';
COMMENT ON COLUMN children.last_achievement IS 'JSON object containing the most recent achievement details';
COMMENT ON TABLE achievement_history IS 'Complete history of all achievements earned by children';

-- Update any existing children records to have 0 achievement points if NULL
UPDATE children SET achievement_points = 0 WHERE achievement_points IS NULL;