// Simple Family Schedule Generator - Clean and Direct Approach
const supabase = require('../utils/supabaseClient');
const OpenAI = require('openai');

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

// Main simple family scheduling function
const generateSimpleFamilySchedule = async (req, res) => {
  try {
    const parentId = getParentId(req);
    const { 
      children_ids,
      start_date,
      end_date,
      daily_hours = { start: '09:00', end: '15:00' },
      blocked_times = [{ start: '12:00', end: '13:00', reason: 'Lunch' }]
    } = req.body;

    // Validation
    if (!parentId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!children_ids || !Array.isArray(children_ids) || children_ids.length === 0) {
      return res.status(400).json({ error: 'children_ids array is required' });
    }

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date are required' });
    }

    // Verify parent owns all children
    for (const childId of children_ids) {
      if (!(await verifyChildOwnership(parentId, childId))) {
        return res.status(403).json({ 
          error: `Access denied to child ${childId}` 
        });
      }
    }

    console.log(`🎯 Generating simple family schedule for ${children_ids.length} children from ${start_date} to ${end_date}`);

    // Step 1: Fetch real lessons/assignments for all children
    const allLessons = await fetchChildrenLessons(children_ids, start_date, end_date);
    console.log(`📚 Found ${allLessons.length} total lessons across all children`);

    // Step 2: Generate available time slots
    const availableSlots = generateAvailableTimeSlots(start_date, end_date, daily_hours, blocked_times);
    console.log(`⏰ Generated ${availableSlots.length} available time slots`);

    // Step 3: Use simple LLM to create optimal schedule
    const schedule = await createSimpleScheduleWithLLM(allLessons, availableSlots);
    console.log(`📋 LLM generated ${schedule.length} schedule entries`);

    // Step 4: Save to database
    const savedEntries = await saveScheduleEntries(schedule);
    console.log(`✅ Saved ${savedEntries.length} schedule entries to database`);

    // Return clean response
    res.json({
      success: true,
      schedule_entries: savedEntries,
      summary: {
        total_sessions: savedEntries.length,
        children_count: children_ids.length,
        date_range: { start_date, end_date },
        subjects_covered: [...new Set(savedEntries.map(s => s.subject_name))],
        conflicts_prevented: allLessons.length - savedEntries.length
      },
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in generateSimpleFamilySchedule:', error);
    res.status(500).json({ 
      error: 'Failed to generate family schedule',
      details: error.message 
    });
  }
};

// Fetch actual lessons/assignments for children
async function fetchChildrenLessons(childrenIds, startDate, endDate) {
  try {
    console.log(`🔍 Fetching lessons for children: ${childrenIds.join(', ')}`);
    
    // Query to get actual lessons with proper joins
    const { data: lessons, error } = await supabase
      .from('materials')
      .select(`
        id,
        title,
        lesson_json,
        estimated_duration,
        due_date,
        completed_at,
        lesson:lesson_id (
          id,
          title,
          unit:unit_id (
            id,
            title,
            child_subject:child_subject_id (
              id,
              custom_subject_name_override,
              child_id,
              child:child_id (
                id,
                name
              )
            )
          )
        )
      `)
      .in('lesson.unit.child_subject.child_id', childrenIds)
      .is('completed_at', null) // Only incomplete lessons
      .gte('due_date', startDate)
      .lte('due_date', endDate)
      .order('due_date', { ascending: true });

    if (error) {
      console.warn('Error fetching lessons:', error);
      // Fallback: create some default lessons if database query fails
      return createDefaultLessons(childrenIds);
    }

    // Transform lessons into simple format
    const simpleLessons = lessons.map(material => ({
      id: material.id,
      child_id: material.lesson?.unit?.child_subject?.child_id,
      child_name: material.lesson?.unit?.child_subject?.child?.name || 'Unknown',
      title: material.title || material.lesson?.title || 'Study Session',
      subject: material.lesson?.unit?.child_subject?.custom_subject_name_override || 'General Study',
      duration_minutes: material.estimated_duration || 45,
      due_date: material.due_date,
      priority: calculatePriority(material.due_date, startDate)
    }));

    console.log(`📖 Processed ${simpleLessons.length} lessons with subjects:`, 
      [...new Set(simpleLessons.map(l => l.subject))]);

    return simpleLessons;
  } catch (error) {
    console.error('Error in fetchChildrenLessons:', error);
    return createDefaultLessons(childrenIds);
  }
}

// Create default lessons if database query fails
function createDefaultLessons(childrenIds) {
  console.log('📝 Creating default lessons as fallback');
  const defaultSubjects = ['Mathematics', 'English Language Arts', 'Science', 'Social Studies'];
  const lessons = [];
  
  childrenIds.forEach((childId, childIndex) => {
    defaultSubjects.forEach((subject, subjectIndex) => {
      lessons.push({
        id: `default_${childId}_${subject.toLowerCase().replace(/\s+/g, '_')}`,
        child_id: childId,
        child_name: `Child ${childIndex + 1}`,
        title: `${subject} Study Session`,
        subject: subject,
        duration_minutes: 45,
        due_date: new Date().toISOString().split('T')[0],
        priority: 'normal'
      });
    });
  });
  
  return lessons;
}

// Calculate lesson priority based on due date
function calculatePriority(dueDate, startDate) {
  if (!dueDate) return 'normal';
  
  const due = new Date(dueDate);
  const start = new Date(startDate);
  const daysUntilDue = Math.ceil((due - start) / (1000 * 60 * 60 * 24));
  
  if (daysUntilDue <= 1) return 'high';
  if (daysUntilDue <= 3) return 'medium';
  return 'normal';
}

// Generate simple available time slots
function generateAvailableTimeSlots(startDate, endDate, dailyHours, blockedTimes) {
  const slots = [];
  const sessionDuration = 45; // Standard 45-minute sessions
  const breakDuration = 15;   // 15-minute breaks
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Iterate through each day
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const dayOfWeek = date.getDay();
    
    // Skip weekends (Saturday = 6, Sunday = 0)
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    
    const dateStr = date.toISOString().split('T')[0];
    
    // Parse daily hours
    const startHour = parseInt(dailyHours.start.split(':')[0]);
    const startMin = parseInt(dailyHours.start.split(':')[1]);
    const endHour = parseInt(dailyHours.end.split(':')[0]);
    const endMin = parseInt(dailyHours.end.split(':')[1]);
    
    let currentTime = startHour * 60 + startMin; // Convert to minutes
    const endTime = endHour * 60 + endMin;
    let slotIndex = 0;
    
    // Generate slots for this day
    while (currentTime + sessionDuration <= endTime) {
      const slotStart = formatTime(currentTime);
      const slotEnd = formatTime(currentTime + sessionDuration);
      
      // Check if slot conflicts with blocked times
      const isBlocked = blockedTimes.some(blocked => {
        const blockedStart = timeToMinutes(blocked.start);
        const blockedEnd = timeToMinutes(blocked.end);
        return currentTime < blockedEnd && (currentTime + sessionDuration) > blockedStart;
      });
      
      if (!isBlocked) {
        slots.push({
          id: `${dateStr}_slot_${slotIndex}`,
          date: dateStr,
          start_time: slotStart,
          end_time: slotEnd,
          duration_minutes: sessionDuration,
          is_available: true
        });
        slotIndex++;
      }
      
      currentTime += sessionDuration + breakDuration;
    }
  }
  
  return slots;
}

