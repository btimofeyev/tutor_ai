-- Migration: Add custom_category_id field to materials table
-- This links materials to custom assignment categories when applicable

-- Add the custom_category_id column
ALTER TABLE materials 
ADD COLUMN IF NOT EXISTS custom_category_id UUID NULL;

-- Add foreign key constraint
ALTER TABLE materials
ADD CONSTRAINT fk_materials_custom_category 
FOREIGN KEY (custom_category_id) 
REFERENCES custom_assignment_categories(id) 
ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_materials_custom_category ON materials(custom_category_id);

-- Add check constraint to ensure materials can't have both standard content_type and custom_category_id
-- A material should use either standard content types OR custom categories, not both
ALTER TABLE materials
ADD CONSTRAINT chk_materials_category_type 
CHECK (
    (custom_category_id IS NULL) OR 
    (content_type IN ('lesson', 'notes', 'reading_material', 'other'))
);

-- Add comments for documentation
COMMENT ON COLUMN materials.custom_category_id IS 'Links to custom assignment category if this material uses a custom type (mutually exclusive with gradable content_type)';

-- Note: The constraint ensures that:
-- 1. If custom_category_id IS NOT NULL, then content_type must be a non-gradable type (lesson, notes, reading_material, other)
-- 2. If custom_category_id IS NULL, then content_type can be any standard type
-- This prevents conflicts between standard grading and custom category grading