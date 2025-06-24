-- Complete fix for materials table foreign key issues

-- Step 1: Drop all existing foreign key constraints on lesson_id
DO $$ 
DECLARE 
    constraint_name TEXT;
BEGIN
    FOR constraint_name IN 
        SELECT tc.constraint_name 
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'materials' 
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'lesson_id'
    LOOP
        EXECUTE 'ALTER TABLE materials DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
END $$;

-- Step 2: Ensure the lessons table exists (create if it doesn't)
CREATE TABLE IF NOT EXISTS lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL,
    title TEXT NOT NULL,
    lesson_number TEXT,
    description TEXT,
    sequence_order INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Add the correct foreign key constraint
ALTER TABLE materials 
ADD CONSTRAINT materials_lesson_id_fkey 
FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL;

-- Step 4: Create index for performance
CREATE INDEX IF NOT EXISTS idx_materials_lesson_id ON materials(lesson_id);

-- Step 5: Verify the constraint was created
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