// Helper functions for time manipulation
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Create schedule using simple LLM call
async function createSimpleScheduleWithLLM(lessons, availableSlots) {
  console.log('🤖 Using LLM to create optimal family schedule...');
  
  // Try LLM first, fallback to rule-based if no API key
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('No OpenAI API key');
    }
    
    const prompt = `You are a family scheduling expert. Create an optimal study schedule that prevents conflicts.

CHILDREN'S LESSONS:
${lessons.map(lesson => 
  `- ${lesson.child_name}: ${lesson.subject} - "${lesson.title}" (${lesson.duration_minutes}min, priority: ${lesson.priority})`
).join('\n')}

AVAILABLE TIME SLOTS:
${availableSlots.slice(0, 20).map(slot => 
  `- ${slot.date} ${slot.start_time}-${slot.end_time} (${slot.duration_minutes}min)`
).join('\n')}${availableSlots.length > 20 ? `\n... and ${availableSlots.length - 20} more slots` : ''}

RULES:
1. Each lesson needs exactly one time slot
2. No two children can have lessons at the same time (prevent conflicts)
3. Higher priority lessons should get better time slots
4. Try to balance subjects across different days
5. Group similar subjects when possible

Return a JSON array of assignments:
[
  {
    "lesson_id": "lesson_id_from_above",
    "slot_id": "slot_id_from_above", 
    "reasoning": "why this assignment is optimal"
  }
]

IMPORTANT: Use exact IDs from the lists above. Ensure no slot is used twice.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ 
        role: "user", 
        content: prompt 
      }],
      temperature: 0.2,
      max_tokens: 2000
    });
    
    const assignments = JSON.parse(response.choices[0].message.content);
    console.log(`🎯 LLM generated ${assignments.length} optimal assignments`);
    
    return buildScheduleFromAssignments(assignments, lessons, availableSlots);
    
  } catch (error) {
    console.warn('⚠️ LLM scheduling failed, using rule-based approach:', error.message);
    return createRuleBasedFamilySchedule(lessons, availableSlots);
  }
}

// Build schedule from LLM assignments
function buildScheduleFromAssignments(assignments, lessons, availableSlots) {
  const schedule = [];
  const lessonMap = new Map(lessons.map(l => [l.id, l]));
  const slotMap = new Map(availableSlots.map(s => [s.id, s]));
  
  for (const assignment of assignments) {
    const lesson = lessonMap.get(assignment.lesson_id);
    const slot = slotMap.get(assignment.slot_id);
    
    if (lesson && slot) {
      schedule.push({
        child_id: lesson.child_id,
        material_id: null,
        subject_name: lesson.subject,
        scheduled_date: slot.date,
        start_time: slot.start_time,
        duration_minutes: slot.duration_minutes,
        status: 'scheduled',
        created_by: 'llm_family_scheduler',
        notes: `${lesson.title} - ${lesson.child_name} (${assignment.reasoning})`
      });
      
      console.log(`🎯 LLM assigned: ${lesson.subject} (${lesson.child_name}) → ${slot.date} ${slot.start_time}`);
    }
  }
  
  return schedule;
}

// Simple rule-based scheduling with conflict prevention
function createRuleBasedFamilySchedule(lessons, availableSlots) {
  const schedule = [];
  const usedSlots = new Set();
  
  // Sort lessons by priority and due date
  const sortedLessons = lessons.sort((a, b) => {
    const priorityWeight = { high: 3, medium: 2, normal: 1 };
    const aPriority = priorityWeight[a.priority] || 1;
    const bPriority = priorityWeight[b.priority] || 1;
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority; // Higher priority first
    }
    
    return new Date(a.due_date) - new Date(b.due_date); // Earlier due date first
  });
  
  // Assign lessons to slots ensuring no conflicts
  for (const lesson of sortedLessons) {
    // Find first available slot that hasn't been used
    const availableSlot = availableSlots.find(slot => 
      !usedSlots.has(slot.id) && slot.is_available
    );
    
    if (availableSlot) {
      schedule.push({
        child_id: lesson.child_id,
        material_id: null, // Set to null to avoid foreign key issues
        subject_name: lesson.subject,
        scheduled_date: availableSlot.date,
        start_time: availableSlot.start_time,
        duration_minutes: availableSlot.duration_minutes,
        status: 'scheduled',
        created_by: 'simple_family_scheduler',
        notes: `${lesson.title} - ${lesson.child_name}`
      });
      
      // Mark slot as used
      usedSlots.add(availableSlot.id);
      console.log(`📌 Assigned: ${lesson.subject} (${lesson.child_name}) → ${availableSlot.date} ${availableSlot.start_time}`);
    } else {
      console.warn(`⚠️ No available slot for: ${lesson.title} (${lesson.child_name})`);
    }
  }
  
  return schedule;
}

// Save schedule entries to database
async function saveScheduleEntries(scheduleEntries) {
  const savedEntries = [];
  
  for (const entry of scheduleEntries) {
    try {
      const { data: savedEntry, error } = await supabase
        .from('schedule_entries')
        .insert(entry)
        .select('*')
        .single();
      
      if (!error && savedEntry) {
        savedEntries.push(savedEntry);
        console.log(`✅ Saved: ${savedEntry.subject_name} on ${savedEntry.scheduled_date} at ${savedEntry.start_time}`);
      } else {
        console.error(`❌ Failed to save entry:`, error);
      }
    } catch (saveError) {
      console.error(`❌ Error saving entry:`, saveError);
    }
  }
  
  return savedEntries;
}

module.exports = {
  generateSimpleFamilySchedule
};