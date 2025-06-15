-- Realistic Week of Schoolwork for 4 Children
-- Children IDs:
-- Child 1: e7599701-f337-4fab-bb88-531aa01bc9f0
-- Child 2: 2e456022-6598-4fb7-86c1-f29c36f3b963  
-- Child 3: 6a2bee53-ed3e-4661-a8bf-9cab5412dae0
-- Child 4: fd3640a1-2b8f-4f8c-895c-b0cd69e16519

-- First, let's create the core subjects that will be used
INSERT INTO subjects (id, name, description, is_predefined) VALUES
('math-subject-id', 'Mathematics', 'Core mathematics curriculum', true),
('english-subject-id', 'English Language Arts', 'Reading, writing, and language skills', true),
('science-subject-id', 'Science', 'Elementary and middle school science', true),
('social-studies-id', 'Social Studies', 'History, geography, and civics', true),
('art-subject-id', 'Art & Creativity', 'Visual arts and creative expression', true),
('pe-health-id', 'Physical Education & Health', 'Physical fitness and health education', true)
ON CONFLICT (id) DO NOTHING;

-- Assign subjects to each child (different grade levels and combinations)
-- Child 1 (Elementary - Grade 3)
INSERT INTO child_subjects (id, child_id, subject_id, name) VALUES
('cs1-math', 'e7599701-f337-4fab-bb88-531aa01bc9f0', 'math-subject-id', 'Mathematics'),
('cs1-english', 'e7599701-f337-4fab-bb88-531aa01bc9f0', 'english-subject-id', 'English Language Arts'),
('cs1-science', 'e7599701-f337-4fab-bb88-531aa01bc9f0', 'science-subject-id', 'Science'),
('cs1-social', 'e7599701-f337-4fab-bb88-531aa01bc9f0', 'social-studies-id', 'Social Studies'),
('cs1-art', 'e7599701-f337-4fab-bb88-531aa01bc9f0', 'art-subject-id', 'Art');

-- Child 2 (Elementary - Grade 5)  
INSERT INTO child_subjects (id, child_id, subject_id, name) VALUES
('cs2-math', '2e456022-6598-4fb7-86c1-f29c36f3b963', 'math-subject-id', 'Mathematics'),
('cs2-english', '2e456022-6598-4fb7-86c1-f29c36f3b963', 'english-subject-id', 'English Language Arts'),
('cs2-science', '2e456022-6598-4fb7-86c1-f29c36f3b963', 'science-subject-id', 'Science'),
('cs2-social', '2e456022-6598-4fb7-86c1-f29c36f3b963', 'social-studies-id', 'Social Studies'),
('cs2-pe', '2e456022-6598-4fb7-86c1-f29c36f3b963', 'pe-health-id', 'Physical Education');

-- Child 3 (Middle School - Grade 7)
INSERT INTO child_subjects (id, child_id, subject_id, name) VALUES
('cs3-math', '6a2bee53-ed3e-4661-a8bf-9cab5412dae0', 'math-subject-id', 'Pre-Algebra'),
('cs3-english', '6a2bee53-ed3e-4661-a8bf-9cab5412dae0', 'english-subject-id', 'Language Arts'),
('cs3-science', '6a2bee53-ed3e-4661-a8bf-9cab5412dae0', 'science-subject-id', 'Life Science'),
('cs3-social', '6a2bee53-ed3e-4661-a8bf-9cab5412dae0', 'social-studies-id', 'World History'),
('cs3-art', '6a2bee53-ed3e-4661-a8bf-9cab5412dae0', 'art-subject-id', 'Visual Arts');

-- Child 4 (Middle School - Grade 8)
INSERT INTO child_subjects (id, child_id, subject_id, name) VALUES
('cs4-math', 'fd3640a1-2b8f-4f8c-895c-b0cd69e16519', 'math-subject-id', 'Algebra I'),
('cs4-english', 'fd3640a1-2b8f-4f8c-895c-b0cd69e16519', 'english-subject-id', 'English Literature'),
('cs4-science', 'fd3640a1-2b8f-4f8c-895c-b0cd69e16519', 'science-subject-id', 'Physical Science'),
('cs4-social', 'fd3640a1-2b8f-4f8c-895c-b0cd69e16519', 'social-studies-id', 'American History'),
('cs4-pe', 'fd3640a1-2b8f-4f8c-895c-b0cd69e16519', 'pe-health-id', 'Health & Fitness');

