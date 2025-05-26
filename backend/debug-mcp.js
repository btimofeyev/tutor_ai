// backend/debug-mcp.js
// Run this to debug your MCP connection: node debug-mcp.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDatabase() {
  const childId = '2e456022-6598-4fb7-86c1-f29c36f3b963';
  
  console.log('🔍 Debugging database for child:', childId);
  console.log('='.repeat(50));
  
  try {
    // 1. Check if child exists
    console.log('1. Checking if child exists...');
    const { data: child, error: childError } = await supabase
      .from('children')
      .select('*')
      .eq('id', childId)
      .single();
    
    if (childError) {
      console.error('❌ Child not found:', childError.message);
      return;
    }
    
    console.log('✅ Child found:', child.name, `(Grade: ${child.grade || 'N/A'})`);
    
    // 2. Check child_subjects
    console.log('\n2. Checking child_subjects...');
    const { data: childSubjects, error: childSubjectsError } = await supabase
      .from('child_subjects')
      .select(`
        id,
        custom_subject_name_override,
        created_at,
        subject:subject_id (
          id,
          name,
          description
        )
      `)
      .eq('child_id', childId);
    
    if (childSubjectsError) {
      console.error('❌ Error fetching child_subjects:', childSubjectsError.message);
      return;
    }
    
    console.log(`📚 Found ${childSubjects?.length || 0} assigned subjects:`);
    (childSubjects || []).forEach((cs, i) => {
      const displayName = cs.custom_subject_name_override || cs.subject?.name;
      console.log(`   ${i + 1}. ${displayName} (child_subject_id: ${cs.id})`);
    });
    
    if (!childSubjects || childSubjects.length === 0) {
      console.log('⚠️  No subjects assigned to this child. This is why MCP returns empty results.');
      console.log('💡 Assign subjects in your frontend first.');
      return;
    }
    
    // 3. Check units for each subject
    console.log('\n3. Checking units...');
    for (const cs of childSubjects) {
      const { data: units, error: unitsError } = await supabase
        .from('units')
        .select('*')
        .eq('child_subject_id', cs.id);
      
      if (unitsError) {
        console.error(`❌ Error fetching units for ${cs.subject?.name}:`, unitsError.message);
        continue;
      }
      
      console.log(`   📁 ${cs.subject?.name}: ${units?.length || 0} units`);
      (units || []).forEach((unit, i) => {
        console.log(`      ${i + 1}. ${unit.name} (id: ${unit.id})`);
      });
    }
    
    // 4. Check lesson containers
    console.log('\n4. Checking lesson containers...');
    for (const cs of childSubjects) {
      const { data: units } = await supabase
        .from('units')
        .select('id, name')
        .eq('child_subject_id', cs.id);
      
      for (const unit of units || []) {
        const { data: lessons, error: lessonsError } = await supabase
          .from('lessons')
          .select('*')
          .eq('unit_id', unit.id);
        
        if (lessonsError) {
          console.error(`❌ Error fetching lessons for unit ${unit.name}:`, lessonsError.message);
          continue;
        }
        
        console.log(`   📚 ${cs.subject?.name} > ${unit.name}: ${lessons?.length || 0} lesson containers`);
        (lessons || []).forEach((lesson, i) => {
          console.log(`      ${i + 1}. ${lesson.title} (id: ${lesson.id})`);
        });
      }
    }
    
    // 5. Check materials
    console.log('\n5. Checking materials...');
    const childSubjectIds = childSubjects.map(cs => cs.id);
    const { data: materials, error: materialsError } = await supabase
      .from('materials')
      .select(`
        id, title, content_type, status, due_date, completed_at,
        lesson_id, child_subject_id, created_at
      `)
      .in('child_subject_id', childSubjectIds);
    
    if (materialsError) {
      console.error('❌ Error fetching materials:', materialsError.message);
      return;
    }
    
    console.log(`📄 Found ${materials?.length || 0} total materials:`);
    (materials || []).forEach((material, i) => {
      const subject = childSubjects.find(cs => cs.id === material.child_subject_id);
      const subjectName = subject?.custom_subject_name_override || subject?.subject?.name || 'Unknown';
      console.log(`   ${i + 1}. "${material.title}" (${material.content_type}) - ${subjectName}`);
      console.log(`      Status: ${material.status}, Due: ${material.due_date || 'No due date'}`);
      console.log(`      Lesson ID: ${material.lesson_id || 'No lesson container'}`);
    });
    
    // 6. Check for orphaned materials
    const orphanedMaterials = (materials || []).filter(m => !m.lesson_id);
    if (orphanedMaterials.length > 0) {
      console.log(`\n⚠️  Found ${orphanedMaterials.length} materials without lesson containers:`);
      orphanedMaterials.forEach((material, i) => {
        console.log(`   ${i + 1}. "${material.title}" (needs lesson container assignment)`);
      });
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY:');
    console.log(`   Child: ${child.name}`);
    console.log(`   Subjects: ${childSubjects.length}`);
    console.log(`   Materials: ${materials?.length || 0}`);
    console.log(`   Orphaned Materials: ${orphanedMaterials.length}`);
    
    if (childSubjects.length === 0) {
      console.log('\n❌ ISSUE: No subjects assigned to child');
      console.log('💡 SOLUTION: Use the subject management page to assign subjects');
    } else if ((materials?.length || 0) === 0) {
      console.log('\n❌ ISSUE: No materials found');
      console.log('💡 SOLUTION: Add some materials through the dashboard');
    } else if (orphanedMaterials.length > 0) {
      console.log('\n⚠️  ISSUE: Some materials are not assigned to lesson containers');
      console.log('💡 SOLUTION: Edit materials to assign them to lesson containers');
    } else {
      console.log('\n✅ Database looks good! MCP should work.');
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

debugDatabase();