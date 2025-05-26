// backend/debug-mcp-enhanced.js
// Run this to debug your MCP connection: node debug-mcp-enhanced.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Environment Check:');
console.log('   SUPABASE_URL:', supabaseUrl ? 'SET ✓' : 'MISSING ❌');
console.log('   SUPABASE_ANON_KEY:', supabaseKey ? 'SET ✓' : 'MISSING ❌');
console.log('   NODE_ENV:', process.env.NODE_ENV || 'development');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDatabase() {
  console.log('\n🔍 Starting comprehensive database debug...');
  console.log('='.repeat(60));
  
  try {
    // 1. Test basic connection
    console.log('1. Testing Supabase connection...');
    const { data: testData, error: testError } = await supabase
      .from('children')
      .select('count', { count: 'exact', head: true });
    
    if (testError) {
      console.error('❌ Supabase connection failed:', testError.message);
      console.error('   Code:', testError.code);
      console.error('   Details:', testError.details);
      return;
    }
    
    console.log(`✅ Supabase connected. Found ${testData} total children.`);
    
    // 2. List ALL children to see what we have
    console.log('\n2. Listing ALL children in database...');
    const { data: allChildren, error: allChildrenError } = await supabase
      .from('children')
      .select('id, parent_id, name, grade, child_username, created_at')
      .order('created_at', { ascending: false });
    
    if (allChildrenError) {
      console.error('❌ Error fetching all children:', allChildrenError.message);
      return;
    }
    
    console.log(`📝 Found ${allChildren?.length || 0} children:`);
    (allChildren || []).forEach((child, i) => {
      console.log(`   ${i + 1}. ${child.name} (Grade: ${child.grade || 'N/A'})`);
      console.log(`      ID: ${child.id}`);
      console.log(`      Parent ID: ${child.parent_id}`);
      console.log(`      Username: ${child.child_username || 'Not set'}`);
      console.log('');
    });
    
    if (!allChildren || allChildren.length === 0) {
      console.log('❌ No children found in database!');
      console.log('💡 Create a child first in your frontend dashboard.');
      return;
    }
    
    // 3. Pick the first child for detailed analysis
    const targetChild = allChildren[0];
    console.log(`\n3. Analyzing child: ${targetChild.name} (${targetChild.id})`);
    console.log('-'.repeat(50));
    
    // 4. Check child_subjects
    console.log('\n4. Checking child_subjects assignments...');
    const { data: childSubjects, error: childSubjectsError } = await supabase
      .from('child_subjects')
      .select(`
        id,
        child_id,
        subject_id,
        custom_subject_name_override,
        created_at,
        subject:subject_id (
          id,
          name,
          description,
          is_predefined
        )
      `)
      .eq('child_id', targetChild.id);
    
    if (childSubjectsError) {
      console.error('❌ Error fetching child_subjects:', childSubjectsError.message);
    } else {
      console.log(`📚 Found ${childSubjects?.length || 0} subject assignments:`);
      (childSubjects || []).forEach((cs, i) => {
        const displayName = cs.custom_subject_name_override || cs.subject?.name;
        console.log(`   ${i + 1}. ${displayName}`);
        console.log(`      Child-Subject ID: ${cs.id}`);
        console.log(`      Subject ID: ${cs.subject_id}`);
        console.log(`      Original Name: ${cs.subject?.name}`);
        console.log('');
      });
    }
    
    if (!childSubjects || childSubjects.length === 0) {
      console.log('⚠️  No subjects assigned to this child.');
      console.log('💡 This is why MCP returns empty results!');
      console.log('💡 Go to Subject Management in your frontend to assign subjects.');
      
      // Check if there are any global subjects available
      console.log('\n5. Checking available global subjects...');
      const { data: allSubjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name, is_predefined')
        .order('name');
      
      if (!subjectsError && allSubjects && allSubjects.length > 0) {
        console.log(`📖 Available subjects to assign (${allSubjects.length}):`);
        allSubjects.forEach((subject, i) => {
          console.log(`   ${i + 1}. ${subject.name} ${subject.is_predefined ? '(predefined)' : '(custom)'}`);
        });
      } else {
        console.log('❌ No global subjects found! Create subjects first.');
      }
      return;
    }
    
    // 5. Check units
    console.log('\n5. Checking units for each subject...');
    let totalUnits = 0;
    for (const cs of childSubjects) {
      const { data: units, error: unitsError } = await supabase
        .from('units')
        .select('id, name, description, sequence_order, created_at')
        .eq('child_subject_id', cs.id)
        .order('sequence_order');
      
      if (unitsError) {
        console.error(`❌ Error fetching units for ${cs.subject?.name}:`, unitsError.message);
        continue;
      }
      
      totalUnits += units?.length || 0;
      console.log(`   📁 ${cs.subject?.name}: ${units?.length || 0} units`);
      (units || []).forEach((unit, i) => {
        console.log(`      ${i + 1}. "${unit.name}" (seq: ${unit.sequence_order || 0})`);
      });
    }
    
    // 6. Check lesson containers
    console.log('\n6. Checking lesson containers...');
    let totalLessons = 0;
    for (const cs of childSubjects) {
      const { data: units } = await supabase
        .from('units')
        .select('id, name')
        .eq('child_subject_id', cs.id);
      
      for (const unit of units || []) {
        const { data: lessons, error: lessonsError } = await supabase
          .from('lessons')
          .select('id, title, lesson_number, sequence_order, created_at')
          .eq('unit_id', unit.id)
          .order('sequence_order');
        
        if (lessonsError) {
          console.error(`❌ Error fetching lessons for unit ${unit.name}:`, lessonsError.message);
          continue;
        }
        
        totalLessons += lessons?.length || 0;
        if (lessons && lessons.length > 0) {
          console.log(`   📚 ${cs.subject?.name} > ${unit.name}: ${lessons.length} lesson containers`);
          lessons.forEach((lesson, i) => {
            console.log(`      ${i + 1}. "${lesson.title}" (${lesson.lesson_number || 'no #'})`);
          });
        }
      }
    }
    
    // 7. Check materials
    console.log('\n7. Checking materials...');
    const childSubjectIds = childSubjects.map(cs => cs.id);
    const { data: materials, error: materialsError } = await supabase
      .from('materials')
      .select(`
        id, title, content_type, status, due_date, completed_at,
        lesson_id, child_subject_id, created_at
      `)
      .in('child_subject_id', childSubjectIds)
      .order('created_at', { ascending: false });
    
    if (materialsError) {
      console.error('❌ Error fetching materials:', materialsError.message);
    } else {
      console.log(`📄 Found ${materials?.length || 0} total materials:`);
      (materials || []).forEach((material, i) => {
        const subject = childSubjects.find(cs => cs.id === material.child_subject_id);
        const subjectName = subject?.custom_subject_name_override || subject?.subject?.name || 'Unknown';
        console.log(`   ${i + 1}. "${material.title}" (${material.content_type})`);
        console.log(`      Subject: ${subjectName}`);
        console.log(`      Status: ${material.status}`);
        console.log(`      Due: ${material.due_date || 'No due date'}`);
        console.log(`      Lesson Container ID: ${material.lesson_id || 'NOT ASSIGNED ⚠️'}`);
        console.log('');
      });
    }
    
    // 8. Test MCP Server directly
    console.log('\n8. Testing MCP Server directly...');
    try {
      const mcpClient = require('./src/services/mcpClient');
      
      console.log('   Testing getChildSubjects...');
      const mcpChildSubjects = await mcpClient.getChildSubjects(targetChild.id);
      console.log(`   MCP returned ${mcpChildSubjects?.length || 0} child subjects`);
      
      console.log('   Testing getCurrentMaterials...');
      const mcpMaterials = await mcpClient.getCurrentMaterials(targetChild.id);
      console.log(`   MCP returned ${mcpMaterials?.length || 0} current materials`);
      
      console.log('   Testing getUpcomingAssignments...');
      const mcpAssignments = await mcpClient.getUpcomingAssignments(targetChild.id);
      console.log(`   MCP returned ${mcpAssignments?.length || 0} upcoming assignments`);
      
      console.log('   Testing getLearningContext...');
      const mcpContext = await mcpClient.getLearningContext(targetChild.id);
      console.log('   MCP Learning Context:', {
        childSubjects: mcpContext?.childSubjects?.length || 0,
        currentMaterials: mcpContext?.currentMaterials?.length || 0,
        upcomingAssignments: mcpContext?.upcomingAssignments?.length || 0,
        hasFocus: !!mcpContext?.currentFocus,
        fallback: mcpContext?.fallback || false,
        error: mcpContext?.error || null
      });
      
      // Cleanup
      await mcpClient.disconnect();
      
    } catch (mcpError) {
      console.error('❌ MCP test failed:', mcpError.message);
      console.error('Stack:', mcpError.stack);
    }
    
    // 9. Final summary and recommendations
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL DIAGNOSIS:');
    console.log(`   Child: ${targetChild.name} (${targetChild.id})`);
    console.log(`   Subject Assignments: ${childSubjects?.length || 0}`);
    console.log(`   Units: ${totalUnits}`);
    console.log(`   Lesson Containers: ${totalLessons}`);
    console.log(`   Materials: ${materials?.length || 0}`);
    
    // Identify the root cause
    if (!childSubjects || childSubjects.length === 0) {
      console.log('\n❌ ROOT CAUSE: No subjects assigned to child');
      console.log('🔧 SOLUTION:');
      console.log('   1. Go to Subject Management in your frontend');
      console.log('   2. Assign at least one subject to this child');
      console.log('   3. Then test again');
    } else if (totalUnits === 0) {
      console.log('\n❌ ROOT CAUSE: No units created');
      console.log('🔧 SOLUTION:');
      console.log('   1. Go to Dashboard in your frontend');
      console.log('   2. Click "Manage Units" for a subject');
      console.log('   3. Create at least one unit');
    } else if (totalLessons === 0) {
      console.log('\n❌ ROOT CAUSE: No lesson containers created');
      console.log('🔧 SOLUTION:');
      console.log('   1. Create units first (if not done)');
      console.log('   2. When adding materials, select a unit');
      console.log('   3. Create lesson containers to organize materials');
    } else if (!materials || materials.length === 0) {
      console.log('\n❌ ROOT CAUSE: No materials added');
      console.log('🔧 SOLUTION:');
      console.log('   1. Go to Dashboard > Add New Material');
      console.log('   2. Upload some files for the child');
      console.log('   3. Assign them to units and lesson containers');
    } else {
      const orphanedMaterials = materials.filter(m => !m.lesson_id);
      if (orphanedMaterials.length > 0) {
        console.log('\n⚠️  PARTIAL ISSUE: Some materials not assigned to lesson containers');
        console.log(`   ${orphanedMaterials.length} materials need lesson container assignment`);
      } else {
        console.log('\n✅ Database structure looks good!');
        console.log('   MCP should be working. Check MCP server logs for connection issues.');
      }
    }
    
  } catch (error) {
    console.error('💥 Unexpected error during debug:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the debug
debugDatabase().then(() => {
  console.log('\n🏁 Debug complete. Check the analysis above.');
  process.exit(0);
}).catch(error => {
  console.error('💥 Debug script crashed:', error);
  process.exit(1);
});