-- Create Units for each subject/child combination
-- Child 1 Units (Grade 3)
INSERT INTO units (id, child_subject_id, name, description, sort_order) VALUES
-- Math Units
('u1-math-1', 'cs1-math', 'Addition & Subtraction', 'Three-digit addition and subtraction with regrouping', 1),
('u1-math-2', 'cs1-math', 'Multiplication Basics', 'Introduction to multiplication tables and concepts', 2),
-- English Units  
('u1-eng-1', 'cs1-english', 'Reading Comprehension', 'Understanding stories and answering questions', 1),
('u1-eng-2', 'cs1-english', 'Creative Writing', 'Writing stories and descriptive paragraphs', 2),
-- Science Units
('u1-sci-1', 'cs1-science', 'Plants & Animals', 'Life cycles and habitats', 1),
('u1-sci-2', 'cs1-science', 'Weather Patterns', 'Understanding weather and seasons', 2),
-- Social Studies Units
('u1-soc-1', 'cs1-social', 'Our Community', 'Local government and community helpers', 1),
-- Art Units
('u1-art-1', 'cs1-art', 'Color & Shape', 'Basic art elements and techniques', 1);

-- Child 2 Units (Grade 5)
INSERT INTO units (id, child_subject_id, name, description, sort_order) VALUES
-- Math Units
('u2-math-1', 'cs2-math', 'Fractions & Decimals', 'Adding, subtracting, and converting fractions/decimals', 1),
('u2-math-2', 'cs2-math', 'Geometry Basics', 'Shapes, area, and perimeter calculations', 2),
-- English Units
('u2-eng-1', 'cs2-english', 'Novel Studies', 'Reading chapter books and literary analysis', 1),
('u2-eng-2', 'cs2-english', 'Research Writing', 'Writing research reports and essays', 2),
-- Science Units
('u2-sci-1', 'cs2-science', 'Earth Systems', 'Rock cycle, water cycle, and ecosystems', 1),
('u2-sci-2', 'cs2-science', 'Matter & Energy', 'States of matter and simple machines', 2),
-- Social Studies Units
('u2-soc-1', 'cs2-social', 'American Revolution', 'Colonial period and founding of America', 1),
-- PE Units
('u2-pe-1', 'cs2-pe', 'Team Sports', 'Cooperation and athletic skills', 1);

-- Child 3 Units (Grade 7)
INSERT INTO units (id, child_subject_id, name, description, sort_order) VALUES
-- Math Units
('u3-math-1', 'cs3-math', 'Integers & Equations', 'Working with negative numbers and solving equations', 1),
('u3-math-2', 'cs3-math', 'Ratios & Proportions', 'Understanding ratios and solving proportions', 2),
-- English Units
('u3-eng-1', 'cs3-english', 'Poetry Analysis', 'Understanding literary devices and themes', 1),
('u3-eng-2', 'cs3-english', 'Persuasive Writing', 'Argumentative essays and debate skills', 2),
-- Science Units
('u3-sci-1', 'cs3-science', 'Cell Biology', 'Cell structure and function', 1),
('u3-sci-2', 'cs3-science', 'Human Body Systems', 'Circulatory, respiratory, and digestive systems', 2),
-- Social Studies Units
('u3-soc-1', 'cs3-social', 'Ancient Civilizations', 'Egypt, Greece, and Rome', 1),
-- Art Units
('u3-art-1', 'cs3-art', 'Drawing Techniques', 'Perspective and shading', 1);

-- Child 4 Units (Grade 8)
INSERT INTO units (id, child_subject_id, name, description, sort_order) VALUES
-- Math Units
('u4-math-1', 'cs4-math', 'Linear Equations', 'Graphing lines and solving systems', 1),
('u4-math-2', 'cs4-math', 'Quadratic Functions', 'Introduction to parabolas and factoring', 2),
-- English Units
('u4-eng-1', 'cs4-english', 'Shakespeare Studies', 'Romeo and Juliet analysis', 1),
('u4-eng-2', 'cs4-english', 'Research Methods', 'MLA format and source evaluation', 2),
-- Science Units
('u4-sci-1', 'cs4-science', 'Chemical Reactions', 'Atoms, molecules, and chemical equations', 1),
('u4-sci-2', 'cs4-science', 'Forces & Motion', 'Physics principles and calculations', 2),
-- Social Studies Units
('u4-soc-1', 'cs4-social', 'Civil War Era', 'Causes, events, and consequences', 1),
-- PE Units
('u4-pe-1', 'cs4-pe', 'Fitness Planning', 'Personal fitness goals and nutrition', 1);

-- Create Lesson Containers (5 lessons per unit for a full week)
-- Child 1 Lessons (Grade 3)
INSERT INTO lessons (id, unit_id, title, description, sort_order) VALUES
-- Math - Addition & Subtraction
('l1-math-1-1', 'u1-math-1', 'Three-Digit Addition', 'Adding numbers with carrying', 1),
('l1-math-1-2', 'u1-math-1', 'Three-Digit Subtraction', 'Subtracting with borrowing', 2),
('l1-math-1-3', 'u1-math-1', 'Word Problems', 'Solving addition and subtraction word problems', 3),
('l1-math-1-4', 'u1-math-1', 'Mental Math Strategies', 'Quick calculation techniques', 4),
('l1-math-1-5', 'u1-math-1', 'Review & Assessment', 'Unit test on addition and subtraction', 5),
-- English - Reading Comprehension  
('l1-eng-1-1', 'u1-eng-1', 'Story Elements', 'Characters, setting, and plot', 1),
('l1-eng-1-2', 'u1-eng-1', 'Main Idea Practice', 'Finding the main idea in paragraphs', 2),
('l1-eng-1-3', 'u1-eng-1', 'Making Inferences', 'Reading between the lines', 3),
('l1-eng-1-4', 'u1-eng-1', 'Vocabulary Building', 'Context clues and word meanings', 4),
('l1-eng-1-5', 'u1-eng-1', 'Reading Assessment', 'Comprehension test', 5),
-- Science - Plants & Animals
('l1-sci-1-1', 'u1-sci-1', 'Plant Life Cycles', 'How plants grow and reproduce', 1),
('l1-sci-1-2', 'u1-sci-1', 'Animal Habitats', 'Where animals live and why', 2),
('l1-sci-1-3', 'u1-sci-1', 'Food Chains', 'How energy moves through ecosystems', 3);

-- Child 2 Lessons (Grade 5)
INSERT INTO lessons (id, unit_id, title, description, sort_order) VALUES
-- Math - Fractions & Decimals
('l2-math-1-1', 'u2-math-1', 'Adding Fractions', 'Adding fractions with like denominators', 1),
('l2-math-1-2', 'u2-math-1', 'Subtracting Fractions', 'Subtracting fractions with unlike denominators', 2),
('l2-math-1-3', 'u2-math-1', 'Decimal Operations', 'Adding and subtracting decimals', 3),
('l2-math-1-4', 'u2-math-1', 'Converting Fractions', 'Changing fractions to decimals', 4),
('l2-math-1-5', 'u2-math-1', 'Mixed Practice', 'Combining fraction and decimal skills', 5),
-- English - Novel Studies
('l2-eng-1-1', 'u2-eng-1', 'Character Analysis', 'Understanding character motivation', 1),
('l2-eng-1-2', 'u2-eng-1', 'Plot Development', 'Rising action and climax', 2),
('l2-eng-1-3', 'u2-eng-1', 'Theme Identification', 'Finding the message of the story', 3),
('l2-eng-1-4', 'u2-eng-1', 'Literary Devices', 'Metaphors, similes, and symbolism', 4),
-- Science - Earth Systems
('l2-sci-1-1', 'u2-sci-1', 'Rock Formation', 'Igneous, sedimentary, and metamorphic rocks', 1),
('l2-sci-1-2', 'u2-sci-1', 'Water Cycle', 'Evaporation, condensation, and precipitation', 2),
('l2-sci-1-3', 'u2-sci-1', 'Ecosystem Balance', 'How living and non-living things interact', 3);

