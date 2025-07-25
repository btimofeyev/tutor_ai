// backend/src/controllers/scheduleController.js
const supabase = require('../utils/supabaseClient');

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

    // Fetch schedule entries with proper PostgREST join syntax
    const { data: scheduleEntries, error } = await supabase
      .from('schedule_entries')
      .select(`
        *,
        lessons!material_id(
          id,
          title
        )
      `)
      .eq('child_id', child_id)
      .order('scheduled_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching schedule entries:', error);
      
      // If table doesn't exist, return empty array instead of error
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.log('Schedule entries table does not exist. Returning empty array.');
        return res.json([]);
      }
      
      // If join fails, try simpler query without joins
      if (error.message?.includes('foreign key') || error.message?.includes('relation')) {
        console.log('Join failed, trying simple query...');
        try {
          const { data: simpleEntries, error: simpleError } = await supabase
            .from('schedule_entries')
            .select('*')
            .eq('child_id', child_id)
            .order('scheduled_date', { ascending: true })
            .order('start_time', { ascending: true });
            
          if (simpleError) {
            console.error('Simple query also failed:', simpleError);
            return res.json([]);
          }
          
          return res.json(simpleEntries || []);
        } catch (fallbackError) {
          console.error('Fallback query failed:', fallbackError);
          return res.json([]);
        }
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
    if (material_id) {
      console.log('Material ID provided:', material_id);
    }

    // Check for scheduling conflicts across ALL children for this parent
    // First get all children for this parent
    const { data: parentChildren, error: childrenError } = await supabase
      .from('children')
      .select('id')
      .eq('parent_id', parentId);

    if (childrenError) {
      console.error('Error fetching parent children:', childrenError);
      return res.status(500).json({ error: 'Failed to check family scheduling conflicts' });
    }

    const childIds = parentChildren.map(child => child.id);

    // Check for conflicts across ALL children for this parent
    const { data: conflicts, error: conflictError } = await supabase
      .from('schedule_entries')
      .select('id, start_time, duration_minutes, child_id')
      .in('child_id', childIds)
      .eq('scheduled_date', scheduled_date)
      .neq('status', 'skipped');

    if (conflictError) {
      console.error('Error checking conflicts:', conflictError);
      return res.status(500).json({ error: 'Failed to check scheduling conflicts' });
    }

    // Check for overlapping time slots across all children
    const newStartTime = new Date(`1970-01-01T${start_time}`);
    const newEndTime = new Date(newStartTime.getTime() + (duration_minutes * 60000));

    const conflictingEntries = conflicts.filter(existing => {
      const existingStartTime = new Date(`1970-01-01T${existing.start_time}`);
      const existingEndTime = new Date(existingStartTime.getTime() + (existing.duration_minutes * 60000));
      
      return (newStartTime < existingEndTime && newEndTime > existingStartTime);
    });

    if (conflictingEntries.length > 0) {
      // Get child names for the conflicting entries to provide better error message
      const conflictChildIds = conflictingEntries.map(entry => entry.child_id);
      const { data: conflictChildren } = await supabase
        .from('children')
        .select('id, name')
        .in('id', conflictChildIds);

      const conflictDetails = conflictingEntries.map(entry => {
        const child = conflictChildren.find(c => c.id === entry.child_id);
        return `${child?.name || 'Unknown Child'} at ${entry.start_time}`;
      }).join(', ');

      return res.status(409).json({ 
        error: `Scheduling conflict: This time slot overlaps with existing entries for ${conflictDetails}`,
        conflictingEntries: conflictingEntries
      });
    }

    // If material_id is provided, we need to get the lesson container ID
    // The schedule_entries.material_id field references lesson containers for backward compatibility
    // We'll store the actual material ID in the notes field as JSON for now
    let lessonContainerId = null;
    let materialMetadata = {};
    
    if (material_id) {
      
      // Look up the material to get its lesson_id (which is the lesson container)
      const { data: materialData, error: materialError } = await supabase
        .from('materials')
        .select('id, lesson_id, title')
        .eq('id', material_id)
        .single();
      
      
      if (materialError) {
        console.error('Error looking up material:', materialError);
        return res.status(400).json({ error: 'Invalid material ID provided' });
      }
      
      lessonContainerId = materialData.lesson_id;
      
      // Store the actual material ID in metadata
      materialMetadata = {
        specific_material_id: material_id,
        material_title: materialData.title
      };
      
    }

    // Combine notes with material metadata
    const enhancedNotes = notes ? 
      JSON.stringify({ user_notes: notes, ...materialMetadata }) : 
      JSON.stringify(materialMetadata);
    

    // Create the schedule entry
    const { data: newEntry, error: createError } = await supabase
      .from('schedule_entries')
      .insert({
        child_id,
        material_id: lessonContainerId, // This references the lesson container for backward compatibility
        subject_name,
        scheduled_date,
        start_time,
        duration_minutes,
        notes: Object.keys(materialMetadata).length > 0 ? enhancedNotes : notes,
        created_by,
        status: 'scheduled'
      })
      .select('*')
      .single();

    if (createError) {
      console.error('Error creating schedule entry:', createError);
      return res.status(500).json({ error: 'Failed to create schedule entry' });
    }

    console.log('=== SCHEDULE ENTRY CREATED ===');
    console.log('Created entry:', newEntry);
    console.log('Notes contain metadata:', Object.keys(materialMetadata).length > 0 ? 'YES' : 'NO');
    console.log('Material metadata:', materialMetadata);
    console.log('============================');

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
      .select(`
        *,
        lesson:lessons(
          id,
          title,
          materials(
            id,
            title,
            content_type,
            lesson_json
          )
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating schedule entry:', updateError);
      return res.status(500).json({ error: 'Failed to update schedule entry' });
    }

    // Sync with materials if status changed and material_id exists
    let syncedMaterials = 0;
    if (allowedUpdates.status && updatedEntry.material_id) {
      try {
        // Find the material associated with this schedule entry
        const { data: materials, error: materialError } = await supabase
          .from('materials')
          .select(`
            id,
            completed_at,
            lesson:lesson_id (id)
          `)
          .eq('lesson_id', updatedEntry.material_id);

        if (!materialError && materials?.length > 0) {
          // Update material completion based on schedule status
          const materialCompletedAt = updatedEntry.status === 'completed' 
            ? new Date().toISOString() 
            : null;

          const { error: syncError } = await supabase
            .from('materials')
            .update({ completed_at: materialCompletedAt })
            .eq('lesson_id', updatedEntry.material_id);

          if (!syncError) {
            syncedMaterials = materials.length;
          } else {
            console.warn('Failed to sync materials:', syncError);
          }
        }
      } catch (syncErr) {
        console.warn('Error during material sync:', syncErr);
      }
    }

    res.json({
      ...updatedEntry,
      synced_materials: syncedMaterials
    });
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
      
      // If table doesn't exist, return default preferences
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.log('Schedule preferences table does not exist. Returning default preferences.');
        const defaultPreferences = {
          child_id,
          preferred_start_time: '09:00',
          preferred_end_time: '15:00',
          break_duration_minutes: 15,
          max_subjects_per_day: 6,
          preferred_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          auto_schedule_enabled: false
        };
        return res.json(defaultPreferences);
      }
      
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






// Get unscheduled materials for a child (for manual scheduling)
const getUnscheduledMaterials = async (req, res) => {
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

    // Get all materials for the child that are not completed
    const { data: materials, error } = await supabase
      .from('materials')
      .select(`
        *,
        lesson:lesson_id (
          id,
          title,
          sequence_order,
          unit:unit_id (
            id,
            name,
            sequence_order,
            child_subject:child_subject_id (
              id,
              custom_subject_name_override,
              child_id,
              subject:subject_id (name)
            )
          )
        )
      `)
      .eq('lesson.unit.child_subject.child_id', child_id)
      .is('completed_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching unscheduled materials:', error);
      return res.status(500).json({ error: 'Failed to fetch unscheduled materials' });
    }

    // Get recent schedule entries to filter out recently scheduled materials
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { data: recentScheduleEntries } = await supabase
      .from('schedule_entries')
      .select('material_id')
      .eq('child_id', child_id)
      .gte('created_at', sevenDaysAgo);

    const recentlyScheduledMaterialIds = new Set(
      recentScheduleEntries?.map(entry => entry.material_id).filter(Boolean) || []
    );

    // Filter out recently scheduled materials
    const unscheduledMaterials = materials
      .filter(material => !recentlyScheduledMaterialIds.has(material.lesson_id))
      .map(material => {
        const subject = material.lesson?.unit?.child_subject;
        const subjectName = subject?.custom_subject_name_override || subject?.subject?.name || 'General Study';

        return {
          ...material,
          subject_name: subjectName,
          subject_id: subject?.id,
          unit_name: material.lesson?.unit?.name,
          lesson_title: material.lesson?.title,
          estimated_duration_minutes: material.lesson_json?.estimated_duration_minutes || 45
        };
      })
      .sort((a, b) => {
        return new Date(b.created_at) - new Date(a.created_at);
      });

    res.json({
      materials: unscheduledMaterials,
      total_count: unscheduledMaterials.length,
      subjects: [...new Set(unscheduledMaterials.map(m => m.subject_name))]
    });
  } catch (error) {
    console.error('Error in getUnscheduledMaterials:', error);
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
  getUnscheduledMaterials
};