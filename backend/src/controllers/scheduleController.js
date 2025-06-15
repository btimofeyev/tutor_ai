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

// Generate AI schedule with intelligent scheduling logic
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

    // Get existing schedule entries to avoid conflicts
    const { data: existingEntries } = await supabase
      .from('schedule_entries')
      .select('scheduled_date, start_time, duration_minutes, subject_name, material_id')
      .eq('child_id', child_id)
      .gte('scheduled_date', start_date)
      .lte('scheduled_date', end_date)
      .neq('status', 'skipped');

    // Process materials data for better AI context
    const materialsBySubject = {};
    const priorityLessons = [];
    
    materials.forEach(material => {
      const subject = material.subject_name || 'Unknown';
      if (!materialsBySubject[subject]) {
        materialsBySubject[subject] = [];
      }
      materialsBySubject[subject].push({
        title: material.title,
        type: material.content_type,
        estimated_duration: material.estimated_duration_minutes || 45
      });

      // Identify priority lessons (those with due dates or marked as important)
      if (material.due_date || material.priority === 'high') {
        priorityLessons.push({
          title: material.title,
          subject: subject,
          due_date: material.due_date,
          estimated_duration: material.estimated_duration_minutes || 45
        });
      }
    });

    // Create lessons context for AI prompt
    const lessonsContext = Object.keys(materialsBySubject).length > 0 
      ? Object.entries(materialsBySubject)
          .map(([subject, lessons]) => 
            `${subject}: ${lessons.map(l => `"${l.title}" (${l.estimated_duration}min)`).join(', ')}`
          ).join('\n')
      : 'No specific lessons provided - schedule general study time';

    const priorityContext = priorityLessons.length > 0
      ? priorityLessons.map(l => `"${l.title}" (${l.subject}) - Due: ${l.due_date || 'ASAP'}`).join('\n')
      : 'No urgent lessons identified';

    // AI scheduling logic
    const aiSchedulePrompt = `
    You are an expert education scheduler. Create an optimal study schedule with the following constraints:

    Schedule Period: ${start_date} to ${end_date}
    Target Weekly Hours: ${weekly_hours}
    Preferred Study Time: ${schedulePrefs.preferred_start_time} - ${schedulePrefs.preferred_end_time}
    Study Days: ${schedulePrefs.study_days.join(', ')}
    Break Duration: ${schedulePrefs.break_duration_minutes} minutes
    Difficult Subjects Morning: ${schedulePrefs.difficult_subjects_morning}
    Session Duration Preference: ${session_duration}
    Priority Mode: ${priority_mode}
    Focus Subjects: ${focus_subjects.length > 0 ? focus_subjects.join(', ') : 'All subjects equally'}

    AVAILABLE LESSONS BY SUBJECT:
    ${lessonsContext}

    PRIORITY LESSONS (Schedule These First):
    ${priorityContext}

    EXISTING SCHEDULE ENTRIES TO AVOID:
    ${existingEntries ? existingEntries.map(e => `${e.scheduled_date} ${e.start_time} - ${e.subject_name || 'Study Time'} (${e.duration_minutes}min)`).join('\n') : 'None'}

    SCHEDULING PRIORITY RULES:
    1. FIRST PRIORITY: Schedule specific lessons listed above, especially priority lessons with due dates
    2. SECOND PRIORITY: Schedule subjects that have available lesson content 
    3. THIRD PRIORITY: Fill remaining time with general study time for subjects without specific lessons
    4. Respect the preferred study time window
    5. Only schedule on specified study days
    6. Include appropriate breaks between sessions
    7. If difficult_subjects_morning is true, schedule challenging subjects (Math, Science) earlier
    8. Vary session durations based on subject, lesson complexity, and preference
    9. Avoid scheduling conflicts with existing entries
    10. Distribute subjects evenly across the time period
    11. Consider cognitive load - don't overload any single day

    When scheduling specific lessons, use the lesson title in the notes field and set appropriate duration based on lesson complexity.

    Return ONLY a JSON response with this exact structure:
    {
      "suggestions": [
        {
          "subject_name": "Math",
          "scheduled_date": "2025-06-16",
          "start_time": "09:00",
          "duration_minutes": 60,
          "notes": "Explanation of why this time/duration was chosen"
        }
      ],
      "reasoning": "Brief explanation of the overall scheduling strategy",
      "confidence": 0.85
    }
    `;

    try {
      const openaiResponse = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert educational scheduler. Respond only with valid JSON."
          },
          {
            role: "user", 
            content: aiSchedulePrompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      });

      const aiResponse = JSON.parse(openaiResponse.choices[0].message.content);
      
      // Validate the AI response structure
      if (!aiResponse.suggestions || !Array.isArray(aiResponse.suggestions)) {
        throw new Error('Invalid AI response structure');
      }

      // Add created_by field to each suggestion
      const processedSuggestions = aiResponse.suggestions.map(suggestion => ({
        ...suggestion,
        material_id: null,
        created_by: 'ai_suggestion'
      }));

      res.json({
        suggestions: processedSuggestions,
        reasoning: aiResponse.reasoning || 'AI-generated schedule optimized for learning effectiveness.',
        confidence: aiResponse.confidence || 0.8
      });

    } catch (aiError) {
      console.error('OpenAI API error:', aiError);
      
      // Fallback to rule-based scheduling if AI fails
      const fallbackSuggestions = generateFallbackSchedule({
        start_date,
        end_date,
        weekly_hours,
        schedulePrefs,
        focus_subjects,
        session_duration,
        priority_mode,
        materialsBySubject,
        priorityLessons
      });

      res.json({
        suggestions: fallbackSuggestions,
        reasoning: 'Schedule generated using rule-based algorithm (AI temporarily unavailable).',
        confidence: 0.7
      });
    }

  } catch (error) {
    console.error('Error in generateAISchedule:', error);
    res.status(500).json({ error: 'Internal server error' });
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

module.exports = {
  getScheduleEntries,
  createScheduleEntry,
  updateScheduleEntry,
  deleteScheduleEntry,
  getSchedulePreferences,
  updateSchedulePreferences,
  generateAISchedule
};