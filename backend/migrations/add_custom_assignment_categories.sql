-- Migration: Add custom assignment categories table
-- This allows parents to create subject-specific assignment types like "Book Reports" or "Lab Reports"

CREATE TABLE IF NOT EXISTS custom_assignment_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    child_subject_id UUID NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    weight DECIMAL(5,4) NOT NULL DEFAULT 0.0000 CHECK (weight >= 0 AND weight <= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique category names per child_subject
    UNIQUE(child_subject_id, category_name),
    
    -- Foreign key constraint (assuming child_subjects table exists)
    FOREIGN KEY (child_subject_id) REFERENCES child_subjects(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_custom_categories_child_subject ON custom_assignment_categories(child_subject_id);

-- Add trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_custom_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_custom_categories_updated_at
    BEFORE UPDATE ON custom_assignment_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_custom_categories_updated_at();

-- Add comments for documentation
COMMENT ON TABLE custom_assignment_categories IS 'Subject-specific custom assignment categories (e.g., Book Reports for English, Lab Reports for Science)';
COMMENT ON COLUMN custom_assignment_categories.child_subject_id IS 'Links to specific child-subject combination';
COMMENT ON COLUMN custom_assignment_categories.category_name IS 'Display name for the custom category (max 100 chars)';
COMMENT ON COLUMN custom_assignment_categories.weight IS 'Weight for grade calculations (0.0000 to 1.0000)';