INSERT INTO subjects (id, name, description, is_predefined) VALUES
('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Mathematics', 'Core mathematics curriculum', true),
('b2c3d4e5-f6a7-8901-2345-678901bcdefa', 'English Language Arts', 'Reading, writing, and language skills', true),
('c3d4e5f6-a7b8-9012-3456-789012cdefab', 'Science', 'Elementary and middle school science', true),
('d4e5f6a7-b8c9-0123-4567-890123defabc', 'Social Studies', 'History, geography, and civics', true),
('e5f6a7b8-c9d0-1234-5678-901234efabcd', 'Art & Creativity', 'Visual arts and creative expression', true),
('f6a7b8c9-d0e1-2345-6789-012345fabcde', 'Physical Education & Health', 'Physical fitness and health education', true)
ON CONFLICT (id) DO NOTHING;

-- Assign subjects to each child (different grade levels and combinations)
-- Child 1 (Elementary - Grade 3)
INSERT INTO child_subjects (id, child_id, subject_id, name) VALUES
('11111111-1111-1111-1111-111111111111', 'e7599701-f337-4fab-bb88-531aa01bc9f0', 'a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Mathematics'),
('11111111-1111-1111-1111-111111111112', 'e7599701-f337-4fab-bb88-531aa01bc9f0', 'b2c3d4e5-f6a7-8901-2345-678901bcdefa', 'English Language Arts'),
('11111111-1111-1111-1111-111111111113', 'e7599701-f337-4fab-bb88-531aa01bc9f0', 'c3d4e5f6-a7b8-9012-3456-789012cdefab', 'Science'),
('11111111-1111-1111-1111-111111111114', 'e7599701-f337-4fab-bb88-531aa01bc9f0', 'd4e5f6a7-b8c9-0123-4567-890123defabc', 'Social Studies'),
('11111111-1111-1111-1111-111111111115', 'e7599701-f337-4fab-bb88-531aa01bc9f0', 'e5f6a7b8-c9d0-1234-5678-901234efabcd', 'Art');

-- Child 2 (Elementary - Grade 5)  
INSERT INTO child_subjects (id, child_id, subject_id, name) VALUES
('22222222-2222-2222-2222-222222222221', '2e456022-6598-4fb7-86c1-f29c36f3b963', 'a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Mathematics'),
('22222222-2222-2222-2222-222222222222', '2e456022-6598-4fb7-86c1-f29c36f3b963', 'b2c3d4e5-f6a7-8901-2345-678901bcdefa', 'English Language Arts'),
('22222222-2222-2222-2222-222222222223', '2e456022-6598-4fb7-86c1-f29c36f3b963', 'c3d4e5f6-a7b8-9012-3456-789012cdefab', 'Science'),
('22222222-2222-2222-2222-222222222224', '2e456022-6598-4fb7-86c1-f29c36f3b963', 'd4e5f6a7-b8c9-0123-4567-890123defabc', 'Social Studies'),
('22222222-2222-2222-2222-222222222225', '2e456022-6598-4fb7-86c1-f29c36f3b963', 'f6a7b8c9-d0e1-2345-6789-012345fabcde', 'Physical Education');

-- Child 3 (Middle School - Grade 7)
INSERT INTO child_subjects (id, child_id, subject_id, name) VALUES
('33333333-3333-3333-3333-333333333331', '6a2bee53-ed3e-4661-a8bf-9cab5412dae0', 'a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Pre-Algebra'),
('33333333-3333-3333-3333-333333333332', '6a2bee53-ed3e-4661-a8bf-9cab5412dae0', 'b2c3d4e5-f6a7-8901-2345-678901bcdefa', 'Language Arts'),
('33333333-3333-3333-3333-333333333333', '6a2bee53-ed3e-4661-a8bf-9cab5412dae0', 'c3d4e5f6-a7b8-9012-3456-789012cdefab', 'Life Science'),
('33333333-3333-3333-3333-333333333334', '6a2bee53-ed3e-4661-a8bf-9cab5412dae0', 'd4e5f6a7-b8c9-0123-4567-890123defabc', 'World History'),
('33333333-3333-3333-3333-333333333335', '6a2bee53-ed3e-4661-a8bf-9cab5412dae0', 'e5f6a7b8-c9d0-1234-5678-901234efabcd', 'Visual Arts');

-- Child 4 (Middle School - Grade 8)
INSERT INTO child_subjects (id, child_id, subject_id, name) VALUES
('44444444-4444-4444-4444-444444444441', 'fd3640a1-2b8f-4f8c-895c-b0cd69e16519', 'a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Algebra I'),
('44444444-4444-4444-4444-444444444442', 'fd3640a1-2b8f-4f8c-895c-b0cd69e16519', 'b2c3d4e5-f6a7-8901-2345-678901bcdefa', 'English Literature'),
('44444444-4444-4444-4444-444444444443', 'fd3640a1-2b8f-4f8c-895c-b0cd69e16519', 'c3d4e5f6-a7b8-9012-3456-789012cdefab', 'Physical Science'),
('44444444-4444-4444-4444-444444444444', 'fd3640a1-2b8f-4f8c-895c-b0cd69e16519', 'd4e5f6a7-b8c9-0123-4567-890123defabc', 'American History'),
('44444444-4444-4444-4444-444444444445', 'fd3640a1-2b8f-4f8c-895c-b0cd69e16519', 'f6a7b8c9-d0e1-2345-6789-012345fabcde', 'Health & Fitness');

