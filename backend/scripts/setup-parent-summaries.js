require('dotenv').config();
const { Client } = require('pg');

async function setupParentSummariesTable() {
  console.log('🚀 Setting up parent_summaries table...');
  
  // Extract connection details from Supabase URL
  const dbUrl = process.env.SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');
  const dbHost = `db.${dbUrl}.supabase.co`;
  
  const client = new Client({
    host: dbHost,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD || 'your_db_password', // You'll need to set this
  });

  try {
    await client.connect();
    console.log('📡 Connected to database');

    const createTableSQL = `
      -- Create parent_summaries table
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
      
      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_parent_summaries_child_id ON parent_summaries(child_id);
      CREATE INDEX IF NOT EXISTS idx_parent_summaries_date ON parent_summaries(summary_date);
      CREATE INDEX IF NOT EXISTS idx_parent_summaries_child_date ON parent_summaries(child_id, summary_date DESC);
      CREATE INDEX IF NOT EXISTS idx_parent_summaries_flags ON parent_summaries(child_id, inappropriate_flags) WHERE inappropriate_flags > 0;
    `;

    await client.query(createTableSQL);
    console.log('✅ Table and indexes created successfully');

    // Verify table was created
    const result = await client.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'parent_summaries' 
      ORDER BY ordinal_position
    `);
    
    console.log(`✅ Table created with ${result.rows.length} columns`);
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

  } catch (error) {
    console.error('❌ Error setting up table:', error.message);
    
    // Provide manual instructions
    console.log('\n📋 Manual Setup Instructions:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor'); 
    console.log('3. Run the SQL in: migrations/create_parent_summaries_table.sql');
    console.log('\n💡 Or use the Supabase CLI if available');
    
  } finally {
    await client.end();
  }
}

setupParentSummariesTable();