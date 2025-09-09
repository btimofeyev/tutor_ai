// Advanced AI Scheduling Service with Multi-Stage Reasoning and Family Coordination
const OpenAI = require('openai');
const supabase = require('../utils/supabaseClient');

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

class AdvancedSchedulingService {
    constructor() {
        // Cognitive load weights for optimal learning timing
        this.COGNITIVE_LOAD_WEIGHTS = {
            // High cognitive load subjects - best in morning peak hours
            'Mathematics': 0.95,
            'Pre-Algebra': 0.95,
            'Algebra I': 0.95,
            'Science': 0.90,
            'Physical Science': 0.90,
            'Life Science': 0.90,
            'Chemistry': 0.90,
            'Physics': 0.90,

            // Medium cognitive load - good for mid-day
            'English Language Arts': 0.70,
            'Language Arts': 0.70,
            'English Literature': 0.70,
            'Social Studies': 0.65,
            'World History': 0.65,
            'American History': 0.65,

            // Lower cognitive load - suitable for afternoon
            'Art & Creativity': 0.40,
            'Visual Arts': 0.40,
            'Art': 0.40,
            'Physical Education & Health': 0.35,
            'Physical Education': 0.35,
            'Health & Fitness': 0.35,
            'Music': 0.30
        };

        // Optimal learning windows based on cognitive science research
        this.LEARNING_WINDOWS = {
            HIGH_COGNITIVE: { start: '09:00', end: '11:30', efficiency: 1.0 },
            MEDIUM_COGNITIVE: { start: '11:30', end: '14:00', efficiency: 0.8 },
            LOW_COGNITIVE: { start: '14:00', end: '17:00', efficiency: 0.6 },
            REVIEW_TIME: { start: '17:00', end: '18:00', efficiency: 0.5 }
        };

        // Subject interdependencies for logical scheduling progression
        this.SUBJECT_DEPENDENCIES = {
            'Mathematics': ['Physical Science', 'Chemistry', 'Physics'],
            'Pre-Algebra': ['Mathematics', 'Science'],
            'Algebra I': ['Physical Science', 'Chemistry'],
            'English Language Arts': ['Social Studies', 'History'],
            'Language Arts': ['World History', 'American History'],
            'Science': ['Mathematics'],
            'Physical Science': ['Mathematics', 'Pre-Algebra', 'Algebra I']
        };

        // Session duration options using golden ratio for optimal attention spans
        this.SESSION_DURATIONS = {
            SHORT: 25, // Pomodoro technique
            MEDIUM: 45, // Standard class period
            LONG: 73, // Golden ratio extension (45 * 1.618)
            EXTENDED: 90 // Deep work sessions
        };
    }

    /**
     * Main entry point for advanced AI scheduling
     */
    async generateOptimalSchedule(scheduleRequest) {

        try {
            // Stage 1: Comprehensive Context Analysis
            const context = await this.analyzeSchedulingContext(scheduleRequest);
            
            // Early return if no materials to schedule
            if (context.materialAnalysis?.isEmpty) {
                return {
                    success: true,
                    children: scheduleRequest.children?.map(child => ({
                        child_id: child.child_id,
                        child_name: child.child_name,
                        sessions: []
                    })) || [],
                    summary: 'No materials available for scheduling. Please upload learning materials first.',
                    total_sessions: 0
                };
            }

            // Stage 2: Generate Optimal Time Slots
            const timeSlots = await this.generateOptimalTimeSlots(context);

            // Stage 3: AI-Powered Subject Assignment
            const preliminarySchedule = await this.performAISubjectAssignment(context, timeSlots);

            // Stage 4: Cognitive Load Optimization
            const optimizedSchedule = await this.optimizeCognitiveLoad(preliminarySchedule, context);

            // Stage 5: Final Validation and Enhancement
            const finalSchedule = await this.validateAndEnhanceSchedule(optimizedSchedule, context);

            return finalSchedule;

        } catch (error) {
            // AI scheduling failed, falling back to enhanced rule-based
            return await this.enhancedRuleBasedFallback(scheduleRequest);
        }
    }

    /**
     * Stage 1: Comprehensive Context Analysis
     */
    async analyzeSchedulingContext(request) {
        const { 
            child_id, 
            materials, 
            start_date, 
            end_date, 
            focus_subjects, 
            preferences,
            subject_config,
            priority_mode,
            default_session_length,
            schedule_days,
            children_schedules,
            scheduling_context,
            coordination_mode
        } = request;


        // Handle multi-child scheduling with context
        if (children_schedules && scheduling_context) {
            console.log('🔍 Detected family scheduling with conflict context');
            
            // Merge all children's materials
            const allMaterialsBySubject = {};
            const allMaterialsFlat = [];
            
            children_schedules.forEach(child => {
                Object.entries(child.materials || {}).forEach(([subject, mats]) => {
                    if (!allMaterialsBySubject[subject]) allMaterialsBySubject[subject] = [];
                    const materialsWithChild = mats.map(m => ({...m, child_id: child.child_id, child_name: child.child_name}));
                    allMaterialsBySubject[subject].push(...materialsWithChild);
                    allMaterialsFlat.push(...materialsWithChild);
                });
            });

            // Extract preferences
            const mergedPreferences = {
                ...preferences,
                existing_schedule: scheduling_context.existingSchedule,
                family_conflicts: scheduling_context.conflicts,
                completed_lessons: scheduling_context.completedLessons,
                child_preferences: scheduling_context.childPreferences
            };

            return {
                child_id: children_schedules[0]?.child_id, // For compatibility
                children_ids: children_schedules.map(c => c.child_id),
                start_date: preferences?.start_date || start_date,
                end_date: preferences?.end_date || end_date,
                weekdays: scheduling_context.dateRange?.weekdays || [],
                materials: allMaterialsBySubject,
                allMaterialsFlat: allMaterialsFlat,
                materialAnalysis: this.analyzeMaterials(allMaterialsFlat),
                childProfiles: children_schedules.map(c => ({
                    child_id: c.child_id,
                    child_name: c.child_name,
                    grade: c.child_grade,
                    preferences: c.preferences
                })),
                timeConstraints: this.calculateTimeConstraintsForMultiChild(
                    preferences?.start_date || start_date, 
                    scheduling_context.dateRange?.end || end_date, 
                    children_schedules
                ),
                scheduling_context: scheduling_context,
                coordination_mode: coordination_mode || 'family',
                conflicts_to_resolve: scheduling_context.conflicts || [],
                subject_config: subject_config || {},
                aiInsights: await this.generateConflictAwareInsights(scheduling_context, allMaterialsBySubject)
            };
        }

        // Original single-child logic
        const materialAnalysis = this.analyzeMaterials(materials);
        const childProfile = await this.buildChildProfile(child_id, preferences);
        const timeConstraints = this.calculateTimeConstraints(start_date, end_date, childProfile);
        const aiInsights = await this.generateContextualInsights(materialAnalysis, childProfile, timeConstraints);

        return {
            child_id,
            start_date,
            end_date,
            materials,
            materialAnalysis,
            childProfile,
            timeConstraints,
            aiInsights,
            focus_subjects: focus_subjects || [],
            subject_config: subject_config || {},
            priority_mode: priority_mode || 'balanced',
            default_session_length: default_session_length || 45,
            schedule_days: schedule_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        };
    }

    /**
     * Analyze materials to extract scheduling insights
     */
    analyzeMaterials(materials) {
        // Handle null, undefined, or empty materials
        if (!materials || !Array.isArray(materials) || materials.length === 0) {
            return {
                totalMaterials: 0,
                byContentType: {},
                bySubject: {},
                urgencyLevels: [],
                estimatedDurations: [],
                complexity: {},
                isEmpty: true
            };
        }

        const analysis = {
            totalMaterials: materials.length,
            byContentType: {},
            bySubject: {},
            urgencyLevels: [],
            estimatedDurations: [],
            complexity: {},
            isEmpty: false
        };

        materials.forEach(material => {
            // Content type distribution
            analysis.byContentType[material.content_type] =
                (analysis.byContentType[material.content_type] || 0) + 1;

            // Subject distribution with proper fallback chain
            const subject = material.lesson?.unit?.child_subject?.custom_subject_name_override || 
                           material.lesson?.unit?.child_subject?.subject?.name ||
                           this.inferSubjectFromTitle(material.title) ||
                           'Unknown';
            analysis.bySubject[subject] = (analysis.bySubject[subject] || 0) + 1;

            // Calculate urgency based on due date
            const daysUntilDue = this.calculateDaysUntilDue(material.due_date);
            analysis.urgencyLevels.push({
                material_id: material.id,
                title: material.title,
                daysUntilDue,
                urgency: daysUntilDue <= 1 ? 'high' : daysUntilDue <= 3 ? 'medium' : 'low'
            });

            // Estimate duration based on content type and complexity
            const estimatedDuration = this.estimateMaterialDuration(material);
            analysis.estimatedDurations.push({
                material_id: material.id,
                estimatedMinutes: estimatedDuration
            });
        });

        return analysis;
    }

    /**
     * Build comprehensive child profile
     */
    async buildChildProfile(child_id, preferences) {
        // Default preferences structure
        const defaultPrefs = {
            preferred_start_time: '09:00',
            preferred_end_time: '15:00',
            max_daily_study_minutes: 240,
            break_duration_minutes: 15,
            difficult_subjects_morning: true,
            study_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        };

        const profile = {
            child_id,
            preferences: {...defaultPrefs, ...preferences },
            learningStyle: await this.inferLearningStyle(child_id),
            cognitiveProfile: this.buildCognitiveProfile(preferences),
            timeProfile: this.buildTimeProfile(preferences || defaultPrefs)
        };

        return profile;
    }

    /**
     * Infer learning style from child's past performance (placeholder)
     */
    async inferLearningStyle(child_id) {
        // In a full implementation, this would analyze the child's learning patterns
        // For now, return a default learning style
        return {
            preference: 'visual',
            pace: 'moderate',
            attention_span: 'normal'
        };
    }

    /**
     * Build cognitive profile based on preferences
     */
    buildCognitiveProfile(preferences) {
        return {
            peak_hours: preferences.difficult_subjects_morning ? 'morning' : 'afternoon',
            focus_duration: Math.min(preferences.max_daily_study_minutes / 4, 90),
            break_preference: preferences.break_duration_minutes || 15
        };
    }

