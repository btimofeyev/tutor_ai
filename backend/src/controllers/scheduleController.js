// backend/src/controllers/scheduleController.js
const supabase = require('../utils/supabaseClient');
const AdvancedSchedulingService = require('../services/schedulingService');

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

    // Fetch schedule entries - simplified query without joins for now
    // The lesson details can be fetched separately if needed
    const { data: scheduleEntries, error } = await supabase
      .from('schedule_entries')
      .select('*')
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
      
      // If lesson_id is null, we can't create a schedule entry as the database expects a valid lesson container
      if (!lessonContainerId) {
        console.error('Material has no lesson container assigned:', materialData);
        return res.status(400).json({ 
          error: 'This material is not assigned to a lesson container. Please organize your materials first.' 
        });
      }
      
      // For now, let's skip the lesson container validation due to schema issues
      // and store everything in the notes field
      console.log('Lesson container ID found:', lessonContainerId);
      
      // Set lessonContainerId to null to avoid foreign key issues
      // We'll store the material info in notes instead
      lessonContainerId = null;
      
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
    // If we have a material_id issue, fall back to creating without material_id reference
    const scheduleData = {
      child_id,
      subject_name,
      scheduled_date,
      start_time,
      duration_minutes,
      notes: Object.keys(materialMetadata).length > 0 ? enhancedNotes : notes,
      created_by,
      status: 'scheduled'
    };
    
    // Only add material_id if we have a valid lesson container
    if (lessonContainerId) {
      scheduleData.material_id = lessonContainerId;
    }
    
    const { data: newEntry, error: createError } = await supabase
      .from('schedule_entries')
      .insert(scheduleData)
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

    // Update the entry - simplified without joins for drag-and-drop updates
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

// Gather comprehensive context for AI scheduling
async function gatherSchedulingContext(childIds, startDate, parentId) {
  console.log('📊 Gathering scheduling context for AI...');
  
  // Calculate date range (from start date through Friday)
  const weekdays = getNextWeekdays(startDate, 5);
  const endDate = weekdays[weekdays.length - 1];
  
  // Gather all necessary data in parallel
  const [existingSchedule, completedLessons, childPreferences, familySchedule] = await Promise.all([
    // Get existing schedule entries for the date range
    supabase
      .from('schedule_entries')
      .select('*')
      .in('child_id', childIds)
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate)
      .neq('status', 'skipped'),
    
    // Get recently completed lessons to track progress
    supabase
      .from('materials')
      .select('id, title, child_subject_id, lesson_id')
      .in('child_subject.child_id', childIds)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(50),
    
    // Get child preferences
    supabase
      .from('child_schedule_preferences')
      .select('*')
      .in('child_id', childIds),
    
    // Get ALL family schedule to detect conflicts
    supabase
      .from('schedule_entries')
      .select(`
        *,
        child:children!inner(id, name)
      `)
      .eq('child.parent_id', parentId)
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate)
      .neq('status', 'skipped')
  ]);
  
  return {
    dateRange: {
      start: startDate,
      end: endDate,
      weekdays: weekdays
    },
    existingSchedule: existingSchedule.data || [],
    completedLessons: completedLessons.data || [],
    childPreferences: childPreferences.data || [],
    familySchedule: familySchedule.data || [],
    conflicts: detectScheduleConflicts(familySchedule.data || [])
  };
}

// Detect all types of scheduling conflicts
function detectScheduleConflicts(familySchedule) {
  const conflicts = [];
  
  // Group by date and time to find overlaps
  const scheduleByDateTime = {};
  
  familySchedule.forEach(entry => {
    const key = `${entry.scheduled_date}_${entry.start_time}`;
    if (!scheduleByDateTime[key]) {
      scheduleByDateTime[key] = [];
    }
    scheduleByDateTime[key].push(entry);
  });
  
  // Find time conflicts (multiple children at same time)
  Object.entries(scheduleByDateTime).forEach(([datetime, entries]) => {
    if (entries.length > 1) {
      conflicts.push({
        type: 'time_overlap',
        datetime: datetime,
        entries: entries.map(e => ({
          child_name: e.child?.name,
          subject: e.subject_name,
          time: e.start_time
        }))
      });
    }
  });
  
  return conflicts;
}