-- Child 3 Lessons (Grade 7)
INSERT INTO lessons (id, unit_id, title, description, sort_order) VALUES
-- Math - Integers & Equations
('l3-math-1-1', 'u3-math-1', 'Adding Integers', 'Rules for adding positive and negative numbers', 1),
('l3-math-1-2', 'u3-math-1', 'Subtracting Integers', 'Subtracting with integer rules', 2),
('l3-math-1-3', 'u3-math-1', 'One-Step Equations', 'Solving equations with addition and subtraction', 3),
('l3-math-1-4', 'u3-math-1', 'Two-Step Equations', 'More complex equation solving', 4),
('l3-math-1-5', 'u3-math-1', 'Equation Applications', 'Word problems with equations', 5),
-- English - Poetry Analysis
('l3-eng-1-1', 'u3-eng-1', 'Poetic Forms', 'Sonnets, haikus, and free verse', 1),
('l3-eng-1-2', 'u3-eng-1', 'Figurative Language', 'Metaphors and personification', 2),
('l3-eng-1-3', 'u3-eng-1', 'Rhythm & Meter', 'Understanding poetic rhythm', 3),
('l3-eng-1-4', 'u3-eng-1', 'Theme in Poetry', 'Analyzing meaning and message', 4),
-- Science - Cell Biology
('l3-sci-1-1', 'u3-sci-1', 'Cell Structure', 'Parts of plant and animal cells', 1),
('l3-sci-1-2', 'u3-sci-1', 'Cell Functions', 'How cells work and divide', 2),
('l3-sci-1-3', 'u3-sci-1', 'Microscope Lab', 'Observing cells under magnification', 3);

-- Child 4 Lessons (Grade 8)
INSERT INTO lessons (id, unit_id, title, description, sort_order) VALUES
-- Math - Linear Equations
('l4-math-1-1', 'u4-math-1', 'Slope-Intercept Form', 'Understanding y = mx + b', 1),
('l4-math-1-2', 'u4-math-1', 'Graphing Lines', 'Plotting linear equations', 2),
('l4-math-1-3', 'u4-math-1', 'Parallel & Perpendicular', 'Lines with special relationships', 3),
('l4-math-1-4', 'u4-math-1', 'Systems of Equations', 'Solving two equations simultaneously', 4),
('l4-math-1-5', 'u4-math-1', 'Real-World Applications', 'Linear modeling problems', 5),
-- English - Shakespeare Studies
('l4-eng-1-1', 'u4-eng-1', 'Elizabethan Context', 'Historical background of Shakespeare', 1),
('l4-eng-1-2', 'u4-eng-1', 'Character Motives', 'Romeo and Juliet character analysis', 2),
('l4-eng-1-3', 'u4-eng-1', 'Dramatic Irony', 'Understanding Shakespeare\'s techniques', 3),
('l4-eng-1-4', 'u4-eng-1', 'Theme Analysis', 'Love, fate, and conflict themes', 4),
-- Science - Chemical Reactions
('l4-sci-1-1', 'u4-sci-1', 'Atomic Structure', 'Protons, neutrons, and electrons', 1),
('l4-sci-1-2', 'u4-sci-1', 'Chemical Bonds', 'Ionic and covalent bonding', 2),
('l4-sci-1-3', 'u4-sci-1', 'Balancing Equations', 'Conservation of mass in reactions', 3);

-- Create Material Assignments with realistic content, due dates, and grading
-- Using dates for the current week (Monday through Friday)
-- Get current date and calculate this week's dates

