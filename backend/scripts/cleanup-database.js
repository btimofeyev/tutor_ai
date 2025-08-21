require('dotenv').config();
const fs = require('fs');
const path = require('path');
const supabase = require('../src/utils/supabaseClient');

async function cleanupDatabase() {
  console.log('🧹 Starting database cleanup...');
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../migrations/cleanup_ai_chat_tables.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split by individual statements and execute them
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && !stmt.startsWith('BEGIN') && !stmt.startsWith('COMMIT'));
    
    console.log(`Executing ${statements.length} cleanup statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement && statement.length > 0) {
        console.log(`Executing statement ${i + 1}...`);
        
        const { error } = await supabase.rpc('exec_raw_sql', { sql: statement });
        
        if (error && !error.message.includes('does not exist')) {
          console.warn(`Warning on statement ${i + 1}:`, error.message);
        } else if (!error) {
          console.log(`✅ Statement ${i + 1} completed`);
        }
      }
    }
    
    console.log('🎉 Database cleanup completed!');
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Database cleanup failed:', err.message);
    process.exit(1);
  }
}

cleanupDatabase();