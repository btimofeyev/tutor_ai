-- Fix the foreign key constraint for materials.lesson_id
-- Drop the old constraint that references lesson_groups
ALTER TABLE materials DROP CONSTRAINT IF EXISTS materials_lesson_id_fkey;

-- Add the correct constraint that references lessons table
ALTER TABLE materials ADD CONSTRAINT materials_lesson_id_fkey 
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE;