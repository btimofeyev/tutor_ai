-- Migration: Add processing status fields to materials table
-- Run this in Supabase SQL editor

ALTER TABLE materials 
ADD COLUMN IF NOT EXISTS processing_status VARCHAR(20) DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing materials to have completed status
UPDATE materials 
SET processing_status = 'completed', 
    processing_completed_at = created_at 
WHERE processing_status IS NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_materials_processing_status ON materials(processing_status);

-- Comments for documentation
COMMENT ON COLUMN materials.processing_status IS 'Status of AI processing: pending, processing, completed, failed';
COMMENT ON COLUMN materials.processing_completed_at IS 'Timestamp when AI processing completed';