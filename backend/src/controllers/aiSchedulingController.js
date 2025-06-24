// AI Scheduling Controller - Integrates existing AI scheduling services
const supabase = require('../utils/supabaseClient');
const AdvancedSchedulingService = require('../services/schedulingService');
const { generateSimpleFamilySchedule } = require('./simpleFamilyScheduler');

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

// Generate AI schedule for single child using Advanced Scheduling Service
const generateAISchedule = async (req, res) => {
  try {
    const parentId = getParentId(req);
    const {
      child_id,
      start_date,
      end_date,
      scheduling_mode = 'balanced', // balanced, intensive, relaxed
      focus_subjects = [],
      include_all_materials = true,
      max_daily_sessions = 4,
      session_duration = 45,
      break_duration = 15
    } = req.body;

    console.log(`🤖 Starting AI schedule generation for child ${child_id}`);

    // Validation
    if (!parentId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!child_id || !start_date || !end_date) {
      return res.status(400).json({ 
        error: 'child_id, start_date, and end_date are required' 
      });
    }

    // Verify parent owns this child
    if (!(await verifyChildOwnership(parentId, child_id))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get child's unscheduled materials
    const { data: materials, error: materialsError } = await supabase
      .from('materials')
      .select(`
        *,
        lesson:lesson_id (
          id,
          title,
          unit:unit_id (
            id,
            name,
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
      .is('completed_at', null);

    if (materialsError) {
      console.error('Error fetching materials:', materialsError);
      return res.status(500).json({ 
        error: 'Failed to fetch materials for scheduling' 
      });
    }

    if (!materials || materials.length === 0) {
      return res.json({
        success: true,
        schedule_entries: [],
        summary: {
          total_sessions: 0,
          message: 'No materials available for scheduling'
        }
      });
    }

    // Get child's schedule preferences
    const { data: preferences } = await supabase
      .from('child_schedule_preferences')
      .select('*')
      .eq('child_id', child_id)
      .single();

    // Default preferences if none exist
    const defaultPreferences = {
      preferred_start_time: '09:00',
      preferred_end_time: '15:00',
      max_daily_study_minutes: max_daily_sessions * session_duration,
      break_duration_minutes: break_duration,
      difficult_subjects_morning: true,
      study_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    };

    const schedulePreferences = preferences || defaultPreferences;

    // Filter materials by focus subjects if specified
    let filteredMaterials = materials;
    if (focus_subjects.length > 0) {
      filteredMaterials = materials.filter(material => {
        const subjectName = material.lesson?.unit?.child_subject?.custom_subject_name_override || 
                           material.lesson?.unit?.child_subject?.subject?.name || 'General';
        return focus_subjects.includes(subjectName);
      });
    }

    console.log(`📚 Found ${filteredMaterials.length} materials to schedule`);

    // Prepare request for Advanced Scheduling Service
    const schedulingRequest = {
      child_id,
      materials: filteredMaterials,
      start_date,
      end_date,
      focus_subjects,
      preferences: schedulePreferences,
      priority_mode: scheduling_mode,
      default_session_length: session_duration,
      schedule_days: schedulePreferences.study_days
    };

    // Use Advanced Scheduling Service
    const advancedScheduler = new AdvancedSchedulingService();
    const result = await advancedScheduler.generateOptimalSchedule(schedulingRequest);

    console.log(`✅ AI generated ${result.sessions?.length || 0} schedule entries`);

    // Transform the result to match our API format
    const scheduleEntries = result.sessions || [];
    
    // Save entries to database
    const savedEntries = [];
    for (const entry of scheduleEntries) {
      try {
        const { data: savedEntry, error } = await supabase
          .from('schedule_entries')
          .insert({
            child_id: entry.child_id,
            material_id: entry.material_id,
            subject_name: entry.subject_name,
            scheduled_date: entry.scheduled_date,
            start_time: entry.start_time,
            duration_minutes: entry.duration_minutes,
            status: 'scheduled',
            created_by: 'ai_scheduler',
            notes: entry.notes || `AI generated: ${entry.reasoning || 'Optimized scheduling'}`
          })
          .select('*')
          .single();

        if (savedEntry && !error) {
          savedEntries.push(savedEntry);
        } else {
          console.error('Failed to save entry:', error);
        }
      } catch (saveError) {
        console.error('Error saving entry:', saveError);
      }
    }

    // Return comprehensive response
    res.json({
      success: true,
      schedule_entries: savedEntries,
      summary: {
        total_sessions: savedEntries.length,
        materials_scheduled: savedEntries.length,
        materials_available: filteredMaterials.length,
        date_range: { start_date, end_date },
        scheduling_mode,
        subjects_covered: [...new Set(savedEntries.map(s => s.subject_name))],
        ai_confidence: result.metadata?.confidence || 0.85,
        optimization_applied: result.metadata?.optimization_applied || []
      },
      metadata: result.metadata,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in generateAISchedule:', error);
    res.status(500).json({ 
      error: 'Failed to generate AI schedule',
      details: error.message 
    });
  }
};

// Generate AI schedule for multiple children using Family Coordination
const generateFamilyAISchedule = async (req, res) => {
  try {
    const parentId = getParentId(req);
    const {
      children_ids,
      start_date,
      end_date,
      coordination_mode = 'balanced', // balanced, synchronized, staggered
      daily_hours = { start: '09:00', end: '15:00' },
      blocked_times = [{ start: '12:00', end: '13:00', reason: 'Lunch' }],
      session_duration = 45
    } = req.body;

    console.log(`👨‍👩‍👧‍👦 Starting family AI schedule generation for ${children_ids?.length} children`);

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

    // For family scheduling, use either Advanced Scheduling Service for complex coordination
    // or Simple Family Scheduler for basic family scheduling
    let result;
    
    if (coordination_mode === 'balanced' && children_ids.length <= 3) {
      // Use Advanced Scheduling Service for complex family coordination
      console.log('🧠 Using Advanced Scheduling Service for family coordination');
      
      const advancedScheduler = new AdvancedSchedulingService();
      
      // Prepare individual requests for each child
      const childrenRequests = [];
      for (const child_id of children_ids) {
        // Get materials for this child
        const { data: materials } = await supabase
          .from('materials')
          .select(`
            *,
            lesson:lesson_id (
              id,
              title,
              unit:unit_id (
                id,
                name,
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
          .is('completed_at', null);

        // Get preferences
        const { data: preferences } = await supabase
          .from('child_schedule_preferences')
          .select('*')
          .eq('child_id', child_id)
          .single();

        const defaultPreferences = {
          preferred_start_time: daily_hours.start,
          preferred_end_time: daily_hours.end,
          max_daily_study_minutes: 240,
          break_duration_minutes: 15,
          difficult_subjects_morning: true,
          study_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        };

        childrenRequests.push({
          child_id,
          materials: materials || [],
          start_date,
          end_date,
          preferences: preferences || defaultPreferences,
          blocked_times,
          family_blocked_times: blocked_times
        });
      }

      // Use family coordination system
      const familyRequest = {
        children_schedules: childrenRequests,
        coordination_mode
      };

      result = await advancedScheduler.generateFamilyCoordinatedSchedule(familyRequest);
      
      // Save coordinated schedules
      const allSavedEntries = [];
      for (const childSchedule of result.coordinated_schedules) {
        for (const entry of childSchedule.schedule) {
          try {
            const { data: savedEntry, error } = await supabase
              .from('schedule_entries')
              .insert({
                child_id: entry.child_id,
                material_id: entry.material_id,
                subject_name: entry.subject_name,
                scheduled_date: entry.scheduled_date,
                start_time: entry.start_time,
                duration_minutes: entry.duration_minutes,
                status: 'scheduled',
                created_by: 'ai_family_scheduler',
                notes: entry.notes || `Family AI scheduling: ${coordination_mode} mode`
              })
              .select('*')
              .single();

            if (savedEntry && !error) {
              allSavedEntries.push(savedEntry);
            }
          } catch (saveError) {
            console.error('Error saving family entry:', saveError);
          }
        }
      }

      res.json({
        success: true,
        schedule_entries: allSavedEntries,
        summary: {
          total_sessions: allSavedEntries.length,
          children_count: children_ids.length,
          coordination_mode,
          conflicts_resolved: result.conflicts_resolved || 0,
          date_range: { start_date, end_date },
          subjects_covered: [...new Set(allSavedEntries.map(s => s.subject_name))]
        },
        family_metadata: result.family_metadata,
        generated_at: new Date().toISOString()
      });

    } else {
      // Use Simple Family Scheduler for basic family scheduling
      console.log('🏠 Using Simple Family Scheduler');
      
      // Create a mock request object for the simple scheduler
      const mockReq = {
        header: () => parentId,
        body: {
          children_ids,
          start_date,
          end_date,
          daily_hours,
          blocked_times
        }
      };

      // Create a mock response object
      let responseData;
      const mockRes = {
        json: (data) => { responseData = data; },
        status: () => mockRes
      };

      // Call the simple family scheduler
      await generateSimpleFamilySchedule(mockReq, mockRes);
      
      if (responseData) {
        res.json(responseData);
      } else {
        throw new Error('Simple family scheduler did not return data');
      }
    }

  } catch (error) {
    console.error('Error in generateFamilyAISchedule:', error);
    res.status(500).json({ 
      error: 'Failed to generate family AI schedule',
      details: error.message 
    });
  }
};

module.exports = {
  generateAISchedule,
  generateFamilyAISchedule
};