// backend/src/controllers/scheduleController.js
const supabase = require('../utils/supabaseClient');
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Helper to get parent_id from request header
function getParentId(req) {
  return req.header('x-parent-id');
}

// Helper to verify parent owns the child
async function verifyChildOwnership(parentId, childId) {
  try {
    const { data, error } = await supabase
      .from('children')
      .select('id')
      .eq('id', childId)
      .eq('parent_id', parentId)
      .single();

    return !error && data;
  } catch (error) {
    console.error('Error verifying child ownership:', error);
    return false;
  }
}

// Get schedule entries for a child
const getScheduleEntries = async (req, res) => {
  try {
    const parentId = getParentId(req);
    const { child_id } = req.params;

    if (!parentId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify parent owns this child
    if (!(await verifyChildOwnership(parentId, child_id))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // First, check if schedule_entries table exists
    const { data: scheduleEntries, error } = await supabase
      .from('schedule_entries')
      .select('*')
      .eq('child_id', child_id)
      .order('scheduled_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching schedule entries:', error);
      
      // If table doesn't exist, return empty array instead of error
      if (error.code === '42P01') { // Table doesn't exist
        return res.json([]);
      }
      
      return res.status(500).json({ error: 'Failed to fetch schedule entries' });
    }

    // Return the schedule entries as-is (subject_name is already in the table)
    res.json(scheduleEntries || []);
  } catch (error) {
    console.error('Error in getScheduleEntries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new schedule entry
const createScheduleEntry = async (req, res) => {
  try {
    const parentId = getParentId(req);
    const {
      child_id,
      material_id,
      subject_name,
      scheduled_date,
      start_time,
      duration_minutes,
      notes,
      created_by = 'parent'
    } = req.body;

    if (!parentId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify parent owns this child
    if (!(await verifyChildOwnership(parentId, child_id))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate required fields
    if (!child_id || !scheduled_date || !start_time || !duration_minutes) {
      return res.status(400).json({ 
        error: 'Missing required fields: child_id, scheduled_date, start_time, duration_minutes' 
      });
    }

    // Validate that either material_id or subject_name is provided
    if (!material_id && !subject_name) {
      return res.status(400).json({ 
        error: 'Either material_id or subject_name must be provided' 
      });
    }

    // If material_id is provided, verify it exists and belongs to this child
    // For now, skip complex validation until we have proper lesson structure
    if (material_id) {
      console.log('Material ID provided:', material_id);
      // TODO: Add proper material validation when lesson schema is confirmed
    }

    // Check for scheduling conflicts
    const { data: conflicts, error: conflictError } = await supabase
      .from('schedule_entries')
      .select('id, start_time, duration_minutes')
      .eq('child_id', child_id)
      .eq('scheduled_date', scheduled_date)
      .neq('status', 'skipped');

    if (conflictError) {
      console.error('Error checking conflicts:', conflictError);
      return res.status(500).json({ error: 'Failed to check scheduling conflicts' });
    }

    // Check for overlapping time slots
    const newStartTime = new Date(`1970-01-01T${start_time}`);
    const newEndTime = new Date(newStartTime.getTime() + (duration_minutes * 60000));

    const hasConflict = conflicts.some(existing => {
      const existingStartTime = new Date(`1970-01-01T${existing.start_time}`);
      const existingEndTime = new Date(existingStartTime.getTime() + (existing.duration_minutes * 60000));
      
      return (newStartTime < existingEndTime && newEndTime > existingStartTime);
    });

    if (hasConflict) {
      return res.status(409).json({ 
        error: 'Scheduling conflict: This time slot overlaps with an existing entry' 
      });
    }

    // Create the schedule entry
    const { data: newEntry, error: createError } = await supabase
      .from('schedule_entries')
      .insert({
        child_id,
        material_id,
        subject_name,
        scheduled_date,
        start_time,
        duration_minutes,
        notes,
        created_by,
        status: 'scheduled'
      })
      .select('*')
      .single();

    if (createError) {
      console.error('Error creating schedule entry:', createError);
      return res.status(500).json({ error: 'Failed to create schedule entry' });
    }

    res.status(201).json(newEntry);
  } catch (error) {
    console.error('Error in createScheduleEntry:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a schedule entry
const updateScheduleEntry = async (req, res) => {
  try {
    const parentId = getParentId(req);
    const { id } = req.params;
    const updateData = req.body;

    if (!parentId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify parent owns this schedule entry
    const { data: entryData, error: entryError } = await supabase
      .from('schedule_entries')
      .select(`
        *,
        child:child_id (
          id,
          parent_id
        )
      `)
      .eq('id', id)
      .single();

    if (entryError || !entryData || entryData.child.parent_id !== parentId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Remove fields that shouldn't be updated directly
    const { child_id, created_at, ...allowedUpdates } = updateData;

    // Update the entry
    const { data: updatedEntry, error: updateError } = await supabase
      .from('schedule_entries')
      .update(allowedUpdates)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating schedule entry:', updateError);
      return res.status(500).json({ error: 'Failed to update schedule entry' });
    }

    res.json(updatedEntry);
  } catch (error) {
    console.error('Error in updateScheduleEntry:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a schedule entry
const deleteScheduleEntry = async (req, res) => {
  try {
    const parentId = getParentId(req);
    const { id } = req.params;

    if (!parentId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify parent owns this schedule entry
    const { data: entryData, error: entryError } = await supabase
      .from('schedule_entries')
      .select(`
        id,
        child:child_id (
          id,
          parent_id
        )
      `)
      .eq('id', id)
      .single();

    if (entryError || !entryData || entryData.child.parent_id !== parentId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete the entry
    const { error: deleteError } = await supabase
      .from('schedule_entries')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting schedule entry:', deleteError);
      return res.status(500).json({ error: 'Failed to delete schedule entry' });
    }

    res.json({ message: 'Schedule entry deleted successfully' });
  } catch (error) {
    console.error('Error in deleteScheduleEntry:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get schedule preferences for a child
const getSchedulePreferences = async (req, res) => {
  try {
    const parentId = getParentId(req);
    const { child_id } = req.params;

    if (!parentId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify parent owns this child
    if (!(await verifyChildOwnership(parentId, child_id))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: preferences, error } = await supabase
      .from('child_schedule_preferences')
      .select('*')
      .eq('child_id', child_id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching schedule preferences:', error);
      return res.status(500).json({ error: 'Failed to fetch schedule preferences' });
    }

    // Return default preferences if none exist
    if (!preferences) {
      const defaultPreferences = {
        child_id,
        preferred_start_time: '09:00',
        preferred_end_time: '15:00',
        max_daily_study_minutes: 240,
        break_duration_minutes: 15,
        difficult_subjects_morning: true,
        study_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      };
      return res.json(defaultPreferences);
    }

    res.json(preferences);
  } catch (error) {
    console.error('Error in getSchedulePreferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update schedule preferences for a child
const updateSchedulePreferences = async (req, res) => {
  try {
    const parentId = getParentId(req);
    const { child_id } = req.params;
    const preferencesData = req.body;

    if (!parentId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify parent owns this child
    if (!(await verifyChildOwnership(parentId, child_id))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if preferences already exist
    const { data: existingPreferences } = await supabase
      .from('child_schedule_preferences')
      .select('id')
      .eq('child_id', child_id)
      .single();

    let result;
    if (existingPreferences) {
      // Update existing preferences
      const { data, error } = await supabase
        .from('child_schedule_preferences')
        .update(preferencesData)
        .eq('child_id', child_id)
        .select('*')
        .single();
      
      result = { data, error };
    } else {
      // Create new preferences
      const { data, error } = await supabase
        .from('child_schedule_preferences')
        .insert({ ...preferencesData, child_id })
        .select('*')
        .single();
      
      result = { data, error };
    }

    if (result.error) {
      console.error('Error updating schedule preferences:', result.error);
      return res.status(500).json({ error: 'Failed to update schedule preferences' });
    }

    res.json(result.data);
  } catch (error) {
    console.error('Error in updateSchedulePreferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Generate AI schedule (placeholder - will implement AI logic later)
const generateAISchedule = async (req, res) => {
  try {
    const parentId = getParentId(req);
    const { child_id, start_date, end_date, focus_subjects } = req.body;

    if (!parentId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify parent owns this child
    if (!(await verifyChildOwnership(parentId, child_id))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // For now, return a placeholder response
    // TODO: Implement actual AI scheduling logic
    const aiScheduleSuggestions = [
      {
        material_id: null,
        subject_name: 'Math',
        scheduled_date: '2025-06-16',
        start_time: '09:00',
        duration_minutes: 60,
        created_by: 'ai_suggestion',
        notes: 'AI suggested optimal time for math based on difficulty level'
      },
      {
        material_id: null,
        subject_name: 'Science',
        scheduled_date: '2025-06-16',
        start_time: '10:30',
        duration_minutes: 45,
        created_by: 'ai_suggestion',
        notes: 'Science lab activity - good follow-up to math'
      }
    ];

    res.json({
      suggestions: aiScheduleSuggestions,
      reasoning: 'Schedule optimized for morning focus on challenging subjects, with appropriate break times.',
      confidence: 0.85
    });
  } catch (error) {
    console.error('Error in generateAISchedule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getScheduleEntries,
  createScheduleEntry,
  updateScheduleEntry,
  deleteScheduleEntry,
  getSchedulePreferences,
  updateSchedulePreferences,
  generateAISchedule
};