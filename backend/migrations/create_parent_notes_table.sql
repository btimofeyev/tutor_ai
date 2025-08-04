-- Create parent_notes table for storing parent/guardian quick notes
CREATE TABLE IF NOT EXISTS parent_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id) ON DELETE CASCADE, -- NULL for global notes
    note_text TEXT NOT NULL,
    color VARCHAR(20) DEFAULT 'yellow',
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_parent_notes_parent_id ON parent_notes(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_notes_child_id ON parent_notes(child_id);
CREATE INDEX IF NOT EXISTS idx_parent_notes_parent_child ON parent_notes(parent_id, child_id);

-- Enable Row Level Security (RLS)
ALTER TABLE parent_notes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow parents to only access their own notes
CREATE POLICY "Parents can only access their own notes" ON parent_notes
    FOR ALL USING (auth.uid() = parent_id);

-- Add comments for documentation
COMMENT ON TABLE parent_notes IS 'Stores quick notes for parents/guardians, can be child-specific or global';
COMMENT ON COLUMN parent_notes.child_id IS 'NULL for global notes that appear across all children';
COMMENT ON COLUMN parent_notes.color IS 'Sticky note color: yellow, blue, pink, green, orange, purple';
COMMENT ON COLUMN parent_notes.position_x IS 'X position for draggable notes UI';
COMMENT ON COLUMN parent_notes.position_y IS 'Y position for draggable notes UI';