-- Create Units for each subject/child combination
-- Child 1 Units (Grade 3)
INSERT INTO units (id, child_subject_id, name, description, sort_order) VALUES
-- Math Units
('50000001-5000-5000-5000-500000000001', '11111111-1111-1111-1111-111111111111', 'Addition & Subtraction', 'Three-digit addition and subtraction with regrouping', 1),
('50000001-5000-5000-5000-500000000002', '11111111-1111-1111-1111-111111111111', 'Multiplication Basics', 'Introduction to multiplication tables and concepts', 2),
-- English Units  
('50000001-5000-5000-5000-500000000003', '11111111-1111-1111-1111-111111111112', 'Reading Comprehension', 'Understanding stories and answering questions', 1),
('50000001-5000-5000-5000-500000000004', '11111111-1111-1111-1111-111111111112', 'Creative Writing', 'Writing stories and descriptive paragraphs', 2),
-- Science Units
('50000001-5000-5000-5000-500000000005', '11111111-1111-1111-1111-111111111113', 'Plants & Animals', 'Life cycles and habitats', 1),
('50000001-5000-5000-5000-500000000006', '11111111-1111-1111-1111-111111111113', 'Weather Patterns', 'Understanding weather and seasons', 2),
-- Social Studies Units
('50000001-5000-5000-5000-500000000007', '11111111-1111-1111-1111-111111111114', 'Our Community', 'Local government and community helpers', 1),
-- Art Units
('50000001-5000-5000-5000-500000000008', '11111111-1111-1111-1111-111111111115', 'Color & Shape', 'Basic art elements and techniques', 1);

-- Child 2 Units (Grade 5)
INSERT INTO units (id, child_subject_id, name, description, sort_order) VALUES
-- Math Units
('50000002-5000-5000-5000-500000000001', '22222222-2222-2222-2222-222222222221', 'Fractions & Decimals', 'Adding, subtracting, and converting fractions/decimals', 1),
('50000002-5000-5000-5000-500000000002', '22222222-2222-2222-2222-222222222221', 'Geometry Basics', 'Shapes, area, and perimeter calculations', 2),
-- English Units
('50000002-5000-5000-5000-500000000003', '22222222-2222-2222-2222-222222222222', 'Novel Studies', 'Reading chapter books and literary analysis', 1),
('50000002-5000-5000-5000-500000000004', '22222222-2222-2222-2222-222222222222', 'Research Writing', 'Writing research reports and essays', 2),
-- Science Units
('50000002-5000-5000-5000-500000000005', '22222222-2222-2222-2222-222222222223', 'Earth Systems', 'Rock cycle, water cycle, and ecosystems', 1),
('50000002-5000-5000-5000-500000000006', '22222222-2222-2222-2222-222222222223', 'Matter & Energy', 'States of matter and simple machines', 2),
-- Social Studies Units
('50000002-5000-5000-5000-500000000007', '22222222-2222-2222-2222-222222222224', 'American Revolution', 'Colonial period and founding of America', 1),
-- PE Units
('50000002-5000-5000-5000-500000000008', '22222222-2222-2222-2222-222222222225', 'Team Sports', 'Cooperation and athletic skills', 1);

-- Child 3 Units (Grade 7)
INSERT INTO units (id, child_subject_id, name, description, sort_order) VALUES
-- Math Units
('50000003-5000-5000-5000-500000000001', '33333333-3333-3333-3333-333333333331', 'Integers & Equations', 'Working with negative numbers and solving equations', 1),
('50000003-5000-5000-5000-500000000002', '33333333-3333-3333-3333-333333333331', 'Ratios & Proportions', 'Understanding ratios and solving proportions', 2),
-- English Units
('50000003-5000-5000-5000-500000000003', '33333333-3333-3333-3333-333333333332', 'Poetry Analysis', 'Understanding literary devices and themes', 1),
('50000003-5000-5000-5000-500000000004', '33333333-3333-3333-3333-333333333332', 'Persuasive Writing', 'Argumentative essays and debate skills', 2),
-- Science Units
('50000003-5000-5000-5000-500000000005', '33333333-3333-3333-3333-333333333333', 'Cell Biology', 'Cell structure and function', 1),
('50000003-5000-5000-5000-500000000006', '33333333-3333-3333-3333-333333333333', 'Human Body Systems', 'Circulatory, respiratory, and digestive systems', 2),
-- Social Studies Units
('50000003-5000-5000-5000-500000000007', '33333333-3333-3333-3333-333333333334', 'Ancient Civilizations', 'Egypt, Greece, and Rome', 1),
-- Art Units
('50000003-5000-5000-5000-500000000008', '33333333-3333-3333-3333-333333333335', 'Drawing Techniques', 'Perspective and shading', 1);

