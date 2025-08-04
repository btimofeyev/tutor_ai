require('dotenv').config();
const fs = require('fs');
const path = require('path');
const supabase = require('../src/utils/supabaseClient');

async function runMigration(migrationFile) {
  try {
    console.log(`Running migration: ${migrationFile}`);
    
    const migrationPath = path.join(__dirname, '../migrations', migrationFile);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Executing SQL...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }
    
    console.log('Migration completed successfully!');
    console.log('Result:', data);
  } catch (err) {
    console.error('Error running migration:', err.message);
    process.exit(1);
  }
}

// Get migration file from command line argument
const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Please provide a migration file name');
  console.error('Usage: node run-migration.js <migration-file.sql>');
  process.exit(1);
}

runMigration(migrationFile);