-- Child 1 Materials (Grade 3)
INSERT INTO materials (id, lesson_id, title, description, content_type, due_date, grade_max_value, assignment_details) VALUES
-- Math Materials
('m1-math-1-1', 'l1-math-1-1', 'Addition Practice Worksheet', 'Complete 20 three-digit addition problems', 'worksheet', CURRENT_DATE + INTERVAL '1 day', 20, 'Show your work for each problem. Remember to line up the place values!'),
('m1-math-1-2', 'l1-math-1-2', 'Subtraction with Borrowing', 'Practice subtraction problems with regrouping', 'worksheet', CURRENT_DATE + INTERVAL '2 days', 15, 'Use the borrowing method we learned in class.'),
('m1-math-1-3', 'l1-math-1-3', 'Word Problem Challenge', 'Solve 10 real-world math problems', 'assignment', CURRENT_DATE + INTERVAL '3 days', 25, 'Read carefully and identify what operation to use.'),
('m1-math-1-4', 'l1-math-1-4', 'Mental Math Quiz', 'Quick calculation assessment', 'quiz', CURRENT_DATE + INTERVAL '4 days', 20, 'You have 10 minutes to complete this quiz.'),
('m1-math-1-5', 'l1-math-1-5', 'Unit Test: Addition & Subtraction', 'Comprehensive test on unit concepts', 'test', CURRENT_DATE + INTERVAL '5 days', 100, 'Review all worksheets and practice problems before the test.'),

-- English Materials
('m1-eng-1-1', 'l1-eng-1-1', 'Story Elements Worksheet', 'Identify characters, setting, and plot in three stories', 'worksheet', CURRENT_DATE + INTERVAL '1 day', 15, 'Use complete sentences in your answers.'),
('m1-eng-1-2', 'l1-eng-1-2', 'Main Idea Practice', 'Read five paragraphs and find the main idea', 'worksheet', CURRENT_DATE + INTERVAL '2 days', 10, 'Look for the most important idea in each paragraph.'),
('m1-eng-1-3', 'l1-eng-1-3', 'Inference Activity', 'Make predictions and draw conclusions from text clues', 'assignment', CURRENT_DATE + INTERVAL '3 days', 20, 'Explain your thinking using evidence from the text.'),
('m1-eng-1-4', 'l1-eng-1-4', 'Vocabulary Quiz', 'Define 15 new vocabulary words', 'quiz', CURRENT_DATE + INTERVAL '4 days', 15, 'Study the word list and example sentences.'),
('m1-eng-1-5', 'l1-eng-1-5', 'Reading Comprehension Test', 'Read a story and answer questions', 'test', CURRENT_DATE + INTERVAL '5 days', 50, 'Take your time and read each question carefully.'),

-- Science Materials
('m1-sci-1-1', 'l1-sci-1-1', 'Plant Life Cycle Diagram', 'Draw and label the stages of plant growth', 'assignment', CURRENT_DATE + INTERVAL '2 days', 20, 'Use the diagram template and color each stage.'),
('m1-sci-1-2', 'l1-sci-1-2', 'Animal Habitat Research', 'Choose an animal and describe its habitat', 'assignment', CURRENT_DATE + INTERVAL '4 days', 25, 'Include pictures and at least 5 facts about the habitat.'),
('m1-sci-1-3', 'l1-sci-1-3', 'Food Chain Activity', 'Create a food chain with 5 organisms', 'worksheet', CURRENT_DATE + INTERVAL '5 days', 15, 'Show the flow of energy from plants to animals.');

-- Child 2 Materials (Grade 5)
INSERT INTO materials (id, lesson_id, title, description, content_type, due_date, grade_max_value, assignment_details) VALUES
-- Math Materials
('m2-math-1-1', 'l2-math-1-1', 'Fraction Addition Worksheet', 'Add fractions with like and unlike denominators', 'worksheet', CURRENT_DATE + INTERVAL '1 day', 25, 'Find common denominators before adding. Simplify your answers.'),
('m2-math-1-2', 'l2-math-1-2', 'Fraction Subtraction Practice', 'Subtract fractions and mixed numbers', 'worksheet', CURRENT_DATE + INTERVAL '2 days', 25, 'Remember to borrow from the whole number when needed.'),
('m2-math-1-3', 'l2-math-1-3', 'Decimal Operations', 'Add and subtract decimal numbers', 'assignment', CURRENT_DATE + INTERVAL '3 days', 30, 'Line up decimal points and add zeros as needed.'),
('m2-math-1-4', 'l2-math-1-4', 'Fraction-Decimal Conversion', 'Convert between fractions and decimals', 'quiz', CURRENT_DATE + INTERVAL '4 days', 20, 'Show your division work for fraction to decimal conversions.'),
('m2-math-1-5', 'l2-math-1-5', 'Mixed Practice Test', 'Comprehensive assessment on fractions and decimals', 'test', CURRENT_DATE + INTERVAL '5 days', 100, 'Review all practice worksheets and ask questions if needed.'),