-- Child 4 Units (Grade 8)
INSERT INTO units (id, child_subject_id, name, description, sort_order) VALUES
-- Math Units
('50000004-5000-5000-5000-500000000001', '44444444-4444-4444-4444-444444444441', 'Linear Equations', 'Graphing lines and solving systems', 1),
('50000004-5000-5000-5000-500000000002', '44444444-4444-4444-4444-444444444441', 'Quadratic Functions', 'Introduction to parabolas and factoring', 2),
-- English Units
('50000004-5000-5000-5000-500000000003', '44444444-4444-4444-4444-444444444442', 'Shakespeare Studies', 'Romeo and Juliet analysis', 1),
('50000004-5000-5000-5000-500000000004', '44444444-4444-4444-4444-444444444442', 'Research Methods', 'MLA format and source evaluation', 2),
-- Science Units
('50000004-5000-5000-5000-500000000005', '44444444-4444-4444-4444-444444444443', 'Chemical Reactions', 'Atoms, molecules, and chemical equations', 1),
('50000004-5000-5000-5000-500000000006', '44444444-4444-4444-4444-444444444443', 'Forces & Motion', 'Physics principles and calculations', 2),
-- Social Studies Units
('50000004-5000-5000-5000-500000000007', '44444444-4444-4444-4444-444444444444', 'Civil War Era', 'Causes, events, and consequences', 1),
-- PE Units
('50000004-5000-5000-5000-500000000008', '44444444-4444-4444-4444-444444444445', 'Fitness Planning', 'Personal fitness goals and nutrition', 1);

-- Create Lesson Containers (5 lessons per unit for a full week)
-- Child 1 Lessons (Grade 3)
INSERT INTO lessons (id, unit_id, title, description, sort_order) VALUES
-- Math - Addition & Subtraction
('60000001-6000-6000-6000-600000000001', '50000001-5000-5000-5000-500000000001', 'Three-Digit Addition', 'Adding numbers with carrying', 1),
('60000001-6000-6000-6000-600000000002', '50000001-5000-5000-5000-500000000001', 'Three-Digit Subtraction', 'Subtracting with borrowing', 2),
('60000001-6000-6000-6000-600000000003', '50000001-5000-5000-5000-500000000001', 'Word Problems', 'Solving addition and subtraction word problems', 3),
('60000001-6000-6000-6000-600000000004', '50000001-5000-5000-5000-500000000001', 'Mental Math Strategies', 'Quick calculation techniques', 4),
('60000001-6000-6000-6000-600000000005', '50000001-5000-5000-5000-500000000001', 'Review & Assessment', 'Unit test on addition and subtraction', 5),
-- English - Reading Comprehension  
('60000001-6000-6000-6000-600000000006', '50000001-5000-5000-5000-500000000003', 'Story Elements', 'Characters, setting, and plot', 1),
('60000001-6000-6000-6000-600000000007', '50000001-5000-5000-5000-500000000003', 'Main Idea Practice', 'Finding the main idea in paragraphs', 2),
('60000001-6000-6000-6000-600000000008', '50000001-5000-5000-5000-500000000003', 'Making Inferences', 'Reading between the lines', 3),
('60000001-6000-6000-6000-600000000009', '50000001-5000-5000-5000-500000000003', 'Vocabulary Building', 'Context clues and word meanings', 4),
('60000001-6000-6000-6000-600000000010', '50000001-5000-5000-5000-500000000003', 'Reading Assessment', 'Comprehension test', 5),
-- Science - Plants & Animals
('60000001-6000-6000-6000-600000000011', '50000001-5000-5000-5000-500000000005', 'Plant Life Cycles', 'How plants grow and reproduce', 1),
('60000001-6000-6000-6000-600000000012', '50000001-5000-5000-5000-500000000005', 'Animal Habitats', 'Where animals live and why', 2),
('60000001-6000-6000-6000-600000000013', '50000001-5000-5000-5000-500000000005', 'Food Chains', 'How energy moves through ecosystems', 3);

-- Child 2 Lessons (Grade 5)
INSERT INTO lessons (id, unit_id, title, description, sort_order) VALUES
-- Math - Fractions & Decimals
('60000002-6000-6000-6000-600000000001', '50000002-5000-5000-5000-500000000001', 'Adding Fractions', 'Adding fractions with like denominators', 1),
('60000002-6000-6000-6000-600000000002', '50000002-5000-5000-5000-500000000001', 'Subtracting Fractions', 'Subtracting fractions with unlike denominators', 2),
('60000002-6000-6000-6000-600000000003', '50000002-5000-5000-5000-500000000001', 'Decimal Operations', 'Adding and subtracting decimals', 3),
('60000002-6000-6000-6000-600000000004', '50000002-5000-5000-5000-500000000001', 'Converting Fractions', 'Changing fractions to decimals', 4),
('60000002-6000-6000-6000-600000000005', '50000002-5000-5000-5000-500000000001', 'Mixed Practice', 'Combining fraction and decimal skills', 5),
-- English - Novel Studies
('60000002-6000-6000-6000-600000000006', '50000002-5000-5000-5000-500000000003', 'Character Analysis', 'Understanding character motivation', 1),
('60000002-6000-6000-6000-600000000007', '50000002-5000-5000-5000-500000000003', 'Plot Development', 'Rising action and climax', 2),
('60000002-6000-6000-6000-600000000008', '50000002-5000-5000-5000-500000000003', 'Theme Identification', 'Finding the message of the story', 3),
('60000002-6000-6000-6000-600000000009', '50000002-5000-5000-5000-500000000003', 'Literary Devices', 'Metaphors, similes, and symbolism', 4),
-- Science - Earth Systems
('60000002-6000-6000-6000-600000000010', '50000002-5000-5000-5000-500000000005', 'Rock Formation', 'Igneous, sedimentary, and metamorphic rocks', 1),
('60000002-6000-6000-6000-600000000011', '50000002-5000-5000-5000-500000000005', 'Water Cycle', 'Evaporation, condensation, and precipitation', 2),
('60000002-6000-6000-6000-600000000012', '50000002-5000-5000-5000-500000000005', 'Ecosystem Balance', 'How living and non-living things interact', 3);

