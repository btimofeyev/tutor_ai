// Test the exact lesson query that the MCP server should be running
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testLessonQuery() {
  console.log('🧪 Testing Lesson Query Directly...\n');
  
  const childId = '7aa05bdd-e5be-4027-b255-f576583788c7';
  const childSubjectIds = [
    'd2c8eec4-e1d6-4503-89a8-e0d47308471a',
    '8e950479-d1b6-4d7e-b165-35cfab693b9d',
    'bbe9e917-97ca-48c0-8a9e-61f6d9c46430',
    '279560bb-6694-48dc-bdad-b566d56c6f71'
  ];
  
  try {
    console.log('🔍 Testing exact MCP server lesson query...');
    
    const { data, error } = await supabase
      .from('materials')
      .select(`
        id, title, description, due_date, created_at, content_type,
        child_subject:child_subject_id(
          subject:subject_id(name),
          custom_subject_name_override
        )
      `)
      .in('child_subject_id', childSubjectIds)
      .eq('content_type', 'lesson')
      .order('created_at', { ascending: true })
      .limit(20);
    
    console.log('📚 Query result:');
    console.log('- Error:', error);
    console.log('- Data count:', data?.length || 0);
    
    if (data && data.length > 0) {
      console.log('\n✅ Found lessons:');
      data.slice(0, 5).forEach((lesson, i) => {
        const subjectName = lesson.child_subject?.subject?.name || 
                           lesson.child_subject?.custom_subject_name_override || 'Unknown';
        console.log(`${i + 1}. ${lesson.title} (${subjectName})`);
        if (lesson.due_date) {
          console.log(`   Due: ${lesson.due_date}`);
        }
      });
      if (data.length > 5) {
        console.log(`   ... and ${data.length - 5} more lessons`);
      }
    } else {
      console.log('❌ No lessons found');
    }
    
  } catch (error) {
    console.error('❌ Query failed:', error);
  }
}

testLessonQuery();