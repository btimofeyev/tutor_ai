// Script to populate test data for multi-child scheduler testing
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client
const supabaseUrl = 'https://yklwdolmzgtivzdixofs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrbHdkb2xtemd0aXZ6ZGl4b2ZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzYyMDQ3NCwiZXhwIjoyMDYzMTk2NDc0fQ.z7zFtV64iRt5MJwFj_DRl3zFnSa2lNupIqLnRXt5l7c';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function populateTestData() {
  try {
    console.log('🚀 Starting to populate test data...');
    
    // First, let's create the subjects
    console.log('📚 Creating subjects...');
    const subjects = [
      { id: 'math-subject-id', name: 'Mathematics', description: 'Core mathematics curriculum', is_predefined: true },
      { id: 'english-subject-id', name: 'English Language Arts', description: 'Reading, writing, and language skills', is_predefined: true },
      { id: 'science-subject-id', name: 'Science', description: 'Elementary and middle school science', is_predefined: true },
      { id: 'social-studies-id', name: 'Social Studies', description: 'History, geography, and civics', is_predefined: true },
      { id: 'art-subject-id', name: 'Art & Creativity', description: 'Visual arts and creative expression', is_predefined: true },
      { id: 'pe-health-id', name: 'Physical Education & Health', description: 'Physical fitness and health education', is_predefined: true }
    ];

    for (const subject of subjects) {
      const { error } = await supabase
        .from('subjects')
        .upsert(subject, { onConflict: 'id' });
      
      if (error) {
        console.error(`Error creating subject ${subject.name}:`, error);
      } else {
        console.log(`✅ Created subject: ${subject.name}`);
      }
    }

    // Create child-subject assignments
    console.log('👥 Assigning subjects to children...');
    const childSubjects = [
      // Child 1 (Grade 3)
      { id: 'cs1-math', child_id: 'e7599701-f337-4fab-bb88-531aa01bc9f0', subject_id: 'math-subject-id', name: 'Mathematics' },
      { id: 'cs1-english', child_id: 'e7599701-f337-4fab-bb88-531aa01bc9f0', subject_id: 'english-subject-id', name: 'English Language Arts' },
      { id: 'cs1-science', child_id: 'e7599701-f337-4fab-bb88-531aa01bc9f0', subject_id: 'science-subject-id', name: 'Science' },
      { id: 'cs1-social', child_id: 'e7599701-f337-4fab-bb88-531aa01bc9f0', subject_id: 'social-studies-id', name: 'Social Studies' },
      { id: 'cs1-art', child_id: 'e7599701-f337-4fab-bb88-531aa01bc9f0', subject_id: 'art-subject-id', name: 'Art' },
      // Child 2 (Grade 5)
      { id: 'cs2-math', child_id: '2e456022-6598-4fb7-86c1-f29c36f3b963', subject_id: 'math-subject-id', name: 'Mathematics' },
      { id: 'cs2-english', child_id: '2e456022-6598-4fb7-86c1-f29c36f3b963', subject_id: 'english-subject-id', name: 'English Language Arts' },
      { id: 'cs2-science', child_id: '2e456022-6598-4fb7-86c1-f29c36f3b963', subject_id: 'science-subject-id', name: 'Science' },
      { id: 'cs2-social', child_id: '2e456022-6598-4fb7-86c1-f29c36f3b963', subject_id: 'social-studies-id', name: 'Social Studies' },
      { id: 'cs2-pe', child_id: '2e456022-6598-4fb7-86c1-f29c36f3b963', subject_id: 'pe-health-id', name: 'Physical Education' },
      // Child 3 (Grade 7)
      { id: 'cs3-math', child_id: '6a2bee53-ed3e-4661-a8bf-9cab5412dae0', subject_id: 'math-subject-id', name: 'Pre-Algebra' },
      { id: 'cs3-english', child_id: '6a2bee53-ed3e-4661-a8bf-9cab5412dae0', subject_id: 'english-subject-id', name: 'Language Arts' },
      { id: 'cs3-science', child_id: '6a2bee53-ed3e-4661-a8bf-9cab5412dae0', subject_id: 'science-subject-id', name: 'Life Science' },
      { id: 'cs3-social', child_id: '6a2bee53-ed3e-4661-a8bf-9cab5412dae0', subject_id: 'social-studies-id', name: 'World History' },
      { id: 'cs3-art', child_id: '6a2bee53-ed3e-4661-a8bf-9cab5412dae0', subject_id: 'art-subject-id', name: 'Visual Arts' },
      // Child 4 (Grade 8)
      { id: 'cs4-math', child_id: 'fd3640a1-2b8f-4f8c-895c-b0cd69e16519', subject_id: 'math-subject-id', name: 'Algebra I' },
      { id: 'cs4-english', child_id: 'fd3640a1-2b8f-4f8c-895c-b0cd69e16519', subject_id: 'english-subject-id', name: 'English Literature' },
      { id: 'cs4-science', child_id: 'fd3640a1-2b8f-4f8c-895c-b0cd69e16519', subject_id: 'science-subject-id', name: 'Physical Science' },
      { id: 'cs4-social', child_id: 'fd3640a1-2b8f-4f8c-895c-b0cd69e16519', subject_id: 'social-studies-id', name: 'American History' },
      { id: 'cs4-pe', child_id: 'fd3640a1-2b8f-4f8c-895c-b0cd69e16519', subject_id: 'pe-health-id', name: 'Health & Fitness' }
    ];

    for (const cs of childSubjects) {
      const { error } = await supabase
        .from('child_subjects')
        .upsert(cs, { onConflict: 'id' });
      
      if (error) {
        console.error(`Error assigning subject ${cs.name} to child:`, error);
      } else {
        console.log(`✅ Assigned ${cs.name} to child`);
      }
    }

    // Create units
    console.log('📖 Creating curriculum units...');
    const units = [
      // Child 1 Units (Grade 3)
      { id: 'u1-math-1', child_subject_id: 'cs1-math', name: 'Addition & Subtraction', description: 'Three-digit addition and subtraction with regrouping', sort_order: 1 },
      { id: 'u1-math-2', child_subject_id: 'cs1-math', name: 'Multiplication Basics', description: 'Introduction to multiplication tables and concepts', sort_order: 2 },
      { id: 'u1-eng-1', child_subject_id: 'cs1-english', name: 'Reading Comprehension', description: 'Understanding stories and answering questions', sort_order: 1 },
      { id: 'u1-eng-2', child_subject_id: 'cs1-english', name: 'Creative Writing', description: 'Writing stories and descriptive paragraphs', sort_order: 2 },
      { id: 'u1-sci-1', child_subject_id: 'cs1-science', name: 'Plants & Animals', description: 'Life cycles and habitats', sort_order: 1 },
      { id: 'u1-sci-2', child_subject_id: 'cs1-science', name: 'Weather Patterns', description: 'Understanding weather and seasons', sort_order: 2 },
      { id: 'u1-soc-1', child_subject_id: 'cs1-social', name: 'Our Community', description: 'Local government and community helpers', sort_order: 1 },
      { id: 'u1-art-1', child_subject_id: 'cs1-art', name: 'Color & Shape', description: 'Basic art elements and techniques', sort_order: 1 },
      
      // Child 2 Units (Grade 5)
      { id: 'u2-math-1', child_subject_id: 'cs2-math', name: 'Fractions & Decimals', description: 'Adding, subtracting, and converting fractions/decimals', sort_order: 1 },
      { id: 'u2-math-2', child_subject_id: 'cs2-math', name: 'Geometry Basics', description: 'Shapes, area, and perimeter calculations', sort_order: 2 },
      { id: 'u2-eng-1', child_subject_id: 'cs2-english', name: 'Novel Studies', description: 'Reading chapter books and literary analysis', sort_order: 1 },
      { id: 'u2-eng-2', child_subject_id: 'cs2-english', name: 'Research Writing', description: 'Writing research reports and essays', sort_order: 2 },
      { id: 'u2-sci-1', child_subject_id: 'cs2-science', name: 'Earth Systems', description: 'Rock cycle, water cycle, and ecosystems', sort_order: 1 },
      { id: 'u2-sci-2', child_subject_id: 'cs2-science', name: 'Matter & Energy', description: 'States of matter and simple machines', sort_order: 2 },
      { id: 'u2-soc-1', child_subject_id: 'cs2-social', name: 'American Revolution', description: 'Colonial period and founding of America', sort_order: 1 },
      { id: 'u2-pe-1', child_subject_id: 'cs2-pe', name: 'Team Sports', description: 'Cooperation and athletic skills', sort_order: 1 },
      
      // Child 3 Units (Grade 7)  
      { id: 'u3-math-1', child_subject_id: 'cs3-math', name: 'Integers & Equations', description: 'Working with negative numbers and solving equations', sort_order: 1 },
      { id: 'u3-math-2', child_subject_id: 'cs3-math', name: 'Ratios & Proportions', description: 'Understanding ratios and solving proportions', sort_order: 2 },
      { id: 'u3-eng-1', child_subject_id: 'cs3-english', name: 'Poetry Analysis', description: 'Understanding literary devices and themes', sort_order: 1 },
      { id: 'u3-eng-2', child_subject_id: 'cs3-english', name: 'Persuasive Writing', description: 'Argumentative essays and debate skills', sort_order: 2 },
      { id: 'u3-sci-1', child_subject_id: 'cs3-science', name: 'Cell Biology', description: 'Cell structure and function', sort_order: 1 },
      { id: 'u3-sci-2', child_subject_id: 'cs3-science', name: 'Human Body Systems', description: 'Circulatory, respiratory, and digestive systems', sort_order: 2 },
      { id: 'u3-soc-1', child_subject_id: 'cs3-social', name: 'Ancient Civilizations', description: 'Egypt, Greece, and Rome', sort_order: 1 },
      { id: 'u3-art-1', child_subject_id: 'cs3-art', name: 'Drawing Techniques', description: 'Perspective and shading', sort_order: 1 },
      
      // Child 4 Units (Grade 8)
      { id: 'u4-math-1', child_subject_id: 'cs4-math', name: 'Linear Equations', description: 'Graphing lines and solving systems', sort_order: 1 },
      { id: 'u4-math-2', child_subject_id: 'cs4-math', name: 'Quadratic Functions', description: 'Introduction to parabolas and factoring', sort_order: 2 },
      { id: 'u4-eng-1', child_subject_id: 'cs4-english', name: 'Shakespeare Studies', description: 'Romeo and Juliet analysis', sort_order: 1 },
      { id: 'u4-eng-2', child_subject_id: 'cs4-english', name: 'Research Methods', description: 'MLA format and source evaluation', sort_order: 2 },
      { id: 'u4-sci-1', child_subject_id: 'cs4-science', name: 'Chemical Reactions', description: 'Atoms, molecules, and chemical equations', sort_order: 1 },
      { id: 'u4-sci-2', child_subject_id: 'cs4-science', name: 'Forces & Motion', description: 'Physics principles and calculations', sort_order: 2 },
      { id: 'u4-soc-1', child_subject_id: 'cs4-social', name: 'Civil War Era', description: 'Causes, events, and consequences', sort_order: 1 },
      { id: 'u4-pe-1', child_subject_id: 'cs4-pe', name: 'Fitness Planning', description: 'Personal fitness goals and nutrition', sort_order: 1 }
    ];

    for (const unit of units) {
      const { error } = await supabase
        .from('units')
        .upsert(unit, { onConflict: 'id' });
      
      if (error) {
        console.error(`Error creating unit ${unit.name}:`, error);
      } else {
        console.log(`✅ Created unit: ${unit.name}`);
      }
    }

    console.log('✨ Test data population completed successfully!');
    console.log('📊 Summary:');
    console.log('  - 6 subjects created');
    console.log('  - 20 child-subject assignments');
    console.log('  - 32 curriculum units');
    console.log('🎯 Ready for multi-child scheduler testing!');

  } catch (error) {
    console.error('❌ Error populating test data:', error);
  }
}

// Run the script
populateTestData();