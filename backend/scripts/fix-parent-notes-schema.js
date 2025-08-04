require('dotenv').config();
const supabase = require('../src/utils/supabaseClient');

async function fixParentNotesSchema() {
  try {
    console.log('🔧 Fixing parent_notes table schema to allow NULL child_id for global notes...');
    
    // The table exists but has a NOT NULL constraint on child_id
    // We need to remove this constraint to allow global notes (child_id = NULL)
    
    console.log('❌ The parent_notes table has a NOT NULL constraint on child_id');
    console.log('❌ This prevents storing global notes (which should have child_id = NULL)');
    console.log('');
    console.log('📋 Please run this SQL in your Supabase SQL Editor to fix the schema:');
    console.log('----------------------------------------');
    console.log('-- Remove NOT NULL constraint from child_id to allow global notes');
    console.log('ALTER TABLE parent_notes ALTER COLUMN child_id DROP NOT NULL;');
    console.log('');
    console.log('-- Add a comment to document the change');
    console.log('COMMENT ON COLUMN parent_notes.child_id IS \'References a specific child, or NULL for global parent notes\';');
    console.log('----------------------------------------');
    console.log('');
    console.log('💡 After running this SQL, global notes will work properly!');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

fixParentNotesSchema();