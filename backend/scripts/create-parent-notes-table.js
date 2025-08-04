require('dotenv').config();
const supabase = require('../src/utils/supabaseClient');

async function createParentNotesTable() {
  try {
    console.log('Creating parent_notes table...');
    
    // Create the table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS parent_notes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          parent_id UUID NOT NULL,
          child_id UUID,
          note_text TEXT NOT NULL,
          color VARCHAR(20) DEFAULT 'yellow',
          position_x INTEGER DEFAULT 0,
          position_y INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    const { data: tableResult, error: tableError } = await supabase
      .from('_sql')
      .select('*')
      .limit(0); // This will fail if SQL RPC isn't available
      
    console.log('Checking if table exists by attempting insert...');
    
    // Try to insert a test record to see what happens
    const { data: testResult, error: testError } = await supabase
      .from('parent_notes')
      .select('id')
      .limit(1);
    
    if (testError) {
      if (testError.message.includes('relation "parent_notes" does not exist')) {
        console.error('❌ parent_notes table does not exist in the database');
        console.error('❌ You need to create this table in your Supabase dashboard');
        console.log('\n📋 Please run this SQL in your Supabase SQL Editor:');
        console.log('----------------------------------------');
        console.log(createTableSQL);
        console.log('----------------------------------------');
        process.exit(1);
      } else {
        console.error('❌ Database connection error:', testError);
        process.exit(1);
      }
    } else {
      console.log('✅ parent_notes table already exists');
      console.log('Table check result:', testResult);
    }
    
  } catch (err) {
    console.error('❌ Error checking table:', err.message);
    process.exit(1);
  }
}

createParentNotesTable();