// Get weekdays from start date through Friday of the same week
function getNextWeekdays(startDate, maxCount = 5) {
  const weekdays = [];
  const currentDate = new Date(startDate + 'T00:00:00'); // Ensure UTC parsing
  
  console.log(`📅 Start date: ${startDate} (${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentDate.getDay()]})`);
  
  // Simple approach: start from the given date and keep adding weekdays until we hit Friday or weekend
  let dateToCheck = new Date(currentDate);
  
  while (weekdays.length < maxCount) {
    const dayOfWeek = dateToCheck.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    console.log(`🔍 Checking date: ${dateToCheck.toISOString().split('T')[0]} (${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]})`);
    
    // If it's a weekday (Monday-Friday), add it
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      weekdays.push(dateToCheck.toISOString().split('T')[0]);
      console.log(`✅ Added weekday: ${dateToCheck.toISOString().split('T')[0]}`);
      
      // If we just added Friday, stop here
      if (dayOfWeek === 5) {
        console.log(`🛑 Reached Friday, stopping`);
        break;
      }
    } else if (dayOfWeek === 6 || dayOfWeek === 0) {
      // If we hit Saturday or Sunday, stop
      console.log(`🛑 Hit weekend (${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]}), stopping`);
      break;
    }
    
    // Move to next day
    dateToCheck.setDate(dateToCheck.getDate() + 1);
  }
  
  console.log(`📅 Generated weekdays: ${weekdays.join(', ')} (${weekdays.length} days)`);
  return weekdays;
}