-- English Materials
('m2-eng-1-1', 'l2-eng-1-1', 'Character Analysis Essay', 'Write about your favorite character from our novel', 'assignment', CURRENT_DATE + INTERVAL '2 days', 40, 'Include character traits, motivations, and examples from the text. 2-3 paragraphs.'),
('m2-eng-1-2', 'l2-eng-1-2', 'Plot Timeline', 'Create a visual timeline of major story events', 'assignment', CURRENT_DATE + INTERVAL '3 days', 30, 'Include at least 8 major events with illustrations.'),
('m2-eng-1-3', 'l2-eng-1-3', 'Theme Identification', 'Identify and explain the main theme of our novel', 'worksheet', CURRENT_DATE + INTERVAL '4 days', 25, 'Use specific examples from the text to support your answer.'),
('m2-eng-1-4', 'l2-eng-1-4', 'Literary Devices Hunt', 'Find examples of metaphors, similes, and symbolism', 'assignment', CURRENT_DATE + INTERVAL '5 days', 35, 'Find 3 examples of each device and explain their meaning.'),

-- Science Materials
('m2-sci-1-1', 'l2-sci-1-1', 'Rock Classification Lab', 'Classify 15 rock samples by type', 'assignment', CURRENT_DATE + INTERVAL '2 days', 30, 'Use the rock identification chart and record your observations.'),
('m2-sci-1-2', 'l2-sci-1-2', 'Water Cycle Poster', 'Create a detailed poster showing the water cycle', 'assignment', CURRENT_DATE + INTERVAL '4 days', 40, 'Include all stages and explain how each one works.'),
('m2-sci-1-3', 'l2-sci-1-3', 'Ecosystem Web Activity', 'Design a food web for a local ecosystem', 'assignment', CURRENT_DATE + INTERVAL '5 days', 35, 'Include producers, primary consumers, and decomposers.');

-- Child 3 Materials (Grade 7)
INSERT INTO materials (id, lesson_id, title, description, content_type, due_date, grade_max_value, assignment_details) VALUES
-- Math Materials
('m3-math-1-1', 'l3-math-1-1', 'Integer Addition Practice', 'Solve 30 integer addition problems', 'worksheet', CURRENT_DATE + INTERVAL '1 day', 30, 'Remember the rules: same signs add, different signs subtract.'),
('m3-math-1-2', 'l3-math-1-2', 'Integer Subtraction Quiz', 'Quick assessment on integer subtraction', 'quiz', CURRENT_DATE + INTERVAL '2 days', 25, 'Change subtraction to addition of the opposite.'),
('m3-math-1-3', 'l3-math-1-3', 'One-Step Equations', 'Solve equations using inverse operations', 'worksheet', CURRENT_DATE + INTERVAL '3 days', 35, 'Check your answers by substituting back into the original equation.'),
('m3-math-1-4', 'l3-math-1-4', 'Two-Step Equations Practice', 'Solve more complex algebraic equations', 'assignment', CURRENT_DATE + INTERVAL '4 days', 40, 'Remember to undo operations in reverse order (PEMDAS backwards).'),
('m3-math-1-5', 'l3-math-1-5', 'Equation Word Problems', 'Translate word problems into equations and solve', 'assignment', CURRENT_DATE + INTERVAL '5 days', 45, 'Define your variable clearly and write the equation before solving.'),