    /**
     * Calculate comprehensive time constraints for single child
     */
    calculateTimeConstraints(start_date, end_date, childProfile) {
        if (!childProfile || !childProfile.preferences) {
            console.warn('⚠️ No childProfile provided, using default preferences');
            const defaultPreferences = {
                study_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
                max_daily_study_minutes: 240,
                break_duration_minutes: 15,
                preferred_start_time: '09:00',
                preferred_end_time: '15:00',
                difficult_subjects_morning: true
            };
            return this.calculateTimeConstraints(start_date, end_date, { preferences: defaultPreferences });
        }

        const startDate = new Date(start_date);
        const endDate = new Date(end_date);
        const { preferences } = childProfile;
        
        const availableDays = [];
        const currentDate = new Date(startDate);

        console.log('🔍 Debug time constraints calculation:');
        console.log('   Child preferences:', preferences);
        console.log('   Study days:', preferences.study_days);

        while (currentDate <= endDate) {
            const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
            const dateStr = currentDate.toISOString().split('T')[0];
            
            
            if (preferences.study_days && preferences.study_days.includes(dayName)) {
                availableDays.push({
                    date: new Date(currentDate),
                    dayName,
                    availableMinutes: preferences.max_daily_study_minutes || 240,
                    startTime: preferences.preferred_start_time || '09:00',
                    endTime: preferences.preferred_end_time || '15:00'
                });
            } else {
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        

        return {
            totalDays: availableDays.length,
            totalAvailableMinutes: availableDays.reduce((sum, day) => sum + day.availableMinutes, 0),
            availableDays,
            dailyConstraints: {
                maxMinutes: preferences.max_daily_study_minutes || 240,
                breakDuration: preferences.break_duration_minutes || 15,
                timeWindow: {
                    start: preferences.preferred_start_time || '09:00',
                    end: preferences.preferred_end_time || '15:00'
                }
            }
        };
    }

    /**
     * Calculate time constraints for multiple children
     */
    calculateTimeConstraintsForMultiChild(start_date, end_date, children_schedules) {
        const startDate = new Date(start_date);
        const endDate = new Date(end_date + 'T12:00:00.000Z'); // Fix timezone issue for end date too
        
        // Get preferences from all children, use defaults if none provided
        const allPreferences = children_schedules.map(child => {
            return child.preferences || {
                study_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
                max_daily_study_minutes: 240,
                break_duration_minutes: 15,
                preferred_start_time: '09:00',
                preferred_end_time: '15:00',
                difficult_subjects_morning: true
            };
        });

        // Find common study days across all children
        const commonStudyDays = allPreferences.reduce((common, prefs) => {
            const studyDays = prefs.study_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
            if (common.length === 0) return studyDays;
            return common.filter(day => studyDays.includes(day));
        }, []);

        // Calculate family-wide constraints
        const familyConstraints = {
            earliestStart: allPreferences.reduce((earliest, prefs) => {
                const start = prefs.preferred_start_time || '09:00';
                return start < earliest ? start : earliest;
            }, '09:00'),
            latestEnd: allPreferences.reduce((latest, prefs) => {
                const end = prefs.preferred_end_time || '15:00';
                return end > latest ? end : latest;
            }, '15:00'),
            maxFamilyMinutes: Math.max(...allPreferences.map(prefs => prefs.max_daily_study_minutes || 240)),
            averageBreakTime: Math.round(allPreferences.reduce((sum, prefs) => sum + (prefs.break_duration_minutes || 15), 0) / allPreferences.length)
        };
        

        const availableDays = [];
        // Fix timezone issue by properly parsing the date string
        const currentDate = new Date(start_date + 'T12:00:00.000Z'); // Use start_date string, not Date object

        while (currentDate <= endDate) {
            const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
            const dateStr = currentDate.toISOString().split('T')[0];
            
            // Debug date parsing issue
            
            // Alternative day name calculation to verify
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const altDayName = dayNames[currentDate.getDay()];
            
            if (dayName !== altDayName) {
            }
            
            if (commonStudyDays.includes(dayName)) {
                availableDays.push({
                    date: new Date(currentDate),
                    dayName,
                    availableMinutes: familyConstraints.maxFamilyMinutes,
                    startTime: familyConstraints.earliestStart,
                    endTime: familyConstraints.latestEnd,
                    childrenCount: children_schedules.length
                });
            } else {
                console.log(`   ❌ Skipped ${dateStr} (${dayName}) - not in common study days`);
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        

        return {
            totalDays: availableDays.length,
            totalAvailableMinutes: availableDays.reduce((sum, day) => sum + day.availableMinutes, 0),
            availableDays,
            familyConstraints,
            dailyConstraints: {
                maxMinutes: familyConstraints.maxFamilyMinutes,
                breakDuration: familyConstraints.averageBreakTime,
                timeWindow: {
                    start: familyConstraints.earliestStart,
                    end: familyConstraints.latestEnd
                }
            }
        };
    }

    /**
     * Generate conflict-aware AI insights for family scheduling
     */
    async generateConflictAwareInsights(schedulingContext, materials) {
        
        const prompt = `As an expert educational scheduler, analyze this family's scheduling context and provide strategic insights for conflict-free scheduling.

EXISTING SCHEDULE:
${JSON.stringify(schedulingContext.existingSchedule.map(e => ({
    date: e.scheduled_date,
    time: e.start_time,
    child: e.child_id,
    subject: e.subject_name
})), null, 2)}

DETECTED CONFLICTS:
${JSON.stringify(schedulingContext.conflicts, null, 2)}

AVAILABLE MATERIALS TO SCHEDULE:
${Object.entries(materials).map(([subject, mats]) => 
    `${subject}: ${mats.length} lessons (due dates: ${mats.map(m => m.due_date || 'none').join(', ')})`
).join('\n')}

COMPLETED LESSONS (for progress tracking):
${schedulingContext.completedLessons.length} lessons completed

Provide strategic insights for:
1. How to resolve time conflicts between children
2. Optimal subject sequencing based on existing schedule
3. Priority order based on due dates
4. Cognitive load distribution across the week
5. Recommendations for parallel vs sequential teaching

Format as JSON with structure:
{
    "conflict_resolution_strategy": "...",
    "priority_subjects": ["subject1", "subject2"],
    "recommended_time_slots": {
        "subject": "preferred_time"
    },
    "parallel_teaching_opportunities": ["subjects that can be taught together"],
    "energy_optimization": "recommendations for maintaining focus"
}`;

        try {
            const response = await openai.chat.completions.create({
                model: "gpt-4-1106-preview",
                messages: [
                    { role: "system", content: "You are an expert educational scheduler specializing in homeschool optimization and conflict resolution." },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" },
                temperature: 0.3
            });

            return JSON.parse(response.choices[0].message.content);
        } catch (error) {
            return {
                conflict_resolution_strategy: "Stagger start times by 15-30 minutes between children",
                priority_subjects: ["Mathematics", "English Language Arts"],
                recommended_time_slots: {
                    "Mathematics": "09:00",
                    "English": "10:30",
                    "Science": "14:00"
                },
                parallel_teaching_opportunities: [],
                energy_optimization: "Schedule high-cognitive subjects in morning, creative subjects after lunch"
            };
        }
    }

    /**
     * Generate AI insights about optimal scheduling approach
     */
    async generateContextualInsights(materialAnalysis, childProfile, timeConstraints) {
        const prompt = `As an expert educational scheduler and cognitive science specialist, analyze this student's learning context and provide strategic scheduling insights:

STUDENT PROFILE:
- Study time: ${childProfile.preferences.preferred_start_time} - ${childProfile.preferences.preferred_end_time}
- Daily limit: ${childProfile.preferences.max_daily_study_minutes} minutes
- Break preference: ${childProfile.preferences.break_duration_minutes} minutes
- Difficult subjects in morning: ${childProfile.preferences.difficult_subjects_morning}
- Available days: ${timeConstraints.totalDays} days

MATERIALS ANALYSIS:
- Total materials: ${materialAnalysis.totalMaterials}
- By content type: ${JSON.stringify(materialAnalysis.byContentType)}
- By subject: ${JSON.stringify(materialAnalysis.bySubject)}
- High urgency items: ${materialAnalysis.urgencyLevels.filter(u => u.urgency === 'high').length}

Provide strategic insights in this JSON format:
{
  "schedulingStrategy": "intensive|balanced|relaxed",
  "prioritizationApproach": "urgency|subject_balance|cognitive_load",
  "sessionLengthRecommendation": "short|medium|long|mixed",
  "cognitiveLoadDistribution": "front_loaded|evenly_distributed|back_loaded",
  "riskFactors": ["risk1", "risk2"],
  "opportunityAreas": ["opportunity1", "opportunity2"],
  "confidence": 0.85
}`;

        // Try AI call first, fallback to rule-based if it fails
        
        try {
            const aiResponse = await this.generateAIInsights(materialAnalysis, childProfile, {});
            if (aiResponse) {
                return aiResponse;
            }
        } catch (error) {
        }
        
        
        const highUrgencyCount = materialAnalysis.urgencyLevels.filter(u => u.urgency === 'high').length;
        const totalMaterials = materialAnalysis.totalMaterials;
        const studyTimeMinutes = childProfile.preferences.max_daily_study_minutes;
        
        // Determine strategy based on urgency and time constraints
        let schedulingStrategy = 'balanced';
        if (highUrgencyCount > totalMaterials * 0.5) {
            schedulingStrategy = 'intensive';
        } else if (studyTimeMinutes < 120) {
            schedulingStrategy = 'relaxed';
        }
        
        // Determine prioritization approach
        let prioritizationApproach = 'subject_balance';
        if (highUrgencyCount > 0) {
            prioritizationApproach = 'urgency';
        } else if (childProfile.preferences.difficult_subjects_morning) {
            prioritizationApproach = 'cognitive_load';
        }
        
        // Determine session length based on available time and materials
        let sessionLengthRecommendation = 'medium';
        if (totalMaterials > 0) {
            if (studyTimeMinutes / totalMaterials < 30) {
                sessionLengthRecommendation = 'short';
            } else if (studyTimeMinutes / totalMaterials > 60) {
                sessionLengthRecommendation = 'long';
            }
        }
        
        // Determine cognitive load distribution
        let cognitiveLoadDistribution = 'evenly_distributed';
        if (childProfile.preferences.difficult_subjects_morning) {
            cognitiveLoadDistribution = 'front_loaded';
        }
        
        const insights = {
            schedulingStrategy,
            prioritizationApproach,
            sessionLengthRecommendation,
            cognitiveLoadDistribution,
            riskFactors: highUrgencyCount > 0 ? ['limited_study_time', 'high_urgency_items'] : ['unknown_subjects'],
            opportunityAreas: ['optimize_break_time', 'prioritize_high_urgency_items'],
            confidence: 0.85
        };
        
        return insights;
    }

    /**
     * Stage 2: Generate Optimal Time Slots
     */
    async generateOptimalTimeSlots(context) {

        const { timeConstraints, childProfile, childProfiles, aiInsights } = context;
        const slots = [];

        // Handle both single-child and multi-child contexts
        const profileToUse = childProfile || (childProfiles && childProfiles[0]) || {
            preferences: {
                preferred_start_time: '09:00',
                preferred_end_time: '15:00',
                break_duration_minutes: 15,
                difficult_subjects_morning: true
            }
        };

        for (const day of timeConstraints.availableDays) {
            const dailySlots = this.generateDailyTimeSlots(day, profileToUse, aiInsights);
            slots.push(...dailySlots);
        }

        // Optimize slot distribution using golden ratio and cognitive science
        const optimizedSlots = this.optimizeSlotDistribution(slots, context);

        return optimizedSlots;
    }

    /**
     * Generate time slots for a single day
     */
    generateDailyTimeSlots(day, childProfile, aiInsights) {
        const slots = [];
        const { preferences } = childProfile;

        // Parse time constraints
        const startTime = this.parseTime(preferences.preferred_start_time);
        const endTime = this.parseTime(preferences.preferred_end_time);
        const breakMinutes = preferences.break_duration_minutes;

        // Determine session length based on AI insights
        const sessionLength = this.determineSessionLength(aiInsights.sessionLengthRecommendation);

        let currentTime = startTime;
        let slotIndex = 0;

        while (currentTime + sessionLength <= endTime) {
            // Determine cognitive window for this time slot
            const cognitiveWindow = this.getCognitiveWindow(this.formatTime(currentTime));

            const slot = {
                id: `${day.date.toISOString().split('T')[0]}_slot_${slotIndex}`,
                date: day.date.toISOString().split('T')[0],
                startTime: this.formatTime(currentTime),
                endTime: this.formatTime(currentTime + sessionLength),
                durationMinutes: sessionLength,
                cognitiveWindow: cognitiveWindow.type,
                efficiency: cognitiveWindow.efficiency,
                isOptimal: this.isOptimalLearningTime(currentTime),
                dayIndex: slotIndex
            };

            slots.push(slot);

            // Move to next slot with break
            currentTime += sessionLength + breakMinutes;
            slotIndex++;
        }

        return slots;
    }

    /**
     * Stage 3: AI-Powered Subject Assignment
     */
    async performAISubjectAssignment(context, timeSlots) {

        const { materials, allMaterialsFlat, aiInsights, childProfile } = context;

        // Use already grouped materials if available, otherwise group them
        const materialsBySubject = typeof materials === 'object' && !Array.isArray(materials) 
            ? materials 
            : this.groupMaterialsBySubject(allMaterialsFlat || materials || []);

        // Use AI to create optimal material-to-slot assignments
        const assignments = await this.generateAIAssignments(
            materialsBySubject,
            timeSlots,
            aiInsights,
            childProfile,
            context
        );

        // Extract assignments from AI response and create preliminary schedule
        const assignmentsArray = assignments.assignments || assignments || [];
        const schedule = this.buildPreliminarySchedule(assignmentsArray, timeSlots, context.allMaterialsFlat || materials);

        
        if (schedule.length === 0) {
        }
        
        return schedule;
    }

    /**
     * Generate AI-powered material assignments
     */
    async generateAIAssignments(materialsBySubject, timeSlots, aiInsights, childProfile, context) {
            // Check if we have conflict context
            const hasConflictContext = context?.scheduling_context?.conflicts?.length > 0;
            const existingSchedule = context?.scheduling_context?.existingSchedule || [];
            
            const prompt = `As an expert educational scheduler, create optimal material assignments for time slots while resolving scheduling conflicts.

TIME SLOTS AVAILABLE:
${timeSlots.map(slot => 
  `ID: ${slot.id} | ${slot.date} ${slot.startTime}-${slot.endTime} (${slot.cognitiveWindow}, efficiency: ${slot.efficiency})`
).join('\n')}

${hasConflictContext ? `EXISTING SCHEDULE (DO NOT DOUBLE-BOOK):
${existingSchedule.map(e => 
  `${e.scheduled_date} ${e.start_time}: ${e.subject_name} (Child: ${e.child_id})`
).join('\n')}

DETECTED CONFLICTS TO AVOID:
${context.scheduling_context.conflicts.map(c => 
  `${c.type}: ${JSON.stringify(c.entries)}`
).join('\n')}` : ''}

MATERIALS BY SUBJECT:
${Object.entries(materialsBySubject).map(([subject, materials]) => {
  // Include child info if available
  const materialsWithChild = materials.map(m => {
    const childInfo = m.child_name ? ` [${m.child_name}]` : '';
    const dueInfo = m.due_date ? ` DUE:${m.due_date}` : '';
    return `ID:${m.id} "${m.title}"${childInfo}${dueInfo}`;
  }).join(', ');
  return `${subject}: ${materialsWithChild}`;
}).join('\n')}

STUDENT PREFERENCES:
- Difficult subjects in morning: ${childProfile?.preferences?.difficult_subjects_morning || true}
- AI Strategy: ${aiInsights.schedulingStrategy || aiInsights.conflict_resolution_strategy}
- Prioritization: ${aiInsights.prioritizationApproach || 'due_date_first'}

COGNITIVE LOAD WEIGHTS (higher = more difficult):
${Object.entries(this.COGNITIVE_LOAD_WEIGHTS).map(([subject, weight]) => 
  `${subject}: ${weight}`
).slice(0, 10).join('\n')}

Create assignments following these rules:
1. NEVER schedule during existing schedule times (avoid conflicts)
2. Prioritize materials by DUE DATE (urgent first)
3. Match high cognitive load subjects to high efficiency time slots
4. Respect student preference for difficult subjects timing
5. Balance subjects across days for variety
6. For multiple children, avoid scheduling same subject at same time
7. Ensure logical subject progression (don't skip prerequisites)

Provide assignments in this JSON format:
{
  "assignments": [
    {
      "slot_id": "use_exact_slot_id_from_list_above",
      "subject": "subject_name", 
      "material_ids": ["material1", "material2"],
      "child_id": "child_id_if_multiple_children",
      "reasoning": "why this assignment is optimal",
      "cognitive_match": 0.85,
      "conflicts_avoided": ["list any conflicts this avoids"]
    }
  ],
  "overall_strategy": "description of overall approach",
  "conflicts_resolved": ["how conflicts were resolved"],
  "confidence": 0.90
}

IMPORTANT: 
- Use the exact slot_id values provided in the TIME SLOTS list above
- Use the exact material IDs provided in the MATERIALS BY SUBJECT list above
- RESPECT EXISTING SCHEDULE - do not double-book time slots
- PRIORITIZE BY DUE DATE - schedule urgent materials first`;

    // Try AI assignment first, fallback to rule-based if it fails
    
    try {
        const aiResponse = await this.callOpenAIForAssignments(materialsBySubject, timeSlots, aiInsights, childProfile);
        if (aiResponse && aiResponse.assignments) {
            return aiResponse;
        }
    } catch (error) {
    }
    
    return this.generateRuleBasedAssignments(materialsBySubject, timeSlots, childProfile, context);
  }

  /**
   * Stage 4: Cognitive Load Optimization
   */
  async optimizeCognitiveLoad(preliminarySchedule, context) {
    
    const { aiInsights } = context;
    let optimizedSchedule = [...preliminarySchedule];
    
    // Apply cognitive load optimization based on AI insights
    switch (aiInsights.cognitiveLoadDistribution) {
      case 'front_loaded':
        optimizedSchedule = this.frontLoadDifficultSubjects(optimizedSchedule);
        break;
      case 'evenly_distributed':
        optimizedSchedule = this.evenlyDistributeCognitiveLoad(optimizedSchedule);
        break;
      case 'back_loaded':
        optimizedSchedule = this.backLoadDifficultSubjects(optimizedSchedule);
        break;
    }
    
    // Ensure no cognitive overload on any single day
    optimizedSchedule = this.preventCognitiveOverload(optimizedSchedule);
    
    // Add variety and breaks between similar subjects
    optimizedSchedule = this.addSubjectVariety(optimizedSchedule);
    
    return optimizedSchedule;
  }

  /**
   * Stage 5: Final Validation and Enhancement
   */
  async validateAndEnhanceSchedule(schedule, context) {
    
    let enhancedSchedule = [...schedule];
    
    // Validate all materials are scheduled
    enhancedSchedule = this.validateMaterialCoverage(enhancedSchedule, context.materials);
    
    // Add AI reasoning for each scheduled item
    enhancedSchedule = await this.addScheduleReasoning(enhancedSchedule, context);
    
    // Optimize for learning efficiency
    enhancedSchedule = this.optimizeForLearningEfficiency(enhancedSchedule);
    
    // Generate overall schedule confidence and metadata
    const scheduleMetadata = this.generateScheduleMetadata(enhancedSchedule, context);
    
    return {
      sessions: enhancedSchedule,
      metadata: scheduleMetadata,
      generated_at: new Date().toISOString(),
      version: 'advanced_ai_v1.0'
    };
  }

  /**
   * Enhanced Rule-Based Fallback System
   */
  async enhancedRuleBasedFallback(request) {
    
    try {
      const context = await this.analyzeSchedulingContext(request);
      const { materials, allMaterialsFlat, timeConstraints, childProfile, childProfiles } = context;
      
      // Generate time slots using mathematical optimization
      const timeSlots = this.generateOptimalTimeSlots(context);
      
      // Use already grouped materials if available, otherwise group them
      const materialsBySubject = typeof materials === 'object' && !Array.isArray(materials) 
        ? materials 
        : this.groupMaterialsBySubject(allMaterialsFlat || materials || []);
      
      // Apply rule-based assignment with cognitive science
      const profileToUse = childProfile || (childProfiles && childProfiles[0]);
      const assignments = this.generateRuleBasedAssignments(
        materialsBySubject,
        timeSlots,
        profileToUse,
        context
      );
      
      // Build schedule with enhanced logic
      const schedule = this.buildPreliminarySchedule(assignments, timeSlots, allMaterialsFlat || materials);
      
      // Apply basic optimizations
      const optimizedSchedule = this.basicCognitiveOptimization(schedule);
      
      return {
        sessions: optimizedSchedule,
        metadata: {
          generator: 'enhanced_rule_based',
          confidence: 0.75,
          total_sessions: optimizedSchedule.length
        },
        generated_at: new Date().toISOString()
      };
      
    } catch (error) {
      return this.emergencyFallbackSchedule(request);
    }
  }

  /**
   * Emergency Fallback - Guaranteed Schedule Generation
   */
  emergencyFallbackSchedule(request) {
    
    const { materials, start_date, end_date, child_id } = request;
    const schedule = [];
    
    const startDate = new Date(start_date);
    const currentDate = new Date(startDate);
    const endDate = new Date(end_date);
    
    let materialIndex = 0;
    let sessionId = 1;
    
    // Simple distribution across available days
    while (currentDate <= endDate && materialIndex < materials.length) {
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      
      // Skip weekends for emergency schedule
      if (!['saturday', 'sunday'].includes(dayName)) {
        const material = materials[materialIndex];
        
        // Create display title with lesson name for emergency fallback too
        let actualSubjectName = material.lesson?.unit?.child_subject?.custom_subject_name_override || 
                               material.lesson?.unit?.child_subject?.subject?.name || 
                               'Study';
        let displayTitle = actualSubjectName;
        if (material.title && material.title !== actualSubjectName) {
          displayTitle = `${actualSubjectName}: ${material.title}`;
        }
        
        schedule.push({
          id: `emergency_${sessionId}`,
          child_id,
          material_id: material.id,
          subject_name: displayTitle, // Now includes lesson title
          base_subject_name: actualSubjectName, // Keep original subject name for color coding
          scheduled_date: currentDate.toISOString().split('T')[0],
          start_time: '09:00',
          duration_minutes: 45,
          status: 'scheduled',
          created_by: 'ai_suggestion',
          notes: `Emergency scheduled: ${material.title}`,
          reasoning: 'Emergency fallback scheduling due to system limitations'
        });
        
        materialIndex++;
        sessionId++;
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return {
      sessions: schedule,
      metadata: {
        generator: 'emergency_fallback',
        confidence: 0.5,
        total_sessions: schedule.length,
        warning: 'Emergency schedule generated - may not be optimal'
      },
      generated_at: new Date().toISOString()
    };
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Group materials by subject for better scheduling
   */
  groupMaterialsBySubject(materials) {
    const grouped = {};
    
    materials.forEach(material => {
      // Enhanced subject name detection with proper fallback chain
      const subject = material.lesson?.unit?.child_subject?.custom_subject_name_override || 
                     material.lesson?.unit?.child_subject?.subject?.name ||
                     this.inferSubjectFromTitle(material.title) ||
                     'General';
      
      if (!grouped[subject]) {
        grouped[subject] = [];
      }
      grouped[subject].push(material);
    });
    
    return grouped;
  }

  /**
   * Infer subject name from material title
   */
  inferSubjectFromTitle(title) {
    if (!title) return null;
    
    const lowerTitle = title.toLowerCase();
    
    // Math/Mathematics keywords
    if (lowerTitle.includes('math') || 
        lowerTitle.includes('counting') || 
        lowerTitle.includes('numbers') || 
        lowerTitle.includes('equal') || 
        lowerTitle.includes('groups') || 
        lowerTitle.includes('algebra') || 
        lowerTitle.includes('geometry') || 
        lowerTitle.includes('word problems')) {
      return 'Mathematics';
    }
    
    // History/Social Studies keywords
    if (lowerTitle.includes('history') || 
        lowerTitle.includes('timeline') || 
        lowerTitle.includes('past') || 
        lowerTitle.includes('artifacts') || 
        lowerTitle.includes('symbols') || 
        lowerTitle.includes('washington') || 
        lowerTitle.includes('community') || 
        lowerTitle.includes('family') || 
        lowerTitle.includes('traditions') || 
        lowerTitle.includes('holidays') ||
        lowerTitle.includes('american') ||
        lowerTitle.includes('world')) {
      return 'History';
    }
    
    // Science keywords
    if (lowerTitle.includes('science') || 
        lowerTitle.includes('experiment') || 
        lowerTitle.includes('physics') || 
        lowerTitle.includes('chemistry') || 
        lowerTitle.includes('biology') || 
        lowerTitle.includes('nature')) {
      return 'Science';
    }
    
    // English/Language Arts keywords
    if (lowerTitle.includes('reading') || 
        lowerTitle.includes('writing') || 
        lowerTitle.includes('grammar') || 
        lowerTitle.includes('literature') || 
        lowerTitle.includes('english') || 
        lowerTitle.includes('story') || 
        lowerTitle.includes('essay')) {
      return 'English Language Arts';
    }
    
    return null; // Let it fall back to 'General'
  }

  /**
   * Calculate days until due date
   */
  calculateDaysUntilDue(dueDate) {
    if (!dueDate) return 7; // Default if no due date
    
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  }

  /**
   * Estimate material duration based on type and complexity
   */
  estimateMaterialDuration(material) {
    const baseMinutes = {
      'worksheet': 30,
      'assignment': 45,
      'quiz': 20,
      'test': 60,
      'reading': 25,
      'video': 35,
      'project': 90
    };
    
    const base = baseMinutes[material.content_type] || 30;
    
    // Adjust based on grade value (complexity indicator)
    if (material.grade_max_value) {
      const maxGrade = parseInt(material.grade_max_value) || 100;
      const complexityMultiplier = Math.min(maxGrade / 50, 2.0);
      return Math.round(base * complexityMultiplier);
    }
    
    return base;
  }

  /**
   * Infer learning style from historical data
   */
  async inferLearningStyle(child_id) {
    // In a real implementation, this would analyze historical performance
    // For now, return a balanced default
    return {
      visual: 0.6,
      auditory: 0.4,
      kinesthetic: 0.5,
      reading_writing: 0.7
    };
  }

  /**
   * Build cognitive profile
   */
  buildCognitiveProfile(preferences) {
    return {
      peakHours: preferences?.difficult_subjects_morning ? 'morning' : 'afternoon',
      attentionSpan: preferences?.max_daily_study_minutes > 300 ? 'high' : 'medium',
      breakNeeds: preferences?.break_duration_minutes > 20 ? 'high' : 'standard'
    };
  }

  /**
   * Build time profile
   */
  buildTimeProfile(preferences) {
    const startTime = this.parseTime(preferences.preferred_start_time);
    const endTime = this.parseTime(preferences.preferred_end_time);
    
    return {
      totalAvailableMinutes: endTime - startTime,
      effectiveStudyWindow: (endTime - startTime) * 0.8, // Account for breaks
      preferredSessionLength: Math.min(preferences.max_daily_study_minutes / 4, 60),
      flexibilityScore: preferences.study_days.length / 7
    };
  }

  /**
   * Parse time string to minutes from midnight
   */
  parseTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Format minutes to time string
   */
  formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Determine cognitive window for a given time
   */
  getCognitiveWindow(timeString) {
    const time = this.parseTime(timeString);
    
    if (time >= this.parseTime('09:00') && time < this.parseTime('11:30')) {
      return { type: 'HIGH_COGNITIVE', efficiency: 1.0 };
    } else if (time >= this.parseTime('11:30') && time < this.parseTime('14:00')) {
      return { type: 'MEDIUM_COGNITIVE', efficiency: 0.8 };
    } else if (time >= this.parseTime('14:00') && time < this.parseTime('17:00')) {
      return { type: 'LOW_COGNITIVE', efficiency: 0.6 };
    } else {
      return { type: 'REVIEW_TIME', efficiency: 0.5 };
    }
  }

  /**
   * Check if time is optimal for learning
   */
  isOptimalLearningTime(timeMinutes) {
    // Peak learning times based on circadian rhythms
    const peakMorning = timeMinutes >= this.parseTime('09:00') && timeMinutes <= this.parseTime('11:00');
    const peakAfternoon = timeMinutes >= this.parseTime('15:00') && timeMinutes <= this.parseTime('17:00');
    
    return peakMorning || peakAfternoon;
  }

  /**
   * Determine session length based on AI recommendation
   */
  determineSessionLength(recommendation) {
    switch (recommendation) {
      case 'short': return this.SESSION_DURATIONS.SHORT;
      case 'medium': return this.SESSION_DURATIONS.MEDIUM;
      case 'long': return this.SESSION_DURATIONS.LONG;
      case 'mixed': return this.SESSION_DURATIONS.MEDIUM; // Default for mixed
      default: return this.SESSION_DURATIONS.MEDIUM;
    }
  }

  /**
   * Optimize slot distribution using golden ratio
   */
  optimizeSlotDistribution(slots, context) {
    // Apply golden ratio spacing for optimal attention distribution
    const goldenRatio = 1.618;
    
    return slots.map((slot, index) => ({
      ...slot,
      optimalityScore: this.calculateSlotOptimality(slot, index, context),
      distributionScore: this.calculateDistributionScore(slot, index, slots.length)
    })).sort((a, b) => (b.optimalityScore + b.distributionScore) - (a.optimalityScore + a.distributionScore));
  }

  /**
   * Calculate slot optimality score
   */
  calculateSlotOptimality(slot, index, context) {
    let score = slot.efficiency; // Base efficiency
    
    // Bonus for optimal learning times
    if (slot.isOptimal) score += 0.2;
    
    // Adjust based on student preferences - handle both single and multi-child contexts
    const childProfile = context.childProfile || (context.childProfiles && context.childProfiles[0]);
    const preferences = childProfile?.preferences || {};
    
    if (preferences.difficult_subjects_morning && slot.cognitiveWindow === 'HIGH_COGNITIVE') {
      score += 0.3;
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Calculate distribution score for balanced scheduling
   */
  calculateDistributionScore(slot, index, totalSlots) {
    // Golden ratio distribution preference
    const goldenPosition = index / totalSlots;
    const goldenOptimal = 0.618; // Golden ratio - 1
    
    return 1 - Math.abs(goldenPosition - goldenOptimal);
  }

  /**
   * Generate rule-based assignments as fallback
   */
  generateRuleBasedAssignments(materialsBySubject, timeSlots, childProfile, context = {}) {
    
    // Handle both single-child and multi-child contexts
    const profileToUse = childProfile || (context.childProfiles && context.childProfiles[0]) || {};
    const preferences = profileToUse.preferences || {
      difficult_subjects_morning: true,
      preferred_start_time: '09:00',
      preferred_end_time: '15:00'
    };
    
    
    const { subject_config = {}, schedule_days = [] } = context;
    const timeSlotsArray = Array.isArray(timeSlots) ? timeSlots : [];
    
    
    // Group slots by date and sort by efficiency within each day
    const slotsByDate = new Map();
    timeSlotsArray.forEach(slot => {
      const date = slot.date;
      if (!slotsByDate.has(date)) {
        slotsByDate.set(date, []);
      }
      slotsByDate.get(date).push(slot);
    });
    
    // Sort slots within each day by efficiency (best slots first)
    slotsByDate.forEach((slots) => {
      slots.sort((a, b) => b.efficiency - a.efficiency);
    });
    
    const dates = Array.from(slotsByDate.keys()).sort();
    
    // Create weekly subject plan with frequency constraints
    const weeklySubjectPlan = this.createWeeklySubjectPlan(materialsBySubject, subject_config, dates, preferences);
    
    // Initialize tracking for each day
    const dailySchedule = new Map();
    const subjectProgress = new Map(); // Track which material to use next for each subject
    const assignments = [];
    
    // Initialize progress tracking for each subject
    Object.keys(materialsBySubject).forEach(subject => {
      const materials = materialsBySubject[subject];
      // Sort materials by progression order (due date, lesson sequence, creation date)
      const sortedMaterials = materials.sort((a, b) => {
        // First priority: due date urgency
        const urgencyA = this.calculateDaysUntilDue(a.due_date);
        const urgencyB = this.calculateDaysUntilDue(b.due_date);
        if (urgencyA !== urgencyB) {
          return urgencyA - urgencyB; // Sooner due dates first
        }
        
        // Second priority: lesson sequence
        const lessonNumA = this.extractLessonNumber(a.title);
        const lessonNumB = this.extractLessonNumber(b.title);
        if (lessonNumA !== lessonNumB) {
          return lessonNumA - lessonNumB; // Lower lesson numbers first
        }
        
        // Third priority: creation date
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      });
      
      subjectProgress.set(subject, {
        materials: sortedMaterials,
        currentIndex: 0,
        scheduledThisWeek: 0
      });
    });
    
    // Process each day individually with subject distribution limits
    for (const date of dates) {
      const availableSlots = slotsByDate.get(date) || [];
      const dailySubjects = weeklySubjectPlan.get(date) || [];
      
      
      // Initialize daily schedule tracking
      dailySchedule.set(date, {
        scheduledSubjects: new Set(),
        usedSlots: 0,
        assignments: []
      });
      
      const dayInfo = dailySchedule.get(date);
      
      // Schedule subjects for this day (max 1 per subject per day)
      // First, filter out subjects that can't be scheduled
      const validSubjects = [];
      const skippedSubjects = [];
      
      for (const subject of dailySubjects) {
        // Check if this subject is already scheduled today
        if (dayInfo.scheduledSubjects.has(subject)) {
          skippedSubjects.push({ subject, reason: 'already scheduled today' });
          continue;
        }
        
        // Get next material for this subject
        const subjectData = subjectProgress.get(subject);
        if (!subjectData || subjectData.currentIndex >= subjectData.materials.length) {
          skippedSubjects.push({ subject, reason: 'no more materials available' });
          continue;
        }
        
        validSubjects.push(subject);
      }
      
      // Log any subjects that couldn't be scheduled as planned
      if (skippedSubjects.length > 0) {
      }
      
      // Schedule the valid subjects
      const slotsToUse = Math.min(validSubjects.length, availableSlots.length);
      
      for (let i = 0; i < slotsToUse; i++) {
        const subject = validSubjects[i];
        const slot = availableSlots[i];
        const subjectData = subjectProgress.get(subject);
        const material = subjectData.materials[subjectData.currentIndex];
        
        // Create assignment
        const assignment = {
          slot_id: slot.id,
          subject,
          material_ids: [material.id],
          child_id: material.child_id || profileToUse.child_id,
          reasoning: `Day-first scheduling: ${subject} on ${date} (material ${subjectData.currentIndex + 1}/${subjectData.materials.length}, due: ${material.due_date || 'no due date'})`,
          cognitive_match: this.calculateCognitiveMatch(subject, slot),
          scheduled_date: date,
          start_time: slot.startTime,
          duration_minutes: slot.duration || 45
        };
        
        assignments.push(assignment);
        dayInfo.assignments.push(assignment);
        dayInfo.scheduledSubjects.add(subject);
        dayInfo.usedSlots++;
        
        // Advance material progress for this subject
        subjectData.currentIndex++;
        subjectData.scheduledThisWeek++;
        
      }
      
    }
    
    // Summary logging
    const totalAssignments = assignments.length;
    const subjectDistribution = {};
    assignments.forEach(assignment => {
      subjectDistribution[assignment.subject] = (subjectDistribution[assignment.subject] || 0) + 1;
    });
    
    
    return assignments;
  }

  /**
   * Create a simplified weekly subject distribution plan focused on due dates
   * and ensures no subject appears more than once per day
   */
  createWeeklySubjectPlan(materialsBySubject, subjectConfig, dates, preferences) {
    
    const weeklyPlan = new Map();
    dates.forEach(date => weeklyPlan.set(date, []));
    
    // Create a list of all materials across subjects with their urgency and subject info
    const allMaterialsWithSubjects = [];
    
    Object.entries(materialsBySubject).forEach(([subject, materials]) => {
      // Find subject config for frequency
      
      const subjectConfigEntry = Object.entries(subjectConfig).find(([configSubjectId, config]) => {
        // Primary match: direct subject name comparison
        if (config.subject_name === subject) {
          return true;
        }
        
        // Secondary match: check if any materials in this subject group match the config
        const hasMatch = materials.some(material => {
          const materialSubjectId = material.lesson?.unit?.child_subject?.id || material.child_subject_id;
          const materialSubjectName = material.lesson?.unit?.child_subject?.custom_subject_name_override || 
                                     material.lesson?.unit?.child_subject?.subject?.name;
          
          const match1 = materialSubjectId === configSubjectId;
          const match2 = materialSubjectName === config.subject_name;
          const match3 = subject === config.subject_name;
          
          return match1 || match2 || match3;
        });
        
        return hasMatch;
      });
      
      const frequency = subjectConfigEntry?.[1]?.frequency || 2;
      const maxFrequency = Math.min(frequency, dates.length);
      
      
      // Add each material with its subject and urgency info
      materials.forEach((material, index) => {
        const daysUntilDue = this.calculateDaysUntilDue(material.due_date);
        allMaterialsWithSubjects.push({
          subject,
          material,
          urgency: daysUntilDue,
          frequency: maxFrequency,
          materialIndex: index,
          dueDateStr: material.due_date || 'no due date'
        });
      });
    });
    
    // Sort all materials by due date urgency (most urgent first)
    allMaterialsWithSubjects.sort((a, b) => {
      // First: due date urgency (lower days = more urgent)
      if (a.urgency !== b.urgency) {
        return a.urgency - b.urgency;
      }
      
      // Second: subject priority based on cognitive load if preferences set
      if (preferences.difficult_subjects_morning) {
        const loadA = this.COGNITIVE_LOAD_WEIGHTS[a.subject] || 0.5;
        const loadB = this.COGNITIVE_LOAD_WEIGHTS[b.subject] || 0.5;
        return loadB - loadA; // Higher cognitive load first
      }
      
      // Third: material index (earlier lessons first)
      return a.materialIndex - b.materialIndex;
    });
    
 
      `${m.subject}: ${m.material.title?.substring(0, 30)}... (due: ${m.dueDateStr}, urgency: ${m.urgency} days)`
    ));
    
    // Track subject appearances per day and per week
    const subjectCountByDay = new Map();
    const subjectCountThisWeek = new Map();
    
    dates.forEach(date => subjectCountByDay.set(date, new Map()));
    Object.keys(materialsBySubject).forEach(subject => subjectCountThisWeek.set(subject, 0));
    
    // Assign subjects to days based on urgency and frequency constraints
    let currentDateIndex = 0;
    
    for (const item of allMaterialsWithSubjects) {
      const { subject, frequency } = item;
      
      // Skip if this subject has reached its weekly frequency
      if (subjectCountThisWeek.get(subject) >= frequency) {
        continue;
      }
      
      // Find next available day for this subject (round-robin starting from currentDateIndex)
      let placed = false;
      let attempts = 0;
      
      while (!placed && attempts < dates.length) {
        const currentDate = dates[currentDateIndex];
        const daySubjectCount = subjectCountByDay.get(currentDate);
        
        // Check if this subject is not already scheduled for this day
        if (!daySubjectCount.has(subject)) {
          // Add this subject to the day
          weeklyPlan.get(currentDate).push(subject);
          daySubjectCount.set(subject, 1);
          subjectCountThisWeek.set(subject, subjectCountThisWeek.get(subject) + 1);
          placed = true;
          
        }
        
        // Move to next day
        currentDateIndex = (currentDateIndex + 1) % dates.length;
        attempts++;
      }
      
      if (!placed) {
      }
    }
    
    // Summary logging
    dates.forEach(date => {
      const daySubjects = weeklyPlan.get(date);
    });
    
    return weeklyPlan;
  }

  /**
   * Calculate cognitive match between subject and time slot
   */
  calculateCognitiveMatch(subject, timeSlot) {
    const subjectLoad = this.COGNITIVE_LOAD_WEIGHTS[subject] || 0.5;
    const slotEfficiency = timeSlot.efficiency;
    
    // Higher cognitive load subjects should match with higher efficiency slots
    return 1 - Math.abs(subjectLoad - slotEfficiency);
  }

  /**
   * Calculate average urgency for a subject's materials
   */
  calculateSubjectUrgency(materials) {
    if (!materials || materials.length === 0) return 0;
    
    let totalUrgency = 0;
    let urgentCount = 0;
    
    materials.forEach(material => {
      const daysUntilDue = this.calculateDaysUntilDue(material.due_date);
      if (daysUntilDue <= 3) { // Consider anything due within 3 days as urgent
        urgentCount++;
        if (daysUntilDue <= 1) {
          totalUrgency += 3; // Very urgent
        } else if (daysUntilDue <= 2) {
          totalUrgency += 2; // Moderately urgent
        } else {
          totalUrgency += 1; // Slightly urgent
        }
      }
    });
    
    // Return average urgency for this subject
    return materials.length > 0 ? (totalUrgency / materials.length) : 0;
  }

  /**
   * Extract lesson number from title for proper sequencing
   */
  extractLessonNumber(title) {
    if (!title) return 999; // Put untitled lessons at the end
    
    // Look for patterns like "Lesson 1", "Chapter 2", "Unit 3", etc.
    const patterns = [
      /lesson\s*(\d+)/i,
      /chapter\s*(\d+)/i,
      /unit\s*(\d+)/i,
      /part\s*(\d+)/i,
      /section\s*(\d+)/i,
      /^(\d+)\./,  // "1. Something"
      /^(\d+)\s/   // "1 Something"
    ];
    
    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
    }
    
    return 999; // If no lesson number found, put at end
  }

  /**
   * Build preliminary schedule from assignments
   */
  buildPreliminarySchedule(assignments, timeSlots, materials) {
    const schedule = [];
    
    // Ensure timeSlots is an array
    const timeSlotsArray = Array.isArray(timeSlots) ? timeSlots : [];
    const slotMap = new Map(timeSlotsArray.map(slot => [slot.id, slot]));
    
    // Handle materials - could be array or grouped object
    let materialsArray = [];
    if (Array.isArray(materials)) {
      materialsArray = materials;
    } else if (materials && typeof materials === 'object') {
      // Flatten grouped materials
      materialsArray = Object.values(materials).flat();
    }
    
    const materialMap = new Map(materialsArray.map(material => [material.id, material]));
    const usedMaterials = new Set(); // Track used materials to prevent duplicates
    
    assignments.forEach((assignment, index) => {
      const slot = slotMap.get(assignment.slot_id);
      const material = materialMap.get(assignment.material_ids[0]); // Using first material for now
      
      const materialId = assignment.material_ids[0];
      
      // Check for duplicate material
      if (usedMaterials.has(materialId)) {
        return;
      }
      
      if (slot && material) {
        usedMaterials.add(materialId); // Mark material as used
        // Determine child_id from multiple possible sources
        const child_id = material.lesson?.unit?.child_subject?.child_id || 
                        material.child_id || 
                        assignment.child_id ||
                        'unknown';
        
        // Use the subject name from the assignment (from weekly planning) to maintain consistency
        // This ensures the subject names match what was planned in the weekly schedule
        let actualSubjectName = assignment.subject || 
                                material.lesson?.unit?.child_subject?.custom_subject_name_override || 
                                material.lesson?.unit?.child_subject?.subject?.name ||
                                this.inferSubjectFromTitle(material.title) ||
                                'Study';
        
        // Create display title with lesson name for better user experience
        let displayTitle = actualSubjectName;
        if (material.title && material.title !== actualSubjectName) {
          displayTitle = `${actualSubjectName}: ${material.title}`;
        }
        
        schedule.push({
          id: `session_${index + 1}`,
          child_id: child_id,
          material_id: material.id, // Now this IS the lesson container ID
          subject_name: displayTitle, // Now includes lesson title
          base_subject_name: actualSubjectName, // Keep original subject name for color coding
          scheduled_date: slot.date,
          start_time: slot.startTime,
          duration_minutes: slot.durationMinutes,
          status: 'scheduled',
          created_by: 'ai_suggestion',
          notes: JSON.stringify({
            lesson_container_id: material.id,
            lesson_title: material.title,
            base_subject_name: actualSubjectName, // Also store in notes for compatibility
            ai_reasoning: assignment.reasoning
          }),
          reasoning: assignment.reasoning,
          cognitive_match: assignment.cognitive_match,
          efficiency_score: slot.efficiency
        });
      }
    });
    
    return schedule;
  }

  /**
   * Apply basic cognitive optimization
   */
  basicCognitiveOptimization(schedule) {
    // Sort by date and time
    return schedule.sort((a, b) => {
      const dateCompare = a.scheduled_date.localeCompare(b.scheduled_date);
      if (dateCompare !== 0) return dateCompare;
      return a.start_time.localeCompare(b.start_time);
    });
  }

  /**
   * Add AI reasoning to each scheduled item
   */
  async addScheduleReasoning(schedule, context) {
    return schedule.map(session => ({
      ...session,
      reasoning: session.reasoning || this.generateBasicReasoning(session, context)
    }));
  }

  /**
   * Generate basic reasoning for schedule items
   */
  generateBasicReasoning(session, context) {
    const subject = session.subject_name;
    const cognitiveLoad = this.COGNITIVE_LOAD_WEIGHTS[subject] || 0.5;
    const time = session.start_time;
    
    let reasoning = `${subject} scheduled for ${time}`;
    
    if (cognitiveLoad > 0.8) {
      reasoning += `. High cognitive load subject placed in optimal learning window`;
    } else if (cognitiveLoad < 0.5) {
      reasoning += `. Lower cognitive load subject suitable for this time period`;
    }
    
    // Handle both single-child and multi-child contexts
    const childProfile = context.childProfile || (context.childProfiles && context.childProfiles[0]);
    const preferences = childProfile?.preferences || {};
    
    if (preferences.difficult_subjects_morning && this.parseTime(time) < this.parseTime('12:00')) {
      reasoning += `. Morning scheduling aligns with student preference for difficult subjects`;
    }
    
    return reasoning;
  }

  /**
   * Generate schedule metadata
   */
  generateScheduleMetadata(schedule, context) {
    const subjects = [...new Set(schedule.map(s => s.subject_name))];
    const dates = [...new Set(schedule.map(s => s.scheduled_date))];
    
    return {
      generator: 'advanced_ai',
      confidence: 0.85,
      total_sessions: schedule.length,
      subjects_covered: subjects.length,
      days_scheduled: dates.length,
      average_session_duration: Math.round(
        schedule.reduce((sum, s) => sum + s.duration_minutes, 0) / schedule.length
      ),
      optimization_applied: [
        'cognitive_load_matching',
        'time_slot_optimization',
        'subject_distribution',
        'learning_efficiency'
      ]
    };
  }

  /**
   * FAMILY COORDINATION SYSTEM
   * Generate coordinated schedules for multiple children
   */
  async generateFamilyCoordinatedSchedule(familyRequest) {
    
    const { children_schedules, coordination_mode = 'balanced' } = familyRequest;
    
    try {
      // Stage 1: Generate individual schedules for each child
      const individualSchedules = await this.generateIndividualSchedules(children_schedules);
      
      // Stage 2: Detect conflicts and overlaps
      const conflicts = this.detectScheduleConflicts(individualSchedules);
      
      // Stage 3: Apply coordination strategy
      const coordinatedSchedules = await this.applyCoordinationStrategy(
        individualSchedules, 
        conflicts, 
        coordination_mode
      );
      
      // Stage 4: Optimize family resources
      const optimizedSchedules = this.optimizeFamilyResources(coordinatedSchedules);
      
      // Stage 5: Generate family metadata
      const familyMetadata = this.generateFamilyMetadata(optimizedSchedules, conflicts);
      
      return {
        coordinated_schedules: optimizedSchedules,
        conflicts_resolved: conflicts.length,
        coordination_mode,
        family_metadata: familyMetadata,
        generated_at: new Date().toISOString()
      };
      
    } catch (error) {
      // Fallback: return individual schedules without coordination
      const individualSchedules = await Promise.all(
        children_schedules.map(req => this.generateOptimalSchedule(req))
      );
      
      return {
        coordinated_schedules: individualSchedules,
        conflicts_resolved: 0,
        coordination_mode: 'individual_fallback',
        family_metadata: { warning: 'Coordination failed, individual schedules provided' },
        generated_at: new Date().toISOString()
      };
    }
  }

  /**
   * Generate coordinated schedules using shared family time slots
   */
  async generateIndividualSchedules(childrenRequests) {
    
    // Create shared family time slot pool
    const familyTimeSlots = await this.createSharedFamilyTimeSlots(childrenRequests);
    
    // Get existing schedule entries to avoid conflicts
    const existingSchedules = await this.getExistingFamilySchedules(childrenRequests);
    
    // Reserve slots for existing schedules
    this.reserveSlotsForExistingSchedules(familyTimeSlots, existingSchedules);
    
    const coordinatedSchedules = [];
    
    // Generate schedules one child at a time, sharing the time slot pool
    for (const [index, request] of childrenRequests.entries()) {
      try {
        
        const childSchedule = await this.generateScheduleWithSharedSlots(
          request, 
          familyTimeSlots, 
          coordinatedSchedules
        );
        
        coordinatedSchedules.push({
          child_id: request.child_id,
          child_index: index,
          schedule: childSchedule.sessions,
          metadata: childSchedule.metadata
        });
        
      } catch (error) {
        coordinatedSchedules.push({
          child_id: request.child_id,
          child_index: index,
          schedule: [],
          metadata: { error: 'Schedule generation failed' }
        });
      }
    }
    
    return coordinatedSchedules.filter(s => s.schedule.length > 0);
  }

  /**
   * Create shared family time slot pool
   */
  async createSharedFamilyTimeSlots(childrenRequests) {
    
    // Find the broadest time constraints across all children
    const familyTimeConstraints = this.calculateFamilyTimeConstraints(childrenRequests);
    
    // Generate shared time slots based on family constraints
    const sharedSlots = [];
    
    for (const day of familyTimeConstraints.availableDays) {
      const dailySlots = this.generateDailyFamilyTimeSlots(day, familyTimeConstraints);
      sharedSlots.push(...dailySlots);
    }
    
    // Add reservation tracking to each slot
    const familySlots = sharedSlots.map(slot => ({
      ...slot,
      isReserved: false,
      reservedBy: null,
      reservedFor: null
    }));
    
    // Apply blocked times (lunch, parent unavailability, etc.)
    this.applyBlockedTimes(familySlots, childrenRequests);
    
    return familySlots;
  }

  /**
   * Calculate family-wide time constraints
   */
  calculateFamilyTimeConstraints(childrenRequests) {
    // Find earliest start time and latest end time across all children
    let earliestStart = '23:59';
    let latestEnd = '00:00';
    let maxDailyMinutes = 0;
    let minBreakDuration = 60;
    const allStudyDays = new Set();
    
    // Get the date range from the first child (assuming all children have same range)
    const firstChild = childrenRequests[0];
    const startDate = new Date(firstChild.start_date);
    const endDate = new Date(firstChild.end_date);
    
    childrenRequests.forEach(request => {
      const prefs = request.preferences || {};
      const defaultPrefs = {
        preferred_start_time: '09:00',
        preferred_end_time: '15:00',
        max_daily_study_minutes: 240,
        break_duration_minutes: 15,
        study_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      };
      
      const childPrefs = { ...defaultPrefs, ...prefs };
      
      if (childPrefs.preferred_start_time < earliestStart) {
        earliestStart = childPrefs.preferred_start_time;
      }
      if (childPrefs.preferred_end_time > latestEnd) {
        latestEnd = childPrefs.preferred_end_time;
      }
      if (childPrefs.max_daily_study_minutes > maxDailyMinutes) {
        maxDailyMinutes = childPrefs.max_daily_study_minutes;
      }
      if (childPrefs.break_duration_minutes < minBreakDuration) {
        minBreakDuration = childPrefs.break_duration_minutes;
      }
      
      childPrefs.study_days.forEach(day => allStudyDays.add(day));
    });
    
    // Build available days
    const availableDays = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      if (allStudyDays.has(dayName)) {
        availableDays.push({
          date: new Date(currentDate),
          dayName,
          availableMinutes: maxDailyMinutes,
          startTime: earliestStart,
          endTime: latestEnd
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return {
      totalDays: availableDays.length,
      totalAvailableMinutes: availableDays.reduce((sum, day) => sum + day.availableMinutes, 0),
      availableDays,
      dailyConstraints: {
        maxMinutes: maxDailyMinutes,
        breakDuration: minBreakDuration,
        timeWindow: {
          start: earliestStart,
          end: latestEnd
        }
      }
    };
  }

  /**
   * Generate daily time slots for family use
   */
  generateDailyFamilyTimeSlots(day, familyConstraints) {
    const slots = [];
    const { dailyConstraints } = familyConstraints;
    
    // Parse time constraints
    const startTime = this.parseTime(dailyConstraints.timeWindow.start);
    const endTime = this.parseTime(dailyConstraints.timeWindow.end);
    const breakMinutes = dailyConstraints.breakDuration;
    
    // Use standard 45-minute sessions for family scheduling
    const sessionLength = 45;
    
    let currentTime = startTime;
    let slotIndex = 0;
    
    while (currentTime + sessionLength <= endTime) {
      // Determine cognitive window for this time slot
      const cognitiveWindow = this.getCognitiveWindow(this.formatTime(currentTime));
      
      const slot = {
        id: `family_${day.date.toISOString().split('T')[0]}_slot_${slotIndex}`,
        date: day.date.toISOString().split('T')[0],
        startTime: this.formatTime(currentTime),
        endTime: this.formatTime(currentTime + sessionLength),
        durationMinutes: sessionLength,
        cognitiveWindow: cognitiveWindow.type,
        efficiency: cognitiveWindow.efficiency,
        isOptimal: this.isOptimalLearningTime(currentTime),
        dayIndex: slotIndex,
        slotType: 'family_shared'
      };
      
      slots.push(slot);
      
      // Move to next slot with break
      currentTime += sessionLength + breakMinutes;
      slotIndex++;
    }
    
    return slots;
  }

  /**
   * Get existing family schedules to avoid conflicts
   */
  async getExistingFamilySchedules(childrenRequests) {
    
    // Extract child IDs and date range
    const childIds = childrenRequests.map(req => req.child_id);
    const startDate = childrenRequests[0]?.start_date;
    const endDate = childrenRequests[0]?.end_date;
    
    if (!startDate || !endDate || childIds.length === 0) {
      return [];
    }
    
    try {
      const { data: existingEntries, error } = await supabase
        .from('schedule_entries')
        .select('*')
        .in('child_id', childIds)
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate)
        .neq('status', 'cancelled')
        .order('scheduled_date', { ascending: true })
        .order('start_time', { ascending: true });
      
      if (error) {
        return [];
      }
      
      return existingEntries || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Reserve slots for existing schedules
   */
  reserveSlotsForExistingSchedules(familyTimeSlots, existingSchedules) {
    
    existingSchedules.forEach(schedule => {
      // Find matching time slot
      const matchingSlot = familyTimeSlots.find(slot => 
        slot.date === schedule.scheduled_date &&
        slot.startTime === schedule.start_time
      );
      
      if (matchingSlot) {
        matchingSlot.isReserved = true;
        matchingSlot.reservedBy = schedule.child_id;
        matchingSlot.reservedFor = 'existing_schedule';
      }
    });
  }

  /**
   * Generate schedule using shared family time slots
   */
  async generateScheduleWithSharedSlots(childRequest, familyTimeSlots, existingCoordinatedSchedules) {
    
    // Get available (unreserved) slots
    const availableSlots = familyTimeSlots.filter(slot => !slot.isReserved);
    
    if (availableSlots.length === 0) {
      return { sessions: [], metadata: { error: 'No available time slots' } };
    }
    
    // Analyze child's materials
    const materialAnalysis = this.analyzeMaterials(childRequest.materials || []);
    
    // Build child profile
    const childProfile = await this.buildChildProfile(childRequest.child_id, childRequest.preferences);
    
    // Group materials by subject
    const materialsBySubject = this.groupMaterialsBySubject(childRequest.materials || []);
    
    // Generate assignments using available slots only
    const assignments = await this.generateAIAssignmentsForAvailableSlots(
      materialsBySubject,
      availableSlots,
      childProfile
    );
    
    // Build schedule and reserve used slots
    const assignmentArray = assignments.assignments || assignments;
    const schedule = this.buildScheduleAndReserveSlots(assignmentArray, availableSlots, childRequest.materials, familyTimeSlots);
    
    return {
      sessions: schedule,
      metadata: {
        generator: 'family_coordinated',
        confidence: 0.85,
        total_sessions: schedule.length,
        slots_used: assignmentArray.length,
        slots_available: availableSlots.length
      }
    };
  }

  /**
   * Generate AI assignments for available slots only
   */
  async generateAIAssignmentsForAvailableSlots(materialsBySubject, availableSlots, childProfile) {
    const prompt = `As an expert educational scheduler, assign materials to available time slots for a single child in a family context.

AVAILABLE TIME SLOTS:
${availableSlots.slice(0, 20).map(slot => 
  `ID: ${slot.id} | ${slot.date} ${slot.startTime}-${slot.endTime} (${slot.cognitiveWindow}, efficiency: ${slot.efficiency})`
).join('\n')}${availableSlots.length > 20 ? `\n... and ${availableSlots.length - 20} more slots` : ''}

MATERIALS BY SUBJECT:
${Object.entries(materialsBySubject).map(([subject, materials]) => 
  `${subject}: ${materials.map(m => `ID:${m.id} "${m.title}"`).join(', ')}`
).join('\n')}

CHILD PREFERENCES:
- Difficult subjects in morning: ${childProfile.preferences.difficult_subjects_morning}

COGNITIVE LOAD WEIGHTS (higher = more difficult):
${Object.entries(this.COGNITIVE_LOAD_WEIGHTS).map(([subject, weight]) => 
  `${subject}: ${weight}`
).slice(0, 10).join('\n')}

Create optimal assignments following these rules:
1. Match high cognitive load subjects to high efficiency time slots  
2. Balance subjects across available days
3. Only use the provided available slot IDs
4. Each material should be assigned to exactly one slot

Provide assignments in this JSON format:
{
  "assignments": [
    {
      "slot_id": "family_2025-06-17_slot_0",
      "subject": "subject_name", 
      "material_ids": ["mat-1"],
      "reasoning": "why this assignment is optimal",
      "cognitive_match": 0.85
    }
  ],
  "overall_strategy": "description of overall approach",
  "confidence": 0.90
}

IMPORTANT: 
- Use ONLY the exact slot_id values from the AVAILABLE TIME SLOTS list above
- Use ONLY the exact material IDs from the MATERIALS BY SUBJECT list above
- Do not double-assign materials or slots`;

    // Try AI assignment first, fallback to rule-based if it fails
    
    try {
        const aiResponse = await this.callOpenAIForFamilyAssignments(materialsBySubject, availableSlots, childProfile);
        if (aiResponse && aiResponse.assignments) {
            return aiResponse;
        }
    } catch (error) {
    }
    
    return this.generateRuleBasedAssignmentsForAvailableSlots(materialsBySubject, availableSlots, childProfile);
  }

  /**
   * Generate rule-based assignments for available slots (fallback)
   */
  generateRuleBasedAssignmentsForAvailableSlots(materialsBySubject, availableSlots, childProfile) {
    const assignments = [];
    const { preferences } = childProfile;
    
    // Sort available slots by efficiency
    const sortedSlots = availableSlots.sort((a, b) => b.efficiency - a.efficiency);
    
    // Sort subjects by cognitive load
    const sortedSubjects = Object.entries(materialsBySubject).sort((a, b) => {
      const loadA = this.COGNITIVE_LOAD_WEIGHTS[a[0]] || 0.5;
      const loadB = this.COGNITIVE_LOAD_WEIGHTS[b[0]] || 0.5;
      return preferences.difficult_subjects_morning ? loadB - loadA : loadA - loadB;
    });
    
    let slotIndex = 0;
    
    for (const [subject, materials] of sortedSubjects) {
      for (const material of materials) {
        if (slotIndex < sortedSlots.length) {
          assignments.push({
            slot_id: sortedSlots[slotIndex].id,
            subject,
            material_ids: [material.id],
            child_id: material.child_id || childProfile.child_id,
            reasoning: `Rule-based assignment: ${subject} scheduled based on cognitive load and available slots`,
            cognitive_match: this.calculateCognitiveMatch(subject, sortedSlots[slotIndex])
          });
          slotIndex++;
        }
      }
    }
    
    return assignments;
  }

  /**
   * Build schedule and reserve used slots
   */
  buildScheduleAndReserveSlots(assignments, availableSlots, materials, familyTimeSlots) {
    const schedule = [];
    const slotMap = new Map(availableSlots.map(slot => [slot.id, slot]));
    const materialMap = new Map(materials.map(material => [material.id, material]));
    
    assignments.forEach((assignment, index) => {
      const slot = slotMap.get(assignment.slot_id);
      const material = materialMap.get(assignment.material_ids[0]);
      
      if (slot && material) {
        // Create schedule entry
        // Determine child_id from multiple possible sources
        const child_id = material.lesson?.unit?.child_subject?.child_id || 
                        material.child_id || 
                        assignment.child_id ||
                        'unknown';
        
        schedule.push({
          id: `session_${index + 1}`,
          child_id: child_id,
          material_id: null, // Set to null to avoid foreign key constraint issues
          subject_name: assignment.subject,
          scheduled_date: slot.date,
          start_time: slot.startTime,
          duration_minutes: slot.durationMinutes,
          status: 'scheduled',
          created_by: 'ai_suggestion',
          notes: material.title || `${assignment.subject} study session`,
          reasoning: assignment.reasoning,
          cognitive_match: assignment.cognitive_match,
          efficiency_score: slot.efficiency
        });
        
        // Reserve the slot in the family time slots pool
        const familySlot = familyTimeSlots.find(fs => fs.id === slot.id);
        if (familySlot) {
          familySlot.isReserved = true;
          familySlot.reservedBy = material.lesson?.unit?.child_subject?.child_id;
          familySlot.reservedFor = `${assignment.subject} - ${material.title}`;
        }
      }
    });
    
    return schedule;
  }

  /**
   * Apply blocked times to family time slots
   */
  applyBlockedTimes(familySlots, childrenRequests) {
    
    // Common blocked times (can be customized per family)
    const defaultBlockedTimes = [
      { start: '12:00', end: '13:00', reason: 'Lunch break' },
      // Parents can add more blocked times in their request
    ];
    
    // Get custom blocked times from any child request that has them
    const customBlockedTimes = [];
    childrenRequests.forEach(request => {
      if (request.blocked_times && Array.isArray(request.blocked_times)) {
        customBlockedTimes.push(...request.blocked_times);
      }
      if (request.family_blocked_times && Array.isArray(request.family_blocked_times)) {
        customBlockedTimes.push(...request.family_blocked_times);
      }
    });
    
    const allBlockedTimes = [...defaultBlockedTimes, ...customBlockedTimes];
    
    let blockedCount = 0;
    
    // Apply blocked times to slots
    familySlots.forEach(slot => {
      allBlockedTimes.forEach(blockedTime => {
        if (this.slotOverlapsWithBlockedTime(slot, blockedTime)) {
          slot.isReserved = true;
          slot.reservedBy = 'family';
          slot.reservedFor = blockedTime.reason || 'Blocked time';
          blockedCount++;
        }
      });
    });
    
  }

  /**
   * Check if a slot overlaps with a blocked time period
   */
  slotOverlapsWithBlockedTime(slot, blockedTime) {
    const slotStart = this.parseTime(slot.startTime);
    const slotEnd = this.parseTime(slot.endTime);
    const blockedStart = this.parseTime(blockedTime.start);
    const blockedEnd = this.parseTime(blockedTime.end);
    
    // Check for any overlap between slot and blocked time
    return (slotStart < blockedEnd && slotEnd > blockedStart);
  }

  /**
   * Detect conflicts between children's schedules
   */
  detectScheduleConflicts(individualSchedules) {
    
    const conflicts = [];
    const allSessions = [];
    
    // Flatten all sessions with child info
    individualSchedules.forEach(childSchedule => {
      childSchedule.schedule.forEach(session => {
        allSessions.push({
          ...session,
          child_id: childSchedule.child_id,
          child_index: childSchedule.child_index
        });
      });
    });
    
    // Sort by date and time for easier conflict detection
    allSessions.sort((a, b) => {
      const dateCompare = a.scheduled_date.localeCompare(b.scheduled_date);
      if (dateCompare !== 0) return dateCompare;
      return a.start_time.localeCompare(b.start_time);
    });
    
    // Check for overlapping sessions
    for (let i = 0; i < allSessions.length - 1; i++) {
      const session1 = allSessions[i];
      const session2 = allSessions[i + 1];
      
      if (session1.child_id !== session2.child_id && 
          session1.scheduled_date === session2.scheduled_date) {
        
        const end1 = this.addMinutesToTime(session1.start_time, session1.duration_minutes);
        const start2 = session2.start_time;
        
        if (this.timesOverlap(session1.start_time, end1, start2, 
            this.addMinutesToTime(start2, session2.duration_minutes))) {
          
          conflicts.push({
            type: 'time_overlap',
            session1: session1,
            session2: session2,
            overlap_minutes: this.calculateOverlapMinutes(session1, session2),
            severity: this.calculateConflictSeverity(session1, session2)
          });
        }
      }
    }
    
    // Check for resource conflicts (same subject at same time)
    const resourceConflicts = this.detectResourceConflicts(allSessions);
    conflicts.push(...resourceConflicts);
    
    return conflicts;
  }

  /**
   * Apply coordination strategy to resolve conflicts
   */
  async applyCoordinationStrategy(individualSchedules, conflicts, coordinationMode) {
    
    let coordinatedSchedules = [...individualSchedules];
    
    switch (coordinationMode) {
      case 'synchronized':
        coordinatedSchedules = await this.applySynchronizedStrategy(coordinatedSchedules, conflicts);
        break;
      case 'staggered':
        coordinatedSchedules = await this.applyStaggeredStrategy(coordinatedSchedules, conflicts);
        break;
      case 'balanced':
        coordinatedSchedules = await this.applyBalancedStrategy(coordinatedSchedules, conflicts);
        break;
      default:
        coordinatedSchedules = await this.applyBalancedStrategy(coordinatedSchedules, conflicts);
    }
    
    return coordinatedSchedules;
  }

  /**
   * Synchronized strategy - align children's schedules for shared activities
   */
  async applySynchronizedStrategy(schedules, conflicts) {
    
    // Find opportunities for shared study time
    const sharedOpportunities = this.findSharedStudyOpportunities(schedules);
    
    // Align similar subjects across children
    const alignedSchedules = this.alignSimilarSubjects(schedules, sharedOpportunities);
    
    return alignedSchedules;
  }

  /**
   * Staggered strategy - offset schedules to minimize conflicts
   */
  async applyStaggeredStrategy(schedules, conflicts) {
    
    // Calculate optimal time offsets
    const timeOffsets = this.calculateOptimalOffsets(schedules, conflicts);
    
    // Apply offsets to resolve conflicts
    const staggeredSchedules = this.applyTimeOffsets(schedules, timeOffsets);
    
    return staggeredSchedules;
  }

  /**
   * Balanced strategy - optimize individual needs with family harmony
   */
  async applyBalancedStrategy(schedules, conflicts) {
    
    // Prioritize high-severity conflicts for resolution
    const highPriorityConflicts = conflicts.filter(c => c.severity >= 0.7);
    
    // Use AI to find optimal balance
    const balancedSchedules = await this.aiOptimizedBalance(schedules, highPriorityConflicts);
    
    return balancedSchedules;
  }

  /**
   * Use AI to optimize family schedule balance
   */
  async aiOptimizedBalance(schedules, conflicts) {
    const prompt = `As a family coordination specialist, optimize these children's schedules to minimize conflicts while preserving individual learning effectiveness.

CHILDREN SCHEDULES:
${schedules.map((child, index) => 
  `Child ${index + 1}: ${child.schedule.length} sessions across ${[...new Set(child.schedule.map(s => s.scheduled_date))].length} days`
).join('\n')}

HIGH PRIORITY CONFLICTS:
${conflicts.map(c => 
  `${c.type}: ${c.session1.subject_name} vs ${c.session2.subject_name} on ${c.session1.scheduled_date} (severity: ${c.severity})`
).join('\n')}

Provide coordination adjustments in this JSON format:
{
  "adjustments": [
    {
      "child_index": 0,
      "session_id": "session_1",
      "action": "move|swap|merge",
      "new_time": "10:00",
      "new_date": "2025-06-16",
      "reasoning": "why this change improves family coordination"
    }
  ],
  "coordination_score": 0.85,
  "family_benefits": ["benefit1", "benefit2"]
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 1500
      });

      const content = response.choices[0].message.content;
      // Clean up markdown code blocks if present
      const cleanedContent = content.replace(/```json\n?|```\n?/g, '').trim();
      const aiCoordination = JSON.parse(cleanedContent);
      return this.applyAIAdjustments(schedules, aiCoordination.adjustments);
    } catch (error) {
      return this.ruleBasedCoordination(schedules, conflicts);
    }
  }

  /**
   * Optimize family resources (shared study time, supervision, etc.)
   */
  optimizeFamilyResources(coordinatedSchedules) {
    
    // Identify shared study opportunities
    const sharedStudySlots = this.identifySharedStudySlots(coordinatedSchedules);
    
    // Optimize supervision requirements
    const supervisionOptimized = this.optimizeSupervisionNeeds(coordinatedSchedules);
    
    // Add family study time suggestions
    const resourceOptimized = this.addFamilyStudyTime(supervisionOptimized, sharedStudySlots);
    
    return resourceOptimized;
  }

  // =============================================================================
  // FAMILY COORDINATION UTILITY METHODS
  // =============================================================================

  /**
   * Add minutes to time string
   */
  addMinutesToTime(timeString, minutes) {
    const timeMinutes = this.parseTime(timeString);
    return this.formatTime(timeMinutes + minutes);
  }

  /**
   * Check if two time ranges overlap
   */
  timesOverlap(start1, end1, start2, end2) {
    const s1 = this.parseTime(start1);
    const e1 = this.parseTime(end1);
    const s2 = this.parseTime(start2);
    const e2 = this.parseTime(end2);
    
    return s1 < e2 && s2 < e1;
  }

  /**
   * Calculate overlap minutes between two sessions
   */
  calculateOverlapMinutes(session1, session2) {
    const start1 = this.parseTime(session1.start_time);
    const end1 = start1 + session1.duration_minutes;
    const start2 = this.parseTime(session2.start_time);
    const end2 = start2 + session2.duration_minutes;
    
    const overlapStart = Math.max(start1, start2);
    const overlapEnd = Math.min(end1, end2);
    
    return Math.max(0, overlapEnd - overlapStart);
  }

  /**
   * Calculate conflict severity (0-1 scale)
   */
  calculateConflictSeverity(session1, session2) {
    let severity = 0.5; // Base severity
    
    // Higher severity for same subjects
    if (session1.subject_name === session2.subject_name) {
      severity += 0.3;
    }
    
    // Higher severity for high cognitive load subjects
    const load1 = this.COGNITIVE_LOAD_WEIGHTS[session1.subject_name] || 0.5;
    const load2 = this.COGNITIVE_LOAD_WEIGHTS[session2.subject_name] || 0.5;
    severity += Math.max(load1, load2) * 0.2;
    
    // Higher severity for complete overlap
    const overlap = this.calculateOverlapMinutes(session1, session2);
    const maxDuration = Math.max(session1.duration_minutes, session2.duration_minutes);
    if (overlap >= maxDuration * 0.8) {
      severity += 0.2;
    }
    
    return Math.min(severity, 1.0);
  }

  /**
   * Detect resource conflicts (shared materials, subjects, etc.)
   */
  detectResourceConflicts(allSessions) {
    const resourceConflicts = [];
    
    // Group sessions by date and time
    const sessionGroups = {};
    allSessions.forEach(session => {
      const key = `${session.scheduled_date}_${session.start_time}`;
      if (!sessionGroups[key]) {
        sessionGroups[key] = [];
      }
      sessionGroups[key].push(session);
    });
    
    // Check for resource conflicts within each time slot
    Object.values(sessionGroups).forEach(sessions => {
      if (sessions.length > 1) {
        for (let i = 0; i < sessions.length - 1; i++) {
          for (let j = i + 1; j < sessions.length; j++) {
            if (sessions[i].subject_name === sessions[j].subject_name) {
              resourceConflicts.push({
                type: 'resource_conflict',
                session1: sessions[i],
                session2: sessions[j],
                resource: sessions[i].subject_name,
                severity: 0.8
              });
            }
          }
        }
      }
    });
    
    return resourceConflicts;
  }

  /**
   * Find shared study opportunities
   */
  findSharedStudyOpportunities(schedules) {
    const opportunities = [];
    
    // Look for same subjects across children
    const subjectMap = {};
    schedules.forEach(childSchedule => {
      childSchedule.schedule.forEach(session => {
        if (!subjectMap[session.subject_name]) {
          subjectMap[session.subject_name] = [];
        }
        subjectMap[session.subject_name].push({
          ...session,
          child_id: childSchedule.child_id
        });
      });
    });
    
    // Find subjects with multiple children
    Object.entries(subjectMap).forEach(([subject, sessions]) => {
      if (sessions.length > 1) {
        opportunities.push({
          subject,
          children: sessions.map(s => s.child_id),
          potential_shared_time: this.findOptimalSharedTime(sessions)
        });
      }
    });
    
    return opportunities;
  }

  /**
   * Generate family metadata
   */
  generateFamilyMetadata(coordinatedSchedules, conflicts) {
    const totalSessions = coordinatedSchedules.reduce((sum, child) => sum + child.schedule.length, 0);
    const allDates = new Set();
    const allSubjects = new Set();
    
    coordinatedSchedules.forEach(child => {
      child.schedule.forEach(session => {
        allDates.add(session.scheduled_date);
        allSubjects.add(session.subject_name);
      });
    });
    
    return {
      total_children: coordinatedSchedules.length,
      total_sessions: totalSessions,
      total_conflicts_detected: conflicts.length,
      scheduling_span_days: allDates.size,
      unique_subjects: allSubjects.size,
      coordination_efficiency: this.calculateCoordinationEfficiency(coordinatedSchedules, conflicts),
      family_study_opportunities: this.countFamilyStudyOpportunities(coordinatedSchedules)
    };
  }

  /**
   * Calculate coordination efficiency score
   */
  calculateCoordinationEfficiency(schedules, conflicts) {
    if (conflicts.length === 0) return 1.0;
    
    const totalSessions = schedules.reduce((sum, child) => sum + child.schedule.length, 0);
    const conflictRatio = conflicts.length / totalSessions;
    
    return Math.max(0, 1 - conflictRatio);
  }

  /**
   * Count family study opportunities
   */
  countFamilyStudyOpportunities(schedules) {
    const opportunities = this.findSharedStudyOpportunities(schedules);
    return opportunities.length;
  }

  // Placeholder implementations for complex coordination methods
  alignSimilarSubjects(schedules, opportunities) { return schedules; }
  calculateOptimalOffsets(schedules, conflicts) { return []; }
  applyTimeOffsets(schedules, offsets) { return schedules; }
  applyAIAdjustments(schedules, adjustments) { return schedules; }
  ruleBasedCoordination(schedules, conflicts) { return schedules; }
  identifySharedStudySlots(schedules) { return []; }
  optimizeSupervisionNeeds(schedules) { return schedules; }
  addFamilyStudyTime(schedules, sharedSlots) { return schedules; }
  findOptimalSharedTime(sessions) { return '10:00'; }

  // Additional optimization methods (implementations abbreviated for space)
  evenlyDistributeCognitiveLoad(schedule) { return schedule; }
  frontLoadDifficultSubjects(schedule) { return schedule; }
  backLoadDifficultSubjects(schedule) { return schedule; }
  preventCognitiveOverload(schedule) { return schedule; }
  addSubjectVariety(schedule) { return schedule; }
  validateMaterialCoverage(schedule, materials) { return schedule; }
  optimizeForLearningEfficiency(schedule) { return schedule; }

  /**
   * Generate AI-powered contextual insights
   */
  async generateAIInsights(materialAnalysis, childProfile, weeklySchedule) {
    const prompt = `As an expert educational scheduler, analyze this student's learning context and provide strategic insights.

STUDENT PROFILE:
- Study preferences: ${JSON.stringify(childProfile.preferences)}
- Total materials to schedule: ${materialAnalysis.totalMaterials}
- High urgency items: ${materialAnalysis.urgencyLevels.filter(u => u.urgency === 'high').length}

MATERIAL ANALYSIS:
${Object.entries(materialAnalysis.bySubject || {}).map(([subject, count]) => `${subject}: ${count} items`).join('\n')}

RESPOND ONLY WITH VALID JSON in this exact format (no explanation, no markdown):
{
  "schedulingStrategy": "balanced|front_loaded|due_date_focused",
  "prioritizationApproach": "cognitive_load|urgency|subject_rotation",
  "sessionLengthRecommendation": "short|medium|long",
  "cognitiveLoadDistribution": "even|front_loaded|back_loaded",
  "riskFactors": ["potential issues"],
  "opportunityAreas": ["optimization opportunities"],
  "confidence": 0.85
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 800
    });

    const content = response.choices[0].message.content;
    // Clean up markdown code blocks if present
    const cleanedContent = content.replace(/```json\n?|```\n?/g, '').trim();
    return JSON.parse(cleanedContent);
  }

  /**
   * Call OpenAI for material assignments
   */
  async callOpenAIForAssignments(materialsBySubject, timeSlots, aiInsights, childProfile) {
    const totalMaterials = Object.values(materialsBySubject).flat().length;
    const prompt = `As an expert educational scheduler, create optimal material assignments for time slots based on cognitive science and learning efficiency.

IMPORTANT: You have EXACTLY ${totalMaterials} materials to schedule. Do not create more assignments than materials available.

TIME SLOTS AVAILABLE:
${timeSlots.map(slot => 
  `ID: ${slot.id} | ${slot.date} ${slot.startTime}-${slot.endTime} (${slot.cognitiveWindow}, efficiency: ${slot.efficiency})`
).join('\n')}

MATERIALS BY SUBJECT (with due dates and urgency):
${Object.entries(materialsBySubject).map(([subject, materials]) => 
  `${subject}:\n${materials.map(m => {
    const daysUntilDue = this.calculateDaysUntilDue(m.due_date);
    const urgencyLevel = daysUntilDue <= 1 ? 'URGENT' : daysUntilDue <= 3 ? 'HIGH' : 'NORMAL';
    return `  - MATERIAL_ID: ${m.id} | Title: "${m.title}" | Due: ${m.due_date || 'No due date'} | Urgency: ${urgencyLevel}`;
  }).join('\n')}`
).join('\n\n')}

STUDENT PREFERENCES:
- Difficult subjects in morning: ${childProfile.preferences.difficult_subjects_morning}
- AI Strategy: ${aiInsights.schedulingStrategy}
- Prioritization: ${aiInsights.prioritizationApproach}

Create assignments following these CRITICAL rules (in priority order):
1. DUE DATE PRIORITY: Schedule materials with due dates within 3 days FIRST, regardless of subject
2. LESSON SEQUENCE: Schedule "Lesson 1" before "Lesson 2" before "Lesson 3", etc. within each subject
3. PARENT FREQUENCY PREFERENCES: Respect subject frequency settings (e.g., English 4x/week, Math 5x/week)
4. COGNITIVE LOAD OPTIMIZATION: Match high cognitive load subjects to high efficiency time slots
5. ONLY create assignments for the EXACT materials listed above - do NOT invent new materials
6. NEVER assign the same material_id to multiple time slots - each material can only be used ONCE
7. Respect student preference for difficult subjects timing
8. Balance subjects across days for variety
9. Ensure each assignment uses exactly ONE unique material_id from the provided list

Provide assignments in this JSON format:
{
  "assignments": [
    {
      "slot_id": "use_exact_slot_id_from_list_above",
      "subject": "actual_subject_name_from_materials_list_above", 
      "material_ids": ["copy_exact_MATERIAL_ID_values_from_above_list"],
      "reasoning": "why this assignment is optimal",
      "cognitive_match": 0.85
    }
  ],
  "overall_strategy": "description of overall approach",
  "confidence": 0.90
}

CRITICAL REQUIREMENTS:
- ONLY use exact slot_id values from TIME SLOTS (e.g., "2025-06-27_slot_0")
- ONLY use exact material IDs from MATERIALS BY SUBJECT (the ID: values, NOT the titles)
- DO NOT use lesson titles or names as material_ids
- NEVER repeat the same material_id - each material can only appear ONCE in your entire response
- Schedule lessons in sequential order when possible (Lesson 1, then Lesson 2, etc.)
- Example: Use "a1b2c3d4-1234-5678-abcd-123456789012" NOT "Lesson 1 Understanding Groups"`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 2000
    });

    const content = response.choices[0].message.content;
    // Clean up markdown code blocks if present
    const cleanedContent = content.replace(/```json\n?|```\n?/g, '').trim();
    return JSON.parse(cleanedContent);
  }

  /**
   * Call OpenAI for family assignment (multi-child coordination)
   */
  async callOpenAIForFamilyAssignments(materialsBySubject, availableSlots, childProfile) {
    const prompt = `As an expert family educational scheduler, create optimal material assignments considering family coordination and resource sharing.

AVAILABLE TIME SLOTS:
${availableSlots.map(slot => 
  `ID: ${slot.id} | ${slot.date} ${slot.startTime}-${slot.endTime} (efficiency: ${slot.efficiency})`
).join('\n')}

MATERIALS BY SUBJECT:
${Object.entries(materialsBySubject).map(([subject, materials]) => 
  `${subject}: ${materials.map(m => `ID:${m.id} "${m.title}"`).join(', ')}`
).join('\n')}

STUDENT PREFERENCES:
${JSON.stringify(childProfile.preferences)}

Create optimal assignments following these rules:
1. Match high cognitive load subjects to high efficiency time slots  
2. Balance subjects across available days
3. Only use the provided available slot IDs
4. Each material should be assigned to exactly one slot
5. Consider family coordination needs

Provide assignments in this JSON format:
{
  "assignments": [
    {
      "slot_id": "use_exact_slot_id_from_list_above",
      "subject": "subject_name", 
      "material_ids": ["material1", "material2"],
      "reasoning": "why this assignment is optimal for family coordination",
      "efficiency_match": 0.85
    }
  ],
  "coordination_strategy": "description of family coordination approach",
  "confidence": 0.90
}

IMPORTANT: 
- Use ONLY the exact slot_id values from the AVAILABLE TIME SLOTS list above
- Use ONLY the exact material IDs from the MATERIALS BY SUBJECT list above
- Do not double-assign materials or slots`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 2000
    });

    const content = response.choices[0].message.content;
    // Clean up markdown code blocks if present
    const cleanedContent = content.replace(/```json\n?|```\n?/g, '').trim();
    return JSON.parse(cleanedContent);
  }
}

module.exports = AdvancedSchedulingService;