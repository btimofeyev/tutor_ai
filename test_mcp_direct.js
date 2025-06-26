#!/usr/bin/env node

// Test MCP server directly with detailed logging
require('dotenv').config({ path: './backend/.env' });

async function testMCPDirect() {
  const { createClient } = require('@supabase/supabase-js');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const childId = 'b2308247-f74a-464e-ac2e-6eec90238154';
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('🔍 Testing MCP server logic directly...');
  
  try {
    // Step 1: Get child subjects (same as MCP server)
    console.log('\n1️⃣ Getting child subjects...');
    const { data: childSubjects, error: subjectsError } = await supabase
      .from('child_subjects')
      .select('id, subject:subject_id(name), custom_subject_name_override')
      .eq('child_id', childId);

    console.log('Child subjects query result:', { data: childSubjects, error: subjectsError });

    if (subjectsError) {
      console.error('❌ Child subjects error:', subjectsError);
      return;
    }

    if (!childSubjects || childSubjects.length === 0) {
      console.log('❌ No child subjects found');
      return;
    }

    const childSubjectIds = childSubjects.map(cs => cs.id);
    console.log('✅ Child subject IDs:', childSubjectIds);

    // Step 2: Query incomplete assignments (same as MCP server)
    console.log('\n2️⃣ Querying incomplete assignments...');
    const { data: incompleteData, error: incompleteError } = await supabase
      .from('materials')
      .select(`
        id, title, due_date, created_at, content_type, completed_at,
        child_subject:child_subject_id(
          subject:subject_id(name),
          custom_subject_name_override
        )
      `)
      .in('child_subject_id', childSubjectIds)
      .in('content_type', ['assignment', 'worksheet', 'quiz', 'test'])
      .is('completed_at', null)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
      .limit(20);

    console.log('Incomplete assignments query result:', { data: incompleteData, error: incompleteError });

    // Step 3: Query completed assignments (same as MCP server)
    console.log('\n3️⃣ Querying completed assignments...');
    const { data: completedData, error: completedError } = await supabase
      .from('materials')
      .select(`
        id, title, due_date, completed_at, content_type, grade_value, grade_max_value,
        child_subject:child_subject_id(
          subject:subject_id(name),
          custom_subject_name_override
        )
      `)
      .in('child_subject_id', childSubjectIds)
      .in('content_type', ['assignment', 'worksheet', 'quiz', 'test'])
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(15);

    console.log('Completed assignments query result:', { data: completedData, error: completedError });

    // Step 4: Summary
    console.log('\n📊 SUMMARY:');
    console.log(`- Child subjects found: ${childSubjects.length}`);
    console.log(`- Incomplete assignments: ${incompleteData?.length || 0}`);
    console.log(`- Completed assignments: ${completedData?.length || 0}`);

    if (completedData?.length > 0) {
      console.log('\n✅ Completed assignments found:');
      completedData.forEach(item => {
        console.log(`  - ${item.title} (completed: ${item.completed_at})`);
      });
    }

    if (incompleteData?.length > 0) {
      console.log('\n📝 Incomplete assignments found:');
      incompleteData.forEach(item => {
        console.log(`  - ${item.title} (due: ${item.due_date || 'no due date'})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testMCPDirect();