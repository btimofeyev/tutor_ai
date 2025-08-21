require('dotenv').config();
const supabase = require('../src/utils/supabaseClient');

async function cleanupTables() {
  console.log('🧹 Starting manual database cleanup...');
  
  const tablesToDrop = [
    'public.chat_cleanup_reports',
    'public.chat_interactions', 
    'public.chat_message_exports',
    'public.child_learning_memories',
    'public.child_learning_profiles',
    'public.conversation_summaries',
    'public.conversation_summaries_archive',
    'public.daily_maintenance_reports',
    'public.parent_conversation_notifications',
    'public.safety_reports',
    'public.workspace_problem_completions',
    'public.practice_attempts',
    'public.practice_sessions',
    'public.chat_messages'
  ];
  
  try {
    // Drop each table individually
    for (const table of tablesToDrop) {
      console.log(`Dropping table: ${table}`);
      
      const { error } = await supabase
        .from(table.replace('public.', ''))
        .select('id')
        .limit(1);
        
      if (!error) {
        console.log(`✅ Table ${table} exists and will be cleaned`);
        // Since we can't DROP via Supabase client, we'll delete all rows
        const { error: deleteError } = await supabase
          .from(table.replace('public.', ''))
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
          
        if (deleteError) {
          console.warn(`Warning deleting from ${table}:`, deleteError.message);
        } else {
          console.log(`✅ Cleared all data from ${table}`);
        }
      } else {
        console.log(`Table ${table} doesn't exist or is already removed`);
      }
    }
    
    console.log('🎉 Database cleanup completed!');
    
  } catch (err) {
    console.error('❌ Database cleanup failed:', err.message);
  }
}

cleanupTables();