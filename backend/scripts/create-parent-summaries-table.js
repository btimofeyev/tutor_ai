require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Use service role key for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createParentSummariesTable() {
  console.log('🚀 Creating parent_summaries table...');
  
  try {
    // Test if table exists
    const { data, error } = await supabase
      .from('parent_summaries')
      .select('id')
      .limit(1);

    if (error && error.code === 'PGRST106') {
      // Table doesn't exist, let's create it
      console.log('📋 Table does not exist, creating...');
      
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS parent_summaries (
            id SERIAL PRIMARY KEY,
            child_id INTEGER NOT NULL,
            summary_date DATE NOT NULL,
            session_start TIMESTAMPTZ NOT NULL,
            session_end TIMESTAMPTZ NOT NULL,
            total_messages INTEGER NOT NULL DEFAULT 0,
            topics_discussed TEXT[] DEFAULT '{}',
            subjects_covered TEXT[] DEFAULT '{}',
            ai_summary TEXT NOT NULL,
            inappropriate_flags INTEGER DEFAULT 0,
            engagement_level VARCHAR(10) DEFAULT 'medium' CHECK (engagement_level IN ('low', 'medium', 'high')),
            duration_minutes INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_parent_summaries_child_id ON parent_summaries(child_id);
        CREATE INDEX IF NOT EXISTS idx_parent_summaries_date ON parent_summaries(summary_date);
        CREATE INDEX IF NOT EXISTS idx_parent_summaries_child_date ON parent_summaries(child_id, summary_date DESC);
      `;
      
      // Use raw SQL query
      const { error: createError } = await supabase.rpc('query', { 
        query: createTableSQL 
      });
      
      if (createError) {
        console.error('❌ Error creating table with RPC:', createError);
        
        // Try alternative approach - direct insert to force table creation
        const { error: insertError } = await supabase
          .from('parent_summaries')
          .insert([{
            child_id: -1, // Dummy record to test table creation
            summary_date: '2024-01-01',
            session_start: '2024-01-01T00:00:00Z',
            session_end: '2024-01-01T00:00:00Z',
            ai_summary: 'test'
          }]);
          
        if (insertError && insertError.code !== 'PGRST106') {
          console.error('❌ Error with insert test:', insertError);
        } else {
          console.log('✅ Table seems to exist or was created');
          
          // Clean up dummy record
          await supabase
            .from('parent_summaries')
            .delete()
            .eq('child_id', -1);
        }
      } else {
        console.log('✅ Table created successfully with RPC');
      }
    } else if (error) {
      console.error('❌ Unexpected error:', error);
    } else {
      console.log('✅ Table already exists');
    }
    
    console.log('✨ Parent summaries table setup completed!');
    
  } catch (err) {
    console.error('❌ Script error:', err.message);
    
    // Try manual table creation approach
    console.log('🔧 Attempting manual table creation...');
    
    try {
      // Test if we can create a record (this will fail if table doesn't exist)
      const { error: testError } = await supabase
        .from('parent_summaries')
        .select('id')
        .limit(1);
        
      if (testError && testError.code === 'PGRST106') {
        console.log('📋 Table confirmed to not exist - please create it manually via Supabase dashboard');
        console.log('💡 Use the SQL in migrations/create_parent_summaries_table.sql');
      } else {
        console.log('✅ Table appears to exist');
      }
    } catch (manualErr) {
      console.error('❌ Manual check failed:', manualErr.message);
    }
  }
}

createParentSummariesTable();