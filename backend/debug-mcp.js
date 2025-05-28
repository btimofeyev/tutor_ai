// Enhanced MCP Database Debug Script - Focus on Grade Data
// Run: node enhanced-mcp-debug.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 MCP Grade Debug - Environment Check:');
console.log('   SUPABASE_URL:', supabaseUrl ? 'SET ✓' : 'MISSING ❌');
console.log('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'SET ✓' : 'MISSING ❌');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugGradeData() {
  console.log('\n📊 === DETAILED GRADE DATA ANALYSIS ===');
  console.log('='.repeat(60));
  
  try {
    // 1. Get all children
    const { data: allChildren, error: childrenError } = await supabase
      .from('children')
      .select('id, name, grade')
      .order('created_at', { ascending: false });
    
    if (childrenError) {
      console.error('❌ Error fetching children:', childrenError);
      return;
    }
    
    console.log(`👨‍👩‍👧‍👦 Found ${allChildren?.length || 0} children`);
    
    if (!allChildren || allChildren.length === 0) {
      console.log('❌ No children found! Create a child first.');
      return;
    }
    
    // 2. For each child, analyze their grade data
    for (const child of allChildren) {
      console.log(`\n👤 === ANALYZING CHILD: ${child.name} (${child.id}) ===`);
      console.log('-'.repeat(50));
      
      // Get child subjects
      const { data: childSubjects, error: csError } = await supabase
        .from('child_subjects')
        .select(`
          id,
          custom_subject_name_override,
          subject:subject_id (
            id,
            name
          )
        `)
        .eq('child_id', child.id);
      
      if (csError) {
        console.error(`❌ Error getting child subjects:`, csError);
        continue;
      }
      
      console.log(`📚 Child has ${childSubjects?.length || 0} subjects assigned`);
      
      if (!childSubjects || childSubjects.length === 0) {
        console.log('⚠️  No subjects assigned - no grade data possible');
        continue;
      }
      
      // 3. For each subject, get detailed material and grade info
      const childSubjectIds = childSubjects.map(cs => cs.id);
      
      // Get ALL materials for this child
      const { data: allMaterials, error: materialsError } = await supabase
        .from('materials')
        .select(`
          id,
          title,
          content_type,
          status,
          completed_at,
          grade_value,
          grade_max_value,
          child_subject_id,
          lesson:lesson_id (
            id,
            title,
            unit:unit_id (
              id,
              name,
              child_subject:child_subject_id (
                id,
                subject:subject_id (name),
                custom_subject_name_override
              )
            )
          ),
          created_at
        `)
        .in('child_subject_id', childSubjectIds)
        .order('created_at', { ascending: false });
      
      if (materialsError) {
        console.error(`❌ Error getting materials:`, materialsError);
        continue;
      }
      
      console.log(`📄 Found ${allMaterials?.length || 0} total materials`);
      
      if (!allMaterials || allMaterials.length === 0) {
        console.log('⚠️  No materials found - no grade data possible');
        continue;
      }
      
      // 4. Analyze materials by subject
      const subjectAnalysis = {};
      
      for (const material of allMaterials) {
        const subjectName = material.lesson?.unit?.child_subject?.custom_subject_name_override || 
                           material.lesson?.unit?.child_subject?.subject?.name || 'Unknown';
        
        if (!subjectAnalysis[subjectName]) {
          subjectAnalysis[subjectName] = {
            totalMaterials: 0,
            completedMaterials: 0,
            gradedMaterials: 0,
            totalPoints: 0,
            earnedPoints: 0,
            grades: [],
            materials: []
          };
        }
        
        const subject = subjectAnalysis[subjectName];
        subject.totalMaterials++;
        subject.materials.push({
          title: material.title,
          type: material.content_type,
          completed: !!material.completed_at,
          grade: material.grade_value,
          maxGrade: material.grade_max_value,
          status: material.status
        });
        
        if (material.completed_at) {
          subject.completedMaterials++;
        }
        
        if (material.grade_value && material.grade_max_value) {
          subject.gradedMaterials++;
          const points = parseFloat(material.grade_value);
          const maxPoints = parseFloat(material.grade_max_value);
          
          subject.earnedPoints += points;
          subject.totalPoints += maxPoints;
          
          const percentage = (points / maxPoints) * 100;
          subject.grades.push({
            material: material.title,
            points: points,
            maxPoints: maxPoints,
            percentage: percentage.toFixed(1)
          });
        }
      }
      
      // 5. Display detailed analysis
      console.log('\n📊 SUBJECT-BY-SUBJECT GRADE ANALYSIS:');
      for (const [subjectName, analysis] of Object.entries(subjectAnalysis)) {
        console.log(`\n  📖 ${subjectName.toUpperCase()}:`);
        console.log(`     Total Materials: ${analysis.totalMaterials}`);
        console.log(`     Completed: ${analysis.completedMaterials}`);
        console.log(`     With Grades: ${analysis.gradedMaterials}`);
        
        if (analysis.gradedMaterials > 0) {
          const overallPercentage = (analysis.earnedPoints / analysis.totalPoints) * 100;
          console.log(`     📈 CALCULATED AVERAGE: ${overallPercentage.toFixed(1)}% (${analysis.earnedPoints}/${analysis.totalPoints} points)`);
          
          console.log(`     Individual Grades:`);
          analysis.grades.forEach((grade, i) => {
            console.log(`       ${i + 1}. ${grade.material}: ${grade.percentage}% (${grade.points}/${grade.maxPoints})`);
          });
        } else {
          console.log(`     📈 NO GRADES YET: 0% (no graded materials)`);
        }
        
        // Show recent materials
        console.log(`     Recent Materials:`);
        analysis.materials.slice(0, 3).forEach((mat, i) => {
          const gradeInfo = mat.grade && mat.maxGrade ? 
            `${mat.grade}/${mat.maxGrade} (${((mat.grade/mat.maxGrade)*100).toFixed(1)}%)` : 
            'Not graded';
          console.log(`       ${i + 1}. ${mat.title} (${mat.type}) - ${mat.completed ? 'Completed' : 'In Progress'} - ${gradeInfo}`);
        });
      }
      
      // 6. Test MCP Server calculations
      console.log('\n🤖 === TESTING MCP SERVER CALCULATIONS ===');
      
      try {
        // Simulate what the MCP server should calculate
        for (const [subjectName, analysis] of Object.entries(subjectAnalysis)) {
          if (analysis.gradedMaterials > 0) {
            const mcpCalculatedAverage = (analysis.earnedPoints / analysis.totalPoints) * 100;
            console.log(`MCP Should Calculate ${subjectName}: ${mcpCalculatedAverage.toFixed(1)}%`);
          } else {
            console.log(`MCP Should Calculate ${subjectName}: 0% (no grades)`);
          }
        }
        
        // Check if there's a mismatch
        console.log('\n🔍 POTENTIAL ISSUES TO CHECK:');
        console.log('1. Are materials properly linked to child_subjects?');
        console.log('2. Are grade_value and grade_max_value stored as numbers?');
        console.log('3. Is the MCP server using the right child_subject_ids?');
        console.log('4. Is there caching in the MCP client causing stale data?');
        
      } catch (mcpError) {
        console.error('❌ MCP test failed:', mcpError.message);
      }
    }
    
    // 7. Raw data verification queries
    console.log('\n🔍 === RAW DATA VERIFICATION ===');
    
    // Check for any materials with grades
    const { data: gradedMaterials, error: gradedError } = await supabase
      .from('materials')
      .select(`
        id,
        title,
        grade_value,
        grade_max_value,
        child_subject_id,
        lesson:lesson_id (
          unit:unit_id (
            child_subject:child_subject_id (
              subject:subject_id (name),
              custom_subject_name_override
            )
          )
        )
      `)
      .not('grade_value', 'is', null)
      .not('grade_max_value', 'is', null);
    
    if (!gradedError && gradedMaterials) {
      console.log(`📊 Found ${gradedMaterials.length} materials with grades:`);
      gradedMaterials.forEach((mat, i) => {
        const subjectName = mat.lesson?.unit?.child_subject?.custom_subject_name_override || 
                           mat.lesson?.unit?.child_subject?.subject?.name || 'Unknown';
        const percentage = ((parseFloat(mat.grade_value) / parseFloat(mat.grade_max_value)) * 100).toFixed(1);
        console.log(`  ${i + 1}. ${mat.title} (${subjectName}): ${mat.grade_value}/${mat.grade_max_value} = ${percentage}%`);
      });
    }
    
    // 8. Check grade calculation logic
    console.log('\n🧮 === GRADE CALCULATION VERIFICATION ===');
    
    // Test the exact calculation the MCP server should be doing
    const testChildId = allChildren[0].id;
    
    const { data: testSubjects } = await supabase
      .from('child_subjects')
      .select('id, subject:subject_id(name), custom_subject_name_override')
      .eq('child_id', testChildId);
    
    if (testSubjects) {
      for (const testSubject of testSubjects) {
        const subjectName = testSubject.custom_subject_name_override || testSubject.subject.name;
        
        const { data: subjectMaterials } = await supabase
          .from('materials')
          .select('grade_value, grade_max_value, title')
          .eq('child_subject_id', testSubject.id)
          .not('grade_value', 'is', null)
          .not('grade_max_value', 'is', null);
        
        if (subjectMaterials && subjectMaterials.length > 0) {
          let totalEarned = 0;
          let totalPossible = 0;
          
          subjectMaterials.forEach(mat => {
            totalEarned += parseFloat(mat.grade_value);
            totalPossible += parseFloat(mat.grade_max_value);
          });
          
          const calculatedAverage = (totalEarned / totalPossible) * 100;
          
          console.log(`${subjectName}:`);
          console.log(`  Materials with grades: ${subjectMaterials.length}`);
          console.log(`  Total earned: ${totalEarned}`);
          console.log(`  Total possible: ${totalPossible}`);
          console.log(`  🎯 CORRECT AVERAGE: ${calculatedAverage.toFixed(1)}%`);
          console.log(`  Individual scores:`);
          subjectMaterials.forEach(mat => {
            console.log(`    - ${mat.title}: ${mat.grade_value}/${mat.grade_max_value}`);
          });
        } else {
          console.log(`${subjectName}: No graded materials (should show 0% or N/A)`);
        }
      }
    }
    
  } catch (error) {
    console.error('💥 Debug script error:', error);
    console.error('Stack:', error.stack);
  }
}

// Run the debug
debugGradeData().then(() => {
  console.log('\n🏁 Grade debug complete. Check the analysis above for discrepancies.');
  process.exit(0);
}).catch(error => {
  console.error('💥 Debug script crashed:', error);
  process.exit(1);
});