-- English Materials
('m3-eng-1-1', 'l3-eng-1-1', 'Poetry Form Analysis', 'Compare and contrast two different poetic forms', 'assignment', CURRENT_DATE + INTERVAL '2 days', 40, 'Write a 3-paragraph essay explaining the similarities and differences.'),
('m3-eng-1-2', 'l3-eng-1-2', 'Figurative Language Worksheet', 'Identify and explain metaphors and personification', 'worksheet', CURRENT_DATE + INTERVAL '3 days', 30, 'Explain the meaning behind each figurative expression.'),
('m3-eng-1-3', 'l3-eng-1-3', 'Rhythm Analysis Activity', 'Analyze the meter and rhythm in three poems', 'assignment', CURRENT_DATE + INTERVAL '4 days', 35, 'Mark the stressed and unstressed syllables.'),
('m3-eng-1-4', 'l3-eng-1-4', 'Theme Essay', 'Write about the central theme in your chosen poem', 'assignment', CURRENT_DATE + INTERVAL '5 days', 50, 'Support your analysis with specific lines from the poem. 4-5 paragraphs.'),

-- Science Materials
('m3-sci-1-1', 'l3-sci-1-1', 'Cell Diagram Labeling', 'Label plant and animal cell diagrams', 'worksheet', CURRENT_DATE + INTERVAL '1 day', 20, 'Include both the organelle names and their functions.'),
('m3-sci-1-2', 'l3-sci-1-2', 'Cell Function Research', 'Research and explain 5 organelle functions', 'assignment', CURRENT_DATE + INTERVAL '3 days', 35, 'Explain how each organelle contributes to cell survival.'),
('m3-sci-1-3', 'l3-sci-1-3', 'Microscope Lab Report', 'Observe cells and record detailed observations', 'assignment', CURRENT_DATE + INTERVAL '5 days', 40, 'Include labeled drawings and magnification levels.');

-- Child 4 Materials (Grade 8)
INSERT INTO materials (id, lesson_id, title, description, content_type, due_date, grade_max_value, assignment_details) VALUES
-- Math Materials
('m4-math-1-1', 'l4-math-1-1', 'Slope-Intercept Practice', 'Graph linear equations using y = mx + b form', 'worksheet', CURRENT_DATE + INTERVAL '1 day', 35, 'Plot at least 3 points for each line and use a ruler.'),
('m4-math-1-2', 'l4-math-1-2', 'Graphing Lines Assignment', 'Graph 10 linear equations with different slopes', 'assignment', CURRENT_DATE + INTERVAL '2 days', 40, 'Label the slope and y-intercept for each line.'),
('m4-math-1-3', 'l4-math-1-3', 'Parallel & Perpendicular Quiz', 'Identify and create parallel and perpendicular lines', 'quiz', CURRENT_DATE + INTERVAL '3 days', 30, 'Remember: parallel lines have the same slope, perpendicular slopes multiply to -1.'),
('m4-math-1-4', 'l4-math-1-4', 'Systems of Equations', 'Solve systems using substitution and elimination', 'assignment', CURRENT_DATE + INTERVAL '4 days', 45, 'Show all work and check your solutions in both original equations.'),
('m4-math-1-5', 'l4-math-1-5', 'Linear Modeling Project', 'Create a real-world linear model and presentation', 'assignment', CURRENT_DATE + INTERVAL '5 days', 60, 'Research a real situation that can be modeled with a linear equation. Include graph and analysis.'),

-- English Materials
('m4-eng-1-1', 'l4-eng-1-1', 'Elizabethan Research', 'Research paper on Shakespeare\'s time period', 'assignment', CURRENT_DATE + INTERVAL '2 days', 50, 'Include information about daily life, theater, and social customs. 3-4 pages, MLA format.'),
('m4-eng-1-2', 'l4-eng-1-2', 'Character Analysis Essay', 'Deep analysis of Romeo or Juliet\'s character development', 'assignment', CURRENT_DATE + INTERVAL '3 days', 60, 'Trace character growth through specific scenes. Use textual evidence.'),
('m4-eng-1-3', 'l4-eng-1-3', 'Dramatic Irony Examples', 'Find and explain 5 examples of dramatic irony in the play', 'worksheet', CURRENT_DATE + INTERVAL '4 days', 35, 'Explain what the audience knows that the characters don\'t.'),
('m4-eng-1-4', 'l4-eng-1-4', 'Theme Analysis Project', 'Multi-media presentation on a major theme', 'assignment', CURRENT_DATE + INTERVAL '5 days', 75, 'Choose one theme and create a 10-minute presentation with visuals.'),

