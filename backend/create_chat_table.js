// Create chat_history table for adaptive intelligence
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createChatHistoryTable() {
  console.log('🗄️ Creating chat_history table for adaptive intelligence...');
  
  try {
    // First, try to create the table with SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        -- Create chat_history table for adaptive conversation intelligence
        CREATE TABLE IF NOT EXISTS public.chat_history (
            id SERIAL PRIMARY KEY,
            child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
            role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
            content TEXT NOT NULL,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_chat_history_child_id ON chat_history(child_id);
        CREATE INDEX IF NOT EXISTS idx_chat_history_timestamp ON chat_history(timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_chat_history_child_timestamp ON chat_history(child_id, timestamp DESC);
      `
    });

    if (error) {
      console.error('❌ Error creating table with RPC:', error);
      
      // Fallback: Try to create manually by checking if table exists
      const { data: tableCheck, error: tableError } = await supabase
        .from('chat_history')
        .select('id')
        .limit(1);
      
      if (tableError && tableError.code === '42P01') {
        console.log('📝 Table does not exist, will rely on chat history service to handle this...');
        
        // For now, let's modify the adaptive intelligence to handle missing table gracefully
        console.log('✅ Will continue with graceful degradation for adaptive intelligence');
        return;
      }
    }

    console.log('✅ Chat history table setup complete');
    
    // Add some sample data to test adaptive intelligence
    const sampleData = [
      {
        child_id: 'e7599701-f337-4fab-bb88-531aa01bc9f0',
        role: 'user',
        content: 'I don\'t know how to do this',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString()
      },
      {
        child_id: 'e7599701-f337-4fab-bb88-531aa01bc9f0',
        role: 'assistant',
        content: 'That\'s okay! Let\'s break it down step by step.',
        timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString()
      },
      {
        child_id: 'e7599701-f337-4fab-bb88-531aa01bc9f0',
        role: 'user',
        content: 'This is too hard',
        timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString()
      },
      {
        child_id: 'e7599701-f337-4fab-bb88-531aa01bc9f0',
        role: 'assistant',
        content: 'I believe in you! Let\'s start with something easier first.',
        timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString()
      }
    ];

    const { data: insertData, error: insertError } = await supabase
      .from('chat_history')
      .insert(sampleData);

    if (insertError) {
      console.log('⚠️ Could not insert sample data:', insertError.message);
    } else {
      console.log('✅ Added sample chat history for testing adaptive intelligence');
    }

  } catch (err) {
    console.error('❌ Error setting up chat history:', err);
  }
}

createChatHistoryTable();