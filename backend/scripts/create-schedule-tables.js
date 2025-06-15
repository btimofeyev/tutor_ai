// scripts/create-schedule-tables.js
require('dotenv').config();
const supabase = require('../src/utils/supabaseClient');

async function createScheduleTables() {
  try {
    console.log('🚀 Creating schedule tables...');
    
    // Create schedule_entries table
    console.log('Creating schedule_entries table...');
    const { error: scheduleEntriesError } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS schedule_entries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
          material_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
          subject_name VARCHAR(255),
          scheduled_date DATE NOT NULL,
          start_time TIME NOT NULL,
          duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
          status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'skipped')),
          created_by VARCHAR(20) DEFAULT 'parent' CHECK (created_by IN ('parent', 'ai_suggestion')),
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (scheduleEntriesError) {
      console.error('Error creating schedule_entries table:', scheduleEntriesError);
    } else {
      console.log('✅ schedule_entries table created successfully');
    }

    // Create child_schedule_preferences table
    console.log('Creating child_schedule_preferences table...');
    const { error: preferencesError } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS child_schedule_preferences (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE UNIQUE,
          preferred_start_time TIME DEFAULT '09:00',
          preferred_end_time TIME DEFAULT '15:00',
          max_daily_study_minutes INTEGER DEFAULT 240 CHECK (max_daily_study_minutes > 0),
          break_duration_minutes INTEGER DEFAULT 15 CHECK (break_duration_minutes >= 0),
          difficult_subjects_morning BOOLEAN DEFAULT true,
          study_days JSONB DEFAULT '["monday","tuesday","wednesday","thursday","friday"]',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (preferencesError) {
      console.error('Error creating child_schedule_preferences table:', preferencesError);
    } else {
      console.log('✅ child_schedule_preferences table created successfully');
    }

    // Create indexes
    console.log('Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_schedule_entries_child_id ON schedule_entries(child_id);',
      'CREATE INDEX IF NOT EXISTS idx_schedule_entries_date ON schedule_entries(scheduled_date);',
      'CREATE INDEX IF NOT EXISTS idx_schedule_entries_status ON schedule_entries(status);',
      'CREATE INDEX IF NOT EXISTS idx_schedule_entries_child_date ON schedule_entries(child_id, scheduled_date);'
    ];

    for (const indexSQL of indexes) {
      const { error: indexError } = await supabase.rpc('exec_sql', {
        sql_query: indexSQL
      });
      if (indexError) {
        console.error('Error creating index:', indexError);
      }
    }

    console.log('✅ Indexes created successfully');

    // Create update trigger function
    console.log('Creating update trigger function...');
    const { error: functionError } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
      `
    });

    if (functionError) {
      console.error('Error creating update function:', functionError);
    } else {
      console.log('✅ Update function created successfully');
    }

    // Create triggers
    console.log('Creating triggers...');
    const triggers = [
      `CREATE TRIGGER update_schedule_entries_updated_at 
       BEFORE UPDATE ON schedule_entries 
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,
      `CREATE TRIGGER update_schedule_preferences_updated_at 
       BEFORE UPDATE ON child_schedule_preferences 
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`
    ];

    for (const triggerSQL of triggers) {
      const { error: triggerError } = await supabase.rpc('exec_sql', {
        sql_query: triggerSQL
      });
      if (triggerError && !triggerError.message.includes('already exists')) {
        console.error('Error creating trigger:', triggerError);
      }
    }

    console.log('✅ Triggers created successfully');
    console.log('🎉 All schedule tables and related objects created successfully!');

  } catch (error) {
    console.error('❌ Error creating schedule tables:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  createScheduleTables();
}

module.exports = createScheduleTables;