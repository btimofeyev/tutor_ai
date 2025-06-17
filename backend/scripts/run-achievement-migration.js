// Run achievement tracking migration
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runAchievementMigration() {
  console.log('🚀 Running achievement tracking migration...');
  
  try {
    // Read the migration SQL
    const migrationPath = path.join(__dirname, '../migrations/add_achievement_tracking.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
    
    console.log('✅ Achievement tracking migration completed successfully!');
    console.log('📊 Added features:');
    console.log('   - Achievement points tracking');
    console.log('   - Last achievement storage');
    console.log('   - Achievement history table');
    console.log('   - Proper indexes for performance');
    
  } catch (error) {
    console.error('💥 Migration error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runAchievementMigration();
}

module.exports = runAchievementMigration;