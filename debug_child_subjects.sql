-- Check Magda's child subjects and assignments
-- Run this in your Supabase SQL editor

-- 1. Check Magda's child subjects
SELECT 
  cs.id as child_subject_id,
  cs.child_id,
  s.name as subject_name,
  cs.custom_subject_name_override,
  cs.created_at
FROM child_subjects cs
LEFT JOIN subjects s ON cs.subject_id = s.id
WHERE cs.child_id = 'b2308247-f74a-464e-ac2e-6eec90238154'
ORDER BY cs.created_at;

-- 2. Check ALL materials for these child subjects  
SELECT 
  m.id,
  m.title,
  m.content_type,
  m.completed_at,
  m.grade_value,
  m.grade_max_value,
  m.due_date,
  m.created_at,
  cs.id as child_subject_id,
  s.name as subject_name
FROM materials m
JOIN child_subjects cs ON m.child_subject_id = cs.id
LEFT JOIN subjects s ON cs.subject_id = s.id
WHERE cs.child_id = 'b2308247-f74a-464e-ac2e-6eec90238154'
ORDER BY m.created_at DESC
LIMIT 20;

-- 3. Specifically check Day 1 assignment relationship
SELECT 
  m.id,
  m.title,
  m.content_type,
  m.completed_at,
  m.grade_value,
  m.grade_max_value,
  m.due_date,
  m.created_at,
  cs.id as child_subject_id,
  cs.child_id,
  s.name as subject_name,
  cs.custom_subject_name_override
FROM materials m
JOIN child_subjects cs ON m.child_subject_id = cs.id
LEFT JOIN subjects s ON cs.subject_id = s.id
WHERE cs.child_id = 'b2308247-f74a-464e-ac2e-6eec90238154'
AND m.title LIKE '%Day 1%';