-- Science Materials
('m4-sci-1-1', 'l4-sci-1-1', 'Atomic Structure Worksheet', 'Draw atoms and identify subatomic particles', 'worksheet', CURRENT_DATE + INTERVAL '1 day', 25, 'Show electron configurations for the first 20 elements.'),
('m4-sci-1-2', 'l4-sci-1-2', 'Chemical Bonding Lab', 'Model ionic and covalent bonds using materials', 'assignment', CURRENT_DATE + INTERVAL '3 days', 40, 'Create 3D models and explain electron sharing/transfer.'),
('m4-sci-1-3', 'l4-sci-1-3', 'Equation Balancing Practice', 'Balance 20 chemical equations', 'worksheet', CURRENT_DATE + INTERVAL '4 days', 30, 'Remember: atoms cannot be created or destroyed in chemical reactions.'),
('m4-sci-1-4', 'l4-sci-1-4', 'Reaction Lab Report', 'Conduct reactions and write formal lab report', 'assignment', CURRENT_DATE + INTERVAL '5 days', 50, 'Follow proper lab report format with hypothesis, procedure, and conclusions.');

-- Add some grade weights for realistic grading
INSERT INTO grade_weights (id, child_subject_id, content_type, weight_percentage) VALUES
-- Child 1 weights
('gw1-1', 'cs1-math', 'test', 40),
('gw1-2', 'cs1-math', 'quiz', 25),
('gw1-3', 'cs1-math', 'worksheet', 20),
('gw1-4', 'cs1-math', 'assignment', 15),
('gw1-5', 'cs1-english', 'test', 35),
('gw1-6', 'cs1-english', 'assignment', 35),
('gw1-7', 'cs1-english', 'worksheet', 30),
-- Child 2 weights
('gw2-1', 'cs2-math', 'test', 45),
('gw2-2', 'cs2-math', 'assignment', 30),
('gw2-3', 'cs2-math', 'quiz', 25),
('gw2-4', 'cs2-english', 'assignment', 50),
('gw2-5', 'cs2-english', 'worksheet', 30),
('gw2-6', 'cs2-english', 'quiz', 20),
-- Child 3 weights
('gw3-1', 'cs3-math', 'test', 40),
('gw3-2', 'cs3-math', 'assignment', 35),
('gw3-3', 'cs3-math', 'worksheet', 25),
('gw3-4', 'cs3-english', 'assignment', 60),
('gw3-5', 'cs3-english', 'worksheet', 40),
-- Child 4 weights  
('gw4-1', 'cs4-math', 'assignment', 50),
('gw4-2', 'cs4-math', 'quiz', 30),
('gw4-3', 'cs4-math', 'worksheet', 20),
('gw4-4', 'cs4-english', 'assignment', 70),
('gw4-5', 'cs4-english', 'worksheet', 30);

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

-- Summary of what was created:
-- 4 children with realistic grade-appropriate subjects
-- 6 core subjects (Math, English, Science, Social Studies, Art, PE)
-- 20+ units across all children with age-appropriate content
-- 60+ lessons providing a full week of instruction per unit
-- 80+ materials with realistic assignments, worksheets, quizzes, and tests
-- Due dates spread across a school week (Monday-Friday)
-- Grade weights reflecting realistic assessment strategies
-- Schedule preferences for each child for AI planning

-- This creates a comprehensive testing environment for the multi-child scheduler with:
-- - Different grade levels (3rd, 5th, 7th, 8th grade)
-- - Varying assignment complexity and time requirements
-- - Realistic due date conflicts for testing scheduling logic
-- - Mix of assessment types for complete academic simulation
-- - Different learning preferences and schedules per child