// Generate AI-powered schedule
const generateAISchedule = async (req, res) => {
  try {
    const parentId = getParentId(req);
    const {
      child_ids,
      start_date,
      days_to_schedule = 7,
      preferences = {}
    } = req.body;

    if (!parentId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!child_ids || !Array.isArray(child_ids) || child_ids.length === 0) {
      return res.status(400).json({ error: 'child_ids array is required' });
    }

    if (!start_date) {
      return res.status(400).json({ error: 'start_date is required' });
    }

    // Verify parent owns all the children
    for (const childId of child_ids) {
      if (!(await verifyChildOwnership(parentId, childId))) {
        return res.status(403).json({ error: `Access denied for child ${childId}` });
      }
    }

    // Initialize the scheduling service
    const schedulingService = new AdvancedSchedulingService();

    // Prepare the schedule request for each child
    const scheduleRequests = [];
    
    for (const childId of child_ids) {
      // Get child's materials first, then manually fetch lesson info
      const { data: allMaterials, error: materialsError } = await supabase
        .from('materials')
        .select(`
          *,
          child_subject:child_subject_id (
            id,
            custom_subject_name_override,
            child_id,
            subject:subject_id (name)
          )
        `)
        .eq('child_subject.child_id', childId)
        .not('lesson_id', 'is', null) // Only materials that belong to lesson containers
        .order('due_date', { ascending: true, nullsLast: true })
        .limit(200);

      if (materialsError) {
        console.error(`Error fetching materials for child ${childId}:`, materialsError);
      }

      // Get unique lesson IDs from materials
      const lessonIds = [...new Set(allMaterials?.map(m => m.lesson_id).filter(Boolean))];
      
      // Fetch lesson info separately
      const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select(`
          *,
          unit:unit_id (
            id,
            name
          )
        `)
        .in('id', lessonIds);

      if (lessonsError) {
        console.error(`Error fetching lesson info for child ${childId}:`, lessonsError);
      }

      // Create lesson lookup map
      const lessonLookup = new Map();
      lessons?.forEach(lesson => {
        lessonLookup.set(lesson.id, lesson);
      });

      // Group materials by lesson_id to create lesson containers
      const lessonContainers = new Map();
      
      allMaterials?.forEach(material => {
        if (!material.lesson_id) return; // Skip materials without lesson containers
        
        const lessonId = material.lesson_id;
        const lessonInfo = lessonLookup.get(lessonId);
        
        if (!lessonInfo) return; // Skip if we couldn't find lesson info
        
        if (!lessonContainers.has(lessonId)) {
          lessonContainers.set(lessonId, {
            id: lessonId,
            title: lessonInfo.title,
            description: lessonInfo.description,
            sequence_order: lessonInfo.sequence_order,
            unit: lessonInfo.unit,
            child_subject: material.child_subject,
            materials: []
          });
        }
        
        lessonContainers.get(lessonId).materials.push(material);
      });

      // Convert to array and filter out completed lessons
      const allLessons = Array.from(lessonContainers.values());
      const incompleteLessons = allLessons.filter(lesson => {
        // A lesson is incomplete if it has any non-completed lesson materials (not worksheets)
        const hasIncompleteLesson = lesson.materials.some(material => 
          !material.completed_at && 
          (material.material_relationship === 'lesson' || material.content_type === 'lesson')
        );
        return hasIncompleteLesson;
      });

      console.log(`Found ${allLessons.length} total lessons, ${incompleteLessons.length} incomplete lessons for child ${childId}`);

      // Get child's schedule preferences
      const { data: childPreferences } = await supabase
        .from('child_schedule_preferences')
        .select('*')
        .eq('child_id', childId)
        .single();

      // Get child info
      const { data: childInfo } = await supabase
        .from('children')
        .select('id, name, grade')
        .eq('id', childId)
        .single();

      // Format lessons by subject (instead of materials)
      const lessonsBySubject = {};
      incompleteLessons?.forEach(lesson => {
        const subject = lesson.child_subject;
        const subjectName = subject?.custom_subject_name_override || subject?.subject?.name || 'General';
        
        if (!lessonsBySubject[subjectName]) {
          lessonsBySubject[subjectName] = [];
        }

        // Find the earliest due date from materials in this lesson
        const dueDates = lesson.materials
          ?.filter(m => m.due_date)
          .map(m => m.due_date)
          .sort();
        const earliestDueDate = dueDates?.[0];

        lessonsBySubject[subjectName].push({
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          sequence_order: lesson.sequence_order,
          content_type: 'lesson_container',
          due_date: earliestDueDate,
          estimated_duration: 45, // Default lesson duration
          difficulty_level: 'medium',
          unit_name: lesson.unit?.name,
          materials_count: lesson.materials?.length || 0,
          lesson_id: lesson.id // Self-reference since this IS the lesson
        });
      });

      console.log(`Child ${childId} lessons by subject:`, Object.keys(lessonsBySubject).map(subject => 
        `${subject}: ${lessonsBySubject[subject].length} lessons`
      ));

      scheduleRequests.push({
        child_id: childId,
        child_name: childInfo?.name || 'Student',
        child_grade: childInfo?.grade || 'K',
        materials: lessonsBySubject, // Keep the same key name for compatibility with scheduling service
        preferences: {
          ...childPreferences,
          ...preferences,
          start_date,
          days_to_schedule
        }
      });
    }

    console.log('🧠 Starting AI-powered intelligent scheduling for', child_ids.length, 'children with', 
      scheduleRequests.reduce((sum, req) => sum + Object.values(req.materials).flat().length, 0), 'total lessons');

    // Gather comprehensive context for AI
    const context = await gatherSchedulingContext(child_ids, start_date, parentId);
    
    // Convert frontend preferences to subject_config format expected by scheduling service
    const subject_config = {};
    if (preferences.subject_frequencies) {
      Object.entries(preferences.subject_frequencies).forEach(([subjectName, frequency]) => {
        // Create a config entry for this subject
        subject_config[subjectName] = {
          subject_name: subjectName,
          frequency: frequency,
          priority: 'normal'
        };
      });
    }

    console.log('🎛️ Frontend preferences received:', preferences);
    console.log('🎛️ Converted subject_config:', subject_config);

    // Use the existing AI scheduling service
    const aiSchedule = await schedulingService.generateOptimalSchedule({
      children_schedules: scheduleRequests,
      scheduling_context: context,
      coordination_mode: child_ids.length > 1 ? 'family' : 'individual',
      subject_config: subject_config,
      start_date: start_date,
      days_to_schedule: days_to_schedule,
      preferences: {
        start_date: start_date,
        days_to_schedule: days_to_schedule,
        weekdays_only: preferences.weekdaysOnly || true,
        resolve_conflicts: true,
        subject_frequencies: preferences.subject_frequencies || {},
        study_intensity: preferences.study_intensity || 'balanced',
        prioritize_urgent: preferences.prioritize_urgent || true,
        difficulty_distribution: preferences.difficulty_distribution || 'morning',
        session_length_preference: preferences.session_length_preference || 'mixed',
        coordination_mode: preferences.coordination_mode || 'balanced'
      }
    });

    console.log('🤖 AI Schedule generated:', {
      total_sessions: aiSchedule.sessions?.length || 0,
      metadata: aiSchedule.metadata
    });

    // Convert AI schedule to database entries
    const scheduleEntries = [];
    
    // Handle both single child and family coordination responses
    const sessions = aiSchedule.sessions || [];
    
    for (const session of sessions) {
      // Extract material info from AI response
      const materialId = session.material_id || session.assigned_material?.id;
      let materialTitle = session.material_title || session.assigned_material?.title || session.title;
      
      // If no title found, try to look it up from the original lessons
      if (!materialTitle && materialId) {
        // Look through all children's lessons to find the title
        for (const req of scheduleRequests) {
          for (const [subject, lessons] of Object.entries(req.materials || {})) {
            const foundLesson = lessons.find(l => l.id === materialId);
            if (foundLesson) {
              materialTitle = foundLesson.title;
              break;
            }
          }
          if (materialTitle) break;
        }
      }
      
      // Final fallback - extract title from session notes if available
      if (!materialTitle) {
        try {
          const sessionNotes = session.notes && typeof session.notes === 'string' 
            ? JSON.parse(session.notes) 
            : session.notes;
          
          if (sessionNotes?.material_title) {
            materialTitle = sessionNotes.material_title;
          } else {
            // Last resort: use subject + lesson format
            materialTitle = `${session.subject_name || session.subject} Lesson`;
          }
        } catch (e) {
          materialTitle = `${session.subject_name || session.subject} Lesson`;
        }
      }
      
      const entryData = {
        child_id: session.child_id,
        subject_name: session.subject_name || session.subject,
        scheduled_date: session.scheduled_date || session.date,
        start_time: session.start_time || session.startTime,
        duration_minutes: session.duration_minutes || session.duration || 45,
        status: 'scheduled',
        created_by: 'parent',
        notes: JSON.stringify({
          lesson_container_id: materialId, // This is now a lesson container ID
          lesson_title: materialTitle,
          ai_reasoning: session.reasoning || session.ai_reasoning || 'AI optimized scheduling',
          conflicts_resolved: session.conflicts_resolved,
          cognitive_load: session.cognitive_load,
          energy_level: session.energy_level
        })
      };

      scheduleEntries.push(entryData);
      console.log(`✅ AI scheduled: ${entryData.scheduled_date} ${entryData.start_time} - ${entryData.subject_name}: ${materialTitle}`);
    }

    console.log(`📊 AI scheduling complete: ${scheduleEntries.length} conflict-free entries ready for database insertion`);

    // Insert the schedule entries into the database
    if (scheduleEntries.length > 0) {
      const { data: createdEntries, error: insertError } = await supabase
        .from('schedule_entries')
        .insert(scheduleEntries)
        .select('*');

      if (insertError) {
        console.error('Error inserting AI schedule entries:', insertError);
        return res.status(500).json({ error: 'Failed to save AI-generated schedule' });
      }

      res.json({
        success: true,
        message: `Successfully generated ${createdEntries.length} schedule entries using AI`,
        entries_created: createdEntries.length,
        schedule_entries: createdEntries,
        ai_summary: aiSchedule.summary || aiSchedule.metadata?.summary || 'AI schedule generated successfully'
      });
    } else {
      res.json({
        success: true,
        message: 'No schedule entries were generated - insufficient materials or time slots',
        entries_created: 0,
        ai_summary: aiSchedule.summary || aiSchedule.metadata?.summary || 'No materials available for scheduling'
      });
    }

  } catch (error) {
    console.error('Error in generateAISchedule:', error);
    res.status(500).json({ error: 'Internal server error during AI schedule generation' });
  }
};

module.exports = {
  getScheduleEntries,
  createScheduleEntry,
  updateScheduleEntry,
  deleteScheduleEntry,
  getSchedulePreferences,
  updateSchedulePreferences,
  getUnscheduledMaterials,
  generateAISchedule
};