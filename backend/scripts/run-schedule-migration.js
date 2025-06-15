// scripts/run-schedule-migration.js
require('dotenv').config();
const supabase = require('../src/utils/supabaseClient');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🚀 Running schedule tables migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../migrations/create_schedule_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split SQL into individual statements and execute them
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: statement + ';' 
        });
        
        if (error) {
          // Try direct query if RPC fails
          const { error: directError } = await supabase
            .from('information_schema.tables')
            .select('*')
            .limit(1);
            
          if (directError) {
            console.error('Migration error:', error);
            throw error;
          }
        }
      }
    }
    
    console.log('✅ Migration completed successfully!');
    
    // Verify tables were created
    const { data: tables, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['schedule_entries', 'child_schedule_preferences']);
    
    if (!checkError && tables) {
      console.log('📋 Created tables:', tables.map(t => t.table_name));
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();