-- Child 3 Lessons (Grade 7)
INSERT INTO lessons (id, unit_id, title, description, sort_order) VALUES
-- Math - Integers & Equations
('60000003-6000-6000-6000-600000000001', '50000003-5000-5000-5000-500000000001', 'Adding Integers', 'Rules for adding positive and negative numbers', 1),
('60000003-6000-6000-6000-600000000002', '50000003-5000-5000-5000-500000000001', 'Subtracting Integers', 'Subtracting with integer rules', 2),
('60000003-6000-6000-6000-600000000003', '50000003-5000-5000-5000-500000000001', 'One-Step Equations', 'Solving equations with addition and subtraction', 3),
('60000003-6000-6000-6000-600000000004', '50000003-5000-5000-5000-500000000001', 'Two-Step Equations', 'More complex equation solving', 4),
('60000003-6000-6000-6000-600000000005', '50000003-5000-5000-5000-500000000001', 'Equation Applications', 'Word problems with equations', 5),
-- English - Poetry Analysis
('60000003-6000-6000-6000-600000000006', '50000003-5000-5000-5000-500000000003', 'Poetic Forms', 'Sonnets, haikus, and free verse', 1),
('60000003-6000-6000-6000-600000000007', '50000003-5000-5000-5000-500000000003', 'Figurative Language', 'Metaphors and personification', 2),
('60000003-6000-6000-6000-600000000008', '50000003-5000-5000-5000-500000000003', 'Rhythm & Meter', 'Understanding poetic rhythm', 3),
('60000003-6000-6000-6000-600000000009', '50000003-5000-5000-5000-500000000003', 'Theme in Poetry', 'Analyzing meaning and message', 4),
-- Science - Cell Biology
('60000003-6000-6000-6000-600000000010', '50000003-5000-5000-5000-500000000005', 'Cell Structure', 'Parts of plant and animal cells', 1),
('60000003-6000-6000-6000-600000000011', '50000003-5000-5000-5000-500000000005', 'Cell Functions', 'How cells work and divide', 2),
('60000003-6000-6000-6000-600000000012', '50000003-5000-5000-5000-500000000005', 'Microscope Lab', 'Observing cells under magnification', 3);

-- Child 4 Lessons (Grade 8)
INSERT INTO lessons (id, unit_id, title, description, sort_order) VALUES
-- Math - Linear Equations
('60000004-6000-6000-6000-600000000001', '50000004-5000-5000-5000-500000000001', 'Slope-Intercept Form', 'Understanding y = mx + b', 1),
('60000004-6000-6000-6000-600000000002', '50000004-5000-5000-5000-500000000001', 'Graphing Lines', 'Plotting linear equations', 2),
('60000004-6000-6000-6000-600000000003', '50000004-5000-5000-5000-500000000001', 'Parallel & Perpendicular', 'Lines with special relationships', 3),
('60000004-6000-6000-6000-600000000004', '50000004-5000-5000-5000-500000000001', 'Systems of Equations', 'Solving two equations simultaneously', 4),
('60000004-6000-6000-6000-600000000005', '50000004-5000-5000-5000-500000000001', 'Real-World Applications', 'Linear modeling problems', 5),
-- English - Shakespeare Studies
('60000004-6000-6000-6000-600000000006', '50000004-5000-5000-5000-500000000003', 'Elizabethan Context', 'Historical background of Shakespeare', 1),
('60000004-6000-6000-6000-600000000007', '50000004-5000-5000-5000-500000000003', 'Character Motives', 'Romeo and Juliet character analysis', 2),
('60000004-6000-6000-6000-600000000008', '50000004-5000-5000-5000-500000000003', 'Dramatic Irony', 'Understanding Shakespeares techniques', 3),
('60000004-6000-6000-6000-600000000009', '50000004-5000-5000-5000-500000000003', 'Theme Analysis', 'Love, fate, and conflict themes', 4),
-- Science - Chemical Reactions
('60000004-6000-6000-6000-600000000010', '50000004-5000-5000-5000-500000000005', 'Atomic Structure', 'Protons, neutrons, and electrons', 1),
('60000004-6000-6000-6000-600000000011', '50000004-5000-5000-5000-500000000005', 'Chemical Bonds', 'Ionic and covalent bonding', 2),
('60000004-6000-6000-6000-600000000012', '50000004-5000-5000-5000-500000000005', 'Balancing Equations', 'Conservation of mass in reactions', 3);

