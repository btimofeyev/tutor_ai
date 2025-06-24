-- First, let's check the current state of the materials table
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name='materials'
  AND kcu.column_name = 'lesson_id';

-- Check if the lessons table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'lessons';

-- Check if the lesson_groups table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'lesson_groups';

-- Check the current structure of the materials table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'materials' AND table_schema = 'public'
ORDER BY ordinal_position;