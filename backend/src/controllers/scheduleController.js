// backend/src/controllers/scheduleController.js
const supabase = require('../utils/supabaseClient');
const { OpenAI } = require('openai');
const AdvancedSchedulingService = require('../services/schedulingService');

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

// Generate AI schedule with advanced multi-stage reasoning
const generateAISchedule = async (req, res) => {
  try {
    const parentId = getParentId(req);
    const { 
      child_id, 
      start_date, 
      end_date, 
      focus_subjects = [], 
      weekly_hours = 15,
      session_duration = 'mixed',
      priority_mode = 'balanced',
      materials = []
    } = req.body;

    if (!parentId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify parent owns this child
    if (!(await verifyChildOwnership(parentId, child_id))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get child's schedule preferences
    const { data: preferences } = await supabase
      .from('child_schedule_preferences')
      .select('*')
      .eq('child_id', child_id)
      .single();

    // Use default preferences if none exist
    const schedulePrefs = preferences || {
      preferred_start_time: '09:00',
      preferred_end_time: '15:00',
      max_daily_study_minutes: 240,
      break_duration_minutes: 15,
      difficult_subjects_morning: true,
      study_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    };

    // Enhanced materials processing with subject normalization
    const processedMaterials = materials.map(material => ({
      ...material,
      child_id: child_id, // Ensure child_id is set on each material
      subject_name: material.subject_name || material.subject || 'General Study',
      estimated_duration_minutes: material.estimated_duration_minutes || 45,
      priority: material.due_date || material.priority === 'high' ? 'high' : 'normal'
    }));

    console.log(`Generating advanced schedule for child ${child_id} with ${processedMaterials.length} materials`);
    
    // If no materials provided, create some default study sessions
    if (processedMaterials.length === 0) {
      console.log('No materials provided, creating default study sessions');
      const defaultSubjects = focus_subjects.length > 0 ? focus_subjects : ['Mathematics', 'English Language Arts', 'Science'];
      
      for (const subject of defaultSubjects) {
        processedMaterials.push({
          id: `default_${subject.toLowerCase().replace(/\s+/g, '_')}_${child_id}`,
          child_id: child_id,
          title: `${subject} Study Session`,
          subject_name: subject,
          estimated_duration_minutes: 45,
          priority: 'normal',
          content_type: 'study_session'
        });
      }
      console.log(`Created ${processedMaterials.length} default study sessions`);
    }

    // Initialize the advanced scheduling service
    const schedulingService = new AdvancedSchedulingService();

    // Use the advanced scheduling service
    const scheduleParams = {
      child_id,
      start_date,
      end_date,
      focus_subjects,
      weekly_hours,
      session_duration,
      priority_mode,
      materials: processedMaterials,
      preferences: schedulePrefs
    };

    const schedule = await schedulingService.generateOptimalSchedule(scheduleParams);

    // Log scheduling results
    console.log(`Generated ${schedule.sessions.length} schedule sessions with confidence: ${schedule.metadata.confidence}`);
    
    if (schedule.metadata.generator !== 'advanced_ai') {
      console.log('Used fallback scheduling due to AI service unavailability');
    }

    // Auto-save schedule entries to database for immediate use
    const savedEntries = [];
    for (const session of schedule.sessions) {
      try {
        const { data: savedEntry, error } = await supabase
          .from('schedule_entries')
          .insert({
            child_id: session.child_id,
            material_id: session.material_id,
            subject_name: session.subject_name,
            scheduled_date: session.scheduled_date,
            start_time: session.start_time,
            duration_minutes: session.duration_minutes,
            status: session.status || 'scheduled',
            created_by: session.created_by || 'ai_suggestion',
            notes: session.notes
          })
          .select('*')
          .single();

        if (!error && savedEntry) {
          savedEntries.push(savedEntry);
          console.log(`✅ Saved schedule entry: ${savedEntry.subject_name} on ${savedEntry.scheduled_date} at ${savedEntry.start_time}`);
        } else {
          console.error(`❌ Failed to save schedule entry:`, error);
        }
      } catch (saveError) {
        console.error(`❌ Error saving schedule entry:`, saveError);
      }
    }

    // Return enhanced schedule response with saved entries
    res.json({
      suggestions: schedule.sessions,
      saved_entries: savedEntries,
      auto_saved: savedEntries.length,
      reasoning: 'Advanced AI scheduling with multi-stage reasoning and cognitive load optimization',
      confidence: schedule.metadata.confidence,
      metadata: schedule.metadata,
      analysis: {
        total_sessions: schedule.metadata.total_sessions,
        subjects_covered: schedule.metadata.subjects_covered,
        days_scheduled: schedule.metadata.days_scheduled,
        optimization_applied: schedule.metadata.optimization_applied || []
      },
      enhanced: true,
      fallback: schedule.metadata.generator !== 'advanced_ai',
      generated_at: schedule.generated_at,
      version: schedule.version
    });

  } catch (error) {
    console.error('Error in generateAISchedule:', error);
    
    // Final fallback to simple scheduling
    try {
      const simpleSchedule = await generateSimpleFallbackSchedule(req.body);
      res.json({
        suggestions: simpleSchedule,
        reasoning: 'Simple fallback scheduling used due to service error.',
        confidence: 0.6,
        fallback: true,
        error_recovery: true
      });
    } catch (fallbackError) {
      console.error('Error in fallback scheduling:', fallbackError);
      res.status(500).json({ error: 'Schedule generation failed' });
    }
  }
};

// Fallback rule-based scheduling function
function generateFallbackSchedule({ 
  start_date, 
  end_date, 
  weekly_hours, 
  schedulePrefs, 
  focus_subjects, 
  session_duration, 
  priority_mode,
  materialsBySubject = {},
  priorityLessons = []
}) {
  const suggestions = [];
  
  // Create a priority queue: priority lessons first, then subjects with lessons, then general subjects
  const schedulingQueue = [];
  
  // Add priority lessons first
  priorityLessons.forEach(lesson => {
    schedulingQueue.push({
      type: 'lesson',
      subject: lesson.subject,
      title: lesson.title,
      duration: lesson.estimated_duration,
      priority: 1
    });
  });
  
  // Add other lessons by subject
  Object.entries(materialsBySubject).forEach(([subject, lessons]) => {
    lessons.forEach(lesson => {
      // Skip if already in priority queue
      if (!priorityLessons.some(p => p.title === lesson.title)) {
        schedulingQueue.push({
          type: 'lesson',
          subject: subject,
          title: lesson.title,
          duration: lesson.estimated_duration,
          priority: 2
        });
      }
    });
  });
  
  // Add general study time for subjects without specific lessons or as filler
  const allSubjects = focus_subjects.length > 0 ? focus_subjects : ['Math', 'Science', 'English', 'History'];
  const subjectsWithLessons = Object.keys(materialsBySubject);
  const subjectsNeedingGeneral = allSubjects.filter(s => !subjectsWithLessons.includes(s));
  
  subjectsNeedingGeneral.forEach(subject => {
    schedulingQueue.push({
      type: 'general',
      subject: subject,
      title: `${subject} Study Time`,
      duration: session_duration === 'short' ? 30 : session_duration === 'long' ? 90 : 60,
      priority: 3
    });
  });

  // Sort by priority
  schedulingQueue.sort((a, b) => a.priority - b.priority);

  // Schedule items
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  let currentDate = new Date(startDate);
  let itemIndex = 0;
  let currentTime = schedulePrefs.preferred_start_time;
  
  while (currentDate <= endDate && suggestions.length < Math.floor(weekly_hours / 0.75)) {
    const dayName = dayNames[currentDate.getDay()];
    
    if (schedulePrefs.study_days.includes(dayName) && itemIndex < schedulingQueue.length) {
      const item = schedulingQueue[itemIndex % schedulingQueue.length];
      
      suggestions.push({
        material_id: null,
        subject_name: item.subject,
        scheduled_date: currentDate.toISOString().split('T')[0],
        start_time: currentTime,
        duration_minutes: item.duration,
        created_by: 'ai_suggestion',
        notes: item.type === 'lesson' ? 
          `Lesson: ${item.title}` : 
          `General study time for ${item.subject.toLowerCase()}`
      });
      
      itemIndex++;
      
      // Advance time for next session (add duration + break)
      const [hours, minutes] = currentTime.split(':').map(Number);
      const nextMinutes = minutes + item.duration + schedulePrefs.break_duration_minutes;
      const nextHours = hours + Math.floor(nextMinutes / 60);
      const finalMinutes = nextMinutes % 60;
      
      if (nextHours < 15) { // Don't schedule past 3 PM
        currentTime = `${nextHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;
      } else {
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
        currentTime = schedulePrefs.preferred_start_time;
        continue;
      }
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return suggestions;
}

// Simple fallback scheduling function for emergency cases
async function generateSimpleFallbackSchedule({
  start_date,
  end_date,
  weekly_hours = 15,
  focus_subjects = [],
  session_duration = 'mixed',
  materials = []
}) {
  const suggestions = [];
  const studyDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const startTime = '09:00';
  const breakDuration = 15;
  
  // Simple subject rotation
  const subjects = focus_subjects.length > 0 ? focus_subjects : 
    [...new Set(materials.map(m => m.subject_name || m.subject))].filter(Boolean);
  
  if (subjects.length === 0) {
    subjects.push('Math', 'English', 'Science');
  }
  
  // Calculate sessions needed
  const sessionsNeeded = Math.ceil(weekly_hours / subjects.length);
  const sessionDuration = session_duration === 'short' ? 45 : 
                         session_duration === 'long' ? 90 : 60;
  
  let subjectIndex = 0;
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  let currentDate = new Date(startDate);
  let sessionCount = 0;
  
  while (currentDate <= endDate && sessionCount < sessionsNeeded * subjects.length) {
    const dayName = dayNames[currentDate.getDay()];
    
    if (studyDays.includes(dayName)) {
      const subject = subjects[subjectIndex % subjects.length];
      
      suggestions.push({
        subject_name: subject,
        scheduled_date: currentDate.toISOString().split('T')[0],
        start_time: startTime,
        duration_minutes: sessionDuration,
        material_id: null,
        notes: `Simple scheduling for ${subject}`,
        created_by: 'ai_suggestion'
      });
      
      subjectIndex++;
      sessionCount++;
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return suggestions;
}

// Generate coordinated family schedule for multiple children
const generateFamilySchedule = async (req, res) => {
  try {
    const parentId = getParentId(req);
    const { children_schedules, coordination_mode = 'balanced' } = req.body;

    if (!parentId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!children_schedules || !Array.isArray(children_schedules) || children_schedules.length === 0) {
      return res.status(400).json({ error: 'children_schedules array is required' });
    }

    // Verify parent owns all specified children
    for (const childSchedule of children_schedules) {
      if (!(await verifyChildOwnership(parentId, childSchedule.child_id))) {
        return res.status(403).json({ 
          error: `Access denied to child ${childSchedule.child_id}` 
        });
      }
    }

    console.log(`Generating family schedule for ${children_schedules.length} children with coordination mode: ${coordination_mode}`);

    // Initialize the advanced scheduling service
    const schedulingService = new AdvancedSchedulingService();

    // Use the scheduling service for family coordination
    const familyScheduleParams = {
      parent_id: parentId,
      children_schedules,
      coordination_mode
    };

    const familySchedule = await schedulingService.generateFamilyCoordinatedSchedule(familyScheduleParams);

    // Log family scheduling results
    console.log(`Generated family schedule with ${familySchedule.coordinated_schedules.length} coordinated schedules`);
    
    if (familySchedule.coordination_mode === 'individual_fallback') {
      console.log('Used fallback family scheduling due to coordination service unavailability');
    }

    // Return coordinated family schedule
    res.json({
      family_schedule: familySchedule.coordinated_schedules,
      coordination_analysis: {
        coordination_mode: familySchedule.coordination_mode,
        conflicts_resolved: familySchedule.conflicts_resolved,
        family_metadata: familySchedule.family_metadata
      },
      conflict_resolutions: familySchedule.conflicts_resolved,
      optimization_insights: familySchedule.family_metadata,
      coordination_mode: familySchedule.coordination_mode,
      fallback: familySchedule.coordination_mode === 'individual_fallback',
      generated_at: familySchedule.generated_at,
      children_count: children_schedules.length
    });

  } catch (error) {
    console.error('Error in generateFamilySchedule:', error);
    
    // Final fallback to individual schedules
    try {
      const individualSchedules = [];
      for (const childSchedule of req.body.children_schedules || []) {
        const schedule = await generateSimpleFallbackSchedule(childSchedule);
        individualSchedules.push({
          child_id: childSchedule.child_id,
          suggestions: schedule,
          fallback: true
        });
      }
      
      res.json({
        family_schedule: individualSchedules,
        reasoning: 'Individual fallback schedules generated due to family coordination error.',
        fallback: true,
        error_recovery: true
      });
    } catch (fallbackError) {
      console.error('Error in family schedule fallback:', fallbackError);
      res.status(500).json({ error: 'Family schedule generation failed' });
    }
  }
};

// Simplified family scheduling with conflict prevention
const generateConflictFreeSchedule = async (req, res) => {
  try {
    const parentId = getParentId(req);
    const { 
      week_start_date,
      week_end_date, 
      children_ids,
      time_constraints = { start: '09:00', end: '15:00' },
      blocked_times = [{ start: '12:00', end: '13:00', reason: 'Lunch break' }],
      materials_by_child = {}
    } = req.body;

    if (!parentId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!children_ids || !Array.isArray(children_ids) || children_ids.length === 0) {
      return res.status(400).json({ error: 'children_ids array is required' });
    }

    if (!week_start_date || !week_end_date) {
      return res.status(400).json({ error: 'week_start_date and week_end_date are required' });
    }

    // Verify parent owns all specified children
    for (const childId of children_ids) {
      if (!(await verifyChildOwnership(parentId, childId))) {
        return res.status(403).json({ 
          error: `Access denied to child ${childId}` 
        });
      }
    }

    console.log(`Generating conflict-free schedule for ${children_ids.length} children for week ${week_start_date} to ${week_end_date}`);

    // Build children schedule requests
    const childrenRequests = children_ids.map(childId => ({
      child_id: childId,
      start_date: week_start_date,
      end_date: week_end_date,
      materials: materials_by_child[childId] || [],
      preferences: {
        preferred_start_time: time_constraints.start,
        preferred_end_time: time_constraints.end,
        max_daily_study_minutes: 360, // 6 hours max
        break_duration_minutes: 15,
        difficult_subjects_morning: true,
        study_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      },
      family_blocked_times: blocked_times
    }));

    // Initialize the advanced scheduling service
    const schedulingService = new AdvancedSchedulingService();

    // Use the family coordination system
    const familySchedule = await schedulingService.generateFamilyCoordinatedSchedule({
      children_schedules: childrenRequests,
      coordination_mode: 'balanced'
    });

    // Format response for simple consumption
    const conflictFreeSchedule = {
      week_range: { start: week_start_date, end: week_end_date },
      children_schedules: familySchedule.coordinated_schedules.map(childSchedule => ({
        child_id: childSchedule.child_id,
        sessions: childSchedule.schedule?.sessions || [],
        total_sessions: childSchedule.schedule?.sessions?.length || 0,
        subjects_covered: [...new Set((childSchedule.schedule?.sessions || []).map(s => s.subject_name))]
      })),
      time_constraints,
      blocked_times,
      conflicts_prevented: familySchedule.conflicts_resolved || 0,
      scheduling_confidence: familySchedule.family_metadata?.confidence || 0.8,
      generated_at: new Date().toISOString()
    };

    res.json(conflictFreeSchedule);

  } catch (error) {
    console.error('Error in generateConflictFreeSchedule:', error);
    res.status(500).json({ 
      error: 'Failed to generate conflict-free schedule',
      details: error.message 
    });
  }
};

module.exports = {
  getScheduleEntries,
  createScheduleEntry,
  updateScheduleEntry,
  deleteScheduleEntry,
  getSchedulePreferences,
  updateSchedulePreferences,
  generateAISchedule,
  generateFamilySchedule,
  generateConflictFreeSchedule
};