-- Create Material Assignments with realistic content, due dates, and grading
-- Using dates for the current week (Monday through Friday)
-- Get current date and calculate this week's dates

-- Child 1 Materials (Grade 3)
INSERT INTO materials (id, lesson_id, title, description, content_type, due_date, grade_max_value, assignment_details) VALUES
-- Math Materials
('70000001-7000-7000-7000-700000000001', '60000001-6000-6000-6000-600000000001', 'Addition Practice Worksheet', 'Complete 20 three-digit addition problems', 'worksheet', CURRENT_DATE + INTERVAL '1 day', 20, 'Show your work for each problem. Remember to line up the place values!'),
('70000001-7000-7000-7000-700000000002', '60000001-6000-6000-6000-600000000002', 'Subtraction with Borrowing', 'Practice subtraction problems with regrouping', 'worksheet', CURRENT_DATE + INTERVAL '2 days', 15, 'Use the borrowing method we learned in class.'),
('70000001-7000-7000-7000-700000000003', '60000001-6000-6000-6000-600000000003', 'Word Problem Challenge', 'Solve 10 real-world math problems', 'assignment', CURRENT_DATE + INTERVAL '3 days', 25, 'Read carefully and identify what operation to use.'),
('70000001-7000-7000-7000-700000000004', '60000001-6000-6000-6000-600000000004', 'Mental Math Quiz', 'Quick calculation assessment', 'quiz', CURRENT_DATE + INTERVAL '4 days', 20, 'You have 10 minutes to complete this quiz.'),
('70000001-7000-7000-7000-700000000005', '60000001-6000-6000-6000-600000000005', 'Unit Test: Addition & Subtraction', 'Comprehensive test on unit concepts', 'test', CURRENT_DATE + INTERVAL '5 days', 100, 'Review all worksheets and practice problems before the test.'),

-- English Materials
('70000001-7000-7000-7000-700000000006', '60000001-6000-6000-6000-600000000006', 'Story Elements Worksheet', 'Identify characters, setting, and plot in three stories', 'worksheet', CURRENT_DATE + INTERVAL '1 day', 15, 'Use complete sentences in your answers.'),
('70000001-7000-7000-7000-700000000007', '60000001-6000-6000-6000-600000000007', 'Main Idea Practice', 'Read five paragraphs and find the main idea', 'worksheet', CURRENT_DATE + INTERVAL '2 days', 10, 'Look for the most important idea in each paragraph.'),
('70000001-7000-7000-7000-700000000008', '60000001-6000-6000-6000-600000000008', 'Inference Activity', 'Make predictions and draw conclusions from text clues', 'assignment', CURRENT_DATE + INTERVAL '3 days', 20, 'Explain your thinking using evidence from the text.'),
('70000001-7000-7000-7000-700000000009', '60000001-6000-6000-6000-600000000009', 'Vocabulary Quiz', 'Define 15 new vocabulary words', 'quiz', CURRENT_DATE + INTERVAL '4 days', 15, 'Study the word list and example sentences.'),
('70000001-7000-7000-7000-700000000010', '60000001-6000-6000-6000-600000000010', 'Reading Comprehension Test', 'Read a story and answer questions', 'test', CURRENT_DATE + INTERVAL '5 days', 50, 'Take your time and read each question carefully.'),

-- Science Materials
('70000001-7000-7000-7000-700000000011', '60000001-6000-6000-6000-600000000011', 'Plant Life Cycle Diagram', 'Draw and label the stages of plant growth', 'assignment', CURRENT_DATE + INTERVAL '2 days', 20, 'Use the diagram template and color each stage.'),
('70000001-7000-7000-7000-700000000012', '60000001-6000-6000-6000-600000000012', 'Animal Habitat Research', 'Choose an animal and describe its habitat', 'assignment', CURRENT_DATE + INTERVAL '4 days', 25, 'Include pictures and at least 5 facts about the habitat.'),
('70000001-7000-7000-7000-700000000013', '60000001-6000-6000-6000-600000000013', 'Food Chain Activity', 'Create a food chain with 5 organisms', 'worksheet', CURRENT_DATE + INTERVAL '5 days', 15, 'Show the flow of energy from plants to animals.');

-- Child 2 Materials (Grade 5)
INSERT INTO materials (id, lesson_id, title, description, content_type, due_date, grade_max_value, assignment_details) VALUES
-- Math Materials
('70000002-7000-7000-7000-700000000001', '60000002-6000-6000-6000-600000000001', 'Fraction Addition Worksheet', 'Add fractions with like and unlike denominators', 'worksheet', CURRENT_DATE + INTERVAL '1 day', 25, 'Find common denominators before adding. Simplify your answers.'),
('70000002-7000-7000-7000-700000000002', '60000002-6000-6000-6000-600000000002', 'Fraction Subtraction Practice', 'Subtract fractions and mixed numbers', 'worksheet', CURRENT_DATE + INTERVAL '2 days', 25, 'Remember to borrow from the whole number when needed.'),
('70000002-7000-7000-7000-700000000003', '60000002-6000-6000-6000-600000000003', 'Decimal Operations', 'Add and subtract decimal numbers', 'assignment', CURRENT_DATE + INTERVAL '3 days', 30, 'Line up decimal points and add zeros as needed.'),
('70000002-7000-7000-7000-700000000004', '60000002-6000-6000-6000-600000000004', 'Fraction-Decimal Conversion', 'Convert between fractions and decimals', 'quiz', CURRENT_DATE + INTERVAL '4 days', 20, 'Show your division work for fraction to decimal conversions.'),
('70000002-7000-7000-7000-700000000005', '60000002-6000-6000-6000-600000000005', 'Mixed Practice Test', 'Comprehensive assessment on fractions and decimals', 'test', CURRENT_DATE + INTERVAL '5 days', 100, 'Review all practice worksheets and ask questions if needed.'),

-- English Materials
('70000002-7000-7000-7000-700000000006', '60000002-6000-6000-6000-600000000006', 'Character Analysis Essay', 'Write about your favorite character from our novel', 'assignment', CURRENT_DATE + INTERVAL '2 days', 40, 'Include character traits, motivations, and examples from the text. 2-3 paragraphs.'),
('70000002-7000-7000-7000-700000000007', '60000002-6000-6000-6000-600000000007', 'Plot Timeline', 'Create a visual timeline of major story events', 'assignment', CURRENT_DATE + INTERVAL '3 days', 30, 'Include at least 8 major events with illustrations.'),
('70000002-7000-7000-7000-700000000008', '60000002-6000-6000-6000-600000000008', 'Theme Identification', 'Identify and explain the main theme of our novel', 'worksheet', CURRENT_DATE + INTERVAL '4 days', 25, 'Use specific examples from the text to support your answer.'),
('70000002-7000-7000-7000-700000000009', '60000002-6000-6000-6000-600000000009', 'Literary Devices Hunt', 'Find examples of metaphors, similes, and symbolism', 'assignment', CURRENT_DATE + INTERVAL '5 days', 35, 'Find 3 examples of each device and explain their meaning.'),

-- Science Materials
('70000002-7000-7000-7000-700000000010', '60000002-6000-6000-6000-600000000010', 'Rock Classification Lab', 'Classify 15 rock samples by type', 'assignment', CURRENT_DATE + INTERVAL '2 days', 30, 'Use the rock identification chart and record your observations.'),
('70000002-7000-7000-7000-700000000011', '60000002-6000-6000-6000-600000000011', 'Water Cycle Poster', 'Create a detailed poster showing the water cycle', 'assignment', CURRENT_DATE + INTERVAL '4 days', 40, 'Include all stages and explain how each one works.'),
('70000002-7000-7000-7000-700000000012', '60000002-6000-6000-6000-600000000012', 'Ecosystem Web Activity', 'Design a food web for a local ecosystem', 'assignment', CURRENT_DATE + INTERVAL '5 days', 35, 'Include producers, primary consumers, and decomposers.');

-- Child 3 Materials (Grade 7)
INSERT INTO materials (id, lesson_id, title, description, content_type, due_date, grade_max_value, assignment_details) VALUES
-- Math Materials
('70000003-7000-7000-7000-700000000001', '60000003-6000-6000-6000-600000000001', 'Integer Addition Practice', 'Solve 30 integer addition problems', 'worksheet', CURRENT_DATE + INTERVAL '1 day', 30, 'Remember the rules: same signs add, different signs subtract.'),
('70000003-7000-7000-7000-700000000002', '60000003-6000-6000-6000-600000000002', 'Integer Subtraction Quiz', 'Quick assessment on integer subtraction', 'quiz', CURRENT_DATE + INTERVAL '2 days', 25, 'Change subtraction to addition of the opposite.'),
('70000003-7000-7000-7000-700000000003', '60000003-6000-6000-6000-600000000003', 'One-Step Equations', 'Solve equations using inverse operations', 'worksheet', CURRENT_DATE + INTERVAL '3 days', 35, 'Check your answers by substituting back into the original equation.'),
('70000003-7000-7000-7000-700000000004', '60000003-6000-6000-6000-600000000004', 'Two-Step Equations Practice', 'Solve more complex algebraic equations', 'assignment', CURRENT_DATE + INTERVAL '4 days', 40, 'Remember to undo operations in reverse order (PEMDAS backwards).'),
('70000003-7000-7000-7000-700000000005', '60000003-6000-6000-6000-600000000005', 'Equation Word Problems', 'Translate word problems into equations and solve', 'assignment', CURRENT_DATE + INTERVAL '5 days', 45, 'Define your variable clearly and write the equation before solving.'),

-- English Materials
('70000003-7000-7000-7000-700000000006', '60000003-6000-6000-6000-600000000006', 'Poetry Form Analysis', 'Compare and contrast two different poetic forms', 'assignment', CURRENT_DATE + INTERVAL '2 days', 40, 'Write a 3-paragraph essay explaining the similarities and differences.'),
('70000003-7000-7000-7000-700000000007', '60000003-6000-6000-6000-600000000007', 'Figurative Language Worksheet', 'Identify and explain metaphors and personification', 'worksheet', CURRENT_DATE + INTERVAL '3 days', 30, 'Explain the meaning behind each figurative expression.'),
('70000003-7000-7000-7000-700000000008', '60000003-6000-6000-6000-600000000008', 'Rhythm Analysis Activity', 'Analyze the meter and rhythm in three poems', 'assignment', CURRENT_DATE + INTERVAL '4 days', 35, 'Mark the stressed and unstressed syllables.'),
('70000003-7000-7000-7000-700000000009', '60000003-6000-6000-6000-600000000009', 'Theme Essay', 'Write about the central theme in your chosen poem', 'assignment', CURRENT_DATE + INTERVAL '5 days', 50, 'Support your analysis with specific lines from the poem. 4-5 paragraphs.'),

-- Science Materials
('70000003-7000-7000-7000-700000000010', '60000003-6000-6000-6000-600000000010', 'Cell Diagram Labeling', 'Label plant and animal cell diagrams', 'worksheet', CURRENT_DATE + INTERVAL '1 day', 20, 'Include both the organelle names and their functions.'),
('70000003-7000-7000-7000-700000000011', '60000003-6000-6000-6000-600000000011', 'Cell Function Research', 'Research and explain 5 organelle functions', 'assignment', CURRENT_DATE + INTERVAL '3 days', 35, 'Explain how each organelle contributes to cell survival.'),
('70000003-7000-7000-7000-700000000012', '60000003-6000-6000-6000-600000000012', 'Microscope Lab Report', 'Observe cells and record detailed observations', 'assignment', CURRENT_DATE + INTERVAL '5 days', 40, 'Include labeled drawings and magnification levels.');

-- Child 4 Materials (Grade 8)
INSERT INTO materials (id, lesson_id, title, description, content_type, due_date, grade_max_value, assignment_details) VALUES
-- Math Materials
('70000004-7000-7000-7000-700000000001', '60000004-6000-6000-6000-600000000001', 'Slope-Intercept Practice', 'Graph linear equations using y = mx + b form', 'worksheet', CURRENT_DATE + INTERVAL '1 day', 35, 'Plot at least 3 points for each line and use a ruler.'),
('70000004-7000-7000-7000-700000000002', '60000004-6000-6000-6000-600000000002', 'Graphing Lines Assignment', 'Graph 10 linear equations with different slopes', 'assignment', CURRENT_DATE + INTERVAL '2 days', 40, 'Label the slope and y-intercept for each line.'),
('70000004-7000-7000-7000-700000000003', '60000004-6000-6000-6000-600000000003', 'Parallel & Perpendicular Quiz', 'Identify and create parallel and perpendicular lines', 'quiz', CURRENT_DATE + INTERVAL '3 days', 30, 'Remember: parallel lines have the same slope, perpendicular slopes multiply to -1.'),
('70000004-7000-7000-7000-700000000004', '60000004-6000-6000-6000-600000000004', 'Systems of Equations', 'Solve systems using substitution and elimination', 'assignment', CURRENT_DATE + INTERVAL '4 days', 45, 'Show all work and check your solutions in both original equations.'),
('70000004-7000-7000-7000-700000000005', '60000004-6000-6000-6000-600000000005', 'Linear Modeling Project', 'Create a real-world linear model and presentation', 'assignment', CURRENT_DATE + INTERVAL '5 days', 60, 'Research a real situation that can be modeled with a linear equation. Include graph and analysis.'),

-- English Materials
('70000004-7000-7000-7000-700000000006', '60000004-6000-6000-6000-600000000006', 'Elizabethan Research', 'Research paper on Shakespeares time period', 'assignment', CURRENT_DATE + INTERVAL '2 days', 50, 'Include information about daily life, theater, and social customs. 3-4 pages, MLA format.'),
('70000004-7000-7000-7000-700000000007', '60000004-6000-6000-6000-600000000007', 'Character Analysis Essay', 'Deep analysis of Romeo or Juliets character development', 'assignment', CURRENT_DATE + INTERVAL '3 days', 60, 'Trace character growth through specific scenes. Use textual evidence.'),
('70000004-7000-7000-7000-700000000008', '60000004-6000-6000-6000-600000000008', 'Dramatic Irony Examples', 'Find and explain 5 examples of dramatic irony in the play', 'worksheet', CURRENT_DATE + INTERVAL '4 days', 35, 'Explain what the audience knows that the characters dont.'),
('70000004-7000-7000-7000-700000000009', '60000004-6000-6000-6000-600000000009', 'Theme Analysis Project', 'Multi-media presentation on a major theme', 'assignment', CURRENT_DATE + INTERVAL '5 days', 75, 'Choose one theme and create a 10-minute presentation with visuals.'),

-- Science Materials
('70000004-7000-7000-7000-700000000010', '60000004-6000-6000-6000-600000000010', 'Atomic Structure Worksheet', 'Draw atoms and identify subatomic particles', 'worksheet', CURRENT_DATE + INTERVAL '1 day', 25, 'Show electron configurations for the first 20 elements.'),
('70000004-7000-7000-7000-700000000011', '60000004-6000-6000-6000-600000000011', 'Chemical Bonding Lab', 'Model ionic and covalent bonds using materials', 'assignment', CURRENT_DATE + INTERVAL '3 days', 40, 'Create 3D models and explain electron sharing/transfer.'),
('70000004-7000-7000-7000-700000000012', '60000004-6000-6000-6000-600000000012', 'Equation Balancing Practice', 'Balance 20 chemical equations', 'worksheet', CURRENT_DATE + INTERVAL '4 days', 30, 'Remember: atoms cannot be created or destroyed in chemical reactions.'),
('70000004-7000-7000-7000-700000000013', '60000004-6000-6000-6000-600000000013', 'Reaction Lab Report', 'Conduct reactions and write formal lab report', 'assignment', CURRENT_DATE + INTERVAL '5 days', 50, 'Follow proper lab report format with hypothesis, procedure, and conclusions.');

-- Add some grade weights for realistic grading
INSERT INTO grade_weights (id, child_subject_id, content_type, weight_percentage) VALUES
-- Child 1 weights
('80000001-8000-8000-8000-800000000001', '11111111-1111-1111-1111-111111111111', 'test', 40),
('80000001-8000-8000-8000-800000000002', '11111111-1111-1111-1111-111111111111', 'quiz', 25),
('80000001-8000-8000-8000-800000000003', '11111111-1111-1111-1111-111111111111', 'worksheet', 20),
('80000001-8000-8000-8000-800000000004', '11111111-1111-1111-1111-111111111111', 'assignment', 15),
('80000001-8000-8000-8000-800000000005', '11111111-1111-1111-1111-111111111112', 'test', 35),
('80000001-8000-8000-8000-800000000006', '11111111-1111-1111-1111-111111111112', 'assignment', 35),
('80000001-8000-8000-8000-800000000007', '11111111-1111-1111-1111-111111111112', 'worksheet', 30),
-- Child 2 weights
('80000002-8000-8000-8000-800000000001', '22222222-2222-2222-2222-222222222221', 'test', 45),
('80000002-8000-8000-8000-800000000002', '22222222-2222-2222-2222-222222222221', 'assignment', 30),
('80000002-8000-8000-8000-800000000003', '22222222-2222-2222-2222-222222222221', 'quiz', 25),
('80000002-8000-8000-8000-800000000004', '22222222-2222-2222-2222-222222222222', 'assignment', 50),
('80000002-8000-8000-8000-800000000005', '22222222-2222-2222-2222-222222222222', 'worksheet', 30),
('80000002-8000-8000-8000-800000000006', '22222222-2222-2222-2222-222222222222', 'quiz', 20),
-- Child 3 weights
('80000003-8000-8000-8000-800000000001', '33333333-3333-3333-3333-333333333331', 'test', 40),
('80000003-8000-8000-8000-800000000002', '33333333-3333-3333-3333-333333333331', 'assignment', 35),
('80000003-8000-8000-8000-800000000003', '33333333-3333-3333-3333-333333333331', 'worksheet', 25),
('80000003-8000-8000-8000-800000000004', '33333333-3333-3333-3333-333333333332', 'assignment', 60),
('80000003-8000-8000-8000-800000000005', '33333333-3333-3333-3333-333333333332', 'worksheet', 40),
-- Child 4 weights  
('80000004-8000-8000-8000-800000000001', '44444444-4444-4444-4444-444444444441', 'assignment', 50),
('80000004-8000-8000-8000-800000000002', '44444444-4444-4444-4444-444444444441', 'quiz', 30),
('80000004-8000-8000-8000-800000000003', '44444444-4444-4444-4444-444444444441', 'worksheet', 20),
('80000004-8000-8000-8000-800000000004', '44444444-4444-4444-4444-444444444442', 'assignment', 70),
('80000004-8000-8000-8000-800000000005', '44444444-4444-4444-4444-444444444442', 'worksheet', 30);

-- Add schedule preferences for each child
INSERT INTO child_schedule_preferences (child_id, preferred_start_time, preferred_end_time, max_daily_study_minutes, break_duration_minutes, difficult_subjects_morning, study_days) VALUES
('e7599701-f337-4fab-bb88-531aa01bc9f0', '09:00', '14:00', 180, 15, true, '["monday","tuesday","wednesday","thursday","friday"]'),
('2e456022-6598-4fb7-86c1-f29c36f3b963', '08:30', '15:00', 240, 20, true, '["monday","tuesday","wednesday","thursday","friday"]'),
('6a2bee53-ed3e-4661-a8bf-9cab5412dae0', '09:30', '16:00', 300, 15, false, '["monday","tuesday","wednesday","thursday","friday"]'),
('fd3640a1-2b8f-4f8c-895c-b0cd69e16519', '08:00', '15:30', 360, 20, true, '["monday","tuesday","wednesday","thursday","friday","saturday"]')
ON CONFLICT (child_id) DO UPDATE SET
  preferred_start_time = EXCLUDED.preferred_start_time,
  preferred_end_time = EXCLUDED.preferred_end_time,
  max_daily_study_minutes = EXCLUDED.max_daily_study_minutes,
  break_duration_minutes = EXCLUDED.break_duration_minutes,
  difficult_subjects_morning = EXCLUDED.difficult_subjects_morning,
  study_days = EXCLUDED.study_days;