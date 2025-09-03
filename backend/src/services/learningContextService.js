const supabase = require('../utils/supabaseClient');
const logger = require('../utils/logger')('learningContextService');

/**
 * Learning Context Service - Provides learning materials and context for AI tutor
 * This service connects the AI tutor to the student's actual assignments and lessons
 */
class LearningContextService {
  constructor() {
    logger.info('Learning Context Service initialized');
  }

  /**
   * Helper method to get most recent assignments per subject
   * @param {Array} materials - Enriched materials array
   * @param {number} perSubject - Number of assignments to return per subject (default 1)
   * @returns {Array} Most recent assignments grouped by subject
   */
  getMostRecentPerSubject(materials, perSubject = 1) {
    try {
      const bySubject = {};
      
      materials
        .filter(m => m.completed_at)
        .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
        .forEach(m => {
          const subjectId = m.child_subjects?.subjects?.id || 'unknown';
          const subjectName = m.child_subjects?.subjects?.name || 'Unknown Subject';
          
          if (!bySubject[subjectId]) {
            bySubject[subjectId] = [];
          }
          if (bySubject[subjectId].length < perSubject) {
            bySubject[subjectId].push(m);
          }
        });
      
      const result = Object.values(bySubject).flat();
      logger.info(`📚 Found ${result.length} recent assignments across ${Object.keys(bySubject).length} subjects`);
      
      return result;
    } catch (error) {
      logger.error('Error in getMostRecentPerSubject:', error);
      return [];
    }
  }

  /**
   * Get assignments for a child organized by status-based categories
   * @param {string} childId - UUID of the child
   * @param {number} limit - Number of assignments to return per category (default 8)
   * @returns {Object} Object with currentWork, upcoming, and needsReview arrays
   */
  async getNextAssignments(childId, limit = 8) {
    try {
      logger.info(`Fetching status-based assignments for child: ${childId}`);

      // Get all materials with enriched data
      const enrichedMaterials = await this.getEnrichedMaterials(childId);

      if (!enrichedMaterials || enrichedMaterials.length === 0) {
        logger.info(`No assignments found for child ${childId}`);
        return {
          currentWork: [],
          upcoming: [],
          needsReview: []
        };
      }

      // CATEGORY 1: Current Work - Most recent completed assignment per subject
      const currentWork = this.getMostRecentPerSubject(enrichedMaterials, 1);

      // CATEGORY 2: Upcoming - Not yet completed, prioritizing worksheets (limited to 3)
      const upcoming = enrichedMaterials
        .filter(m => !m.completed_at)
        .filter(m => {
          // Remove generic starter lessons
          const isStarter = m.lessons?.description === 'Auto-created starter lesson' || 
                           m.title.toLowerCase().includes('lesson7_lesson8');
          return !isStarter;
        })
        .sort((a, b) => {
          // FIRST PRIORITY: Student work over teacher lessons
          const aIsStudentWork = ['worksheet', 'assignment', 'practice', 'review', 'test', 'quiz'].includes(a.content_type);
          const bIsStudentWork = ['worksheet', 'assignment', 'practice', 'review', 'test', 'quiz'].includes(b.content_type);
          const aIsTeacherLesson = a.content_type === 'lesson';
          const bIsTeacherLesson = b.content_type === 'lesson';
          
          if (aIsStudentWork && bIsTeacherLesson) return -1;
          if (aIsTeacherLesson && bIsStudentWork) return 1;
          
          // Within student work, prioritize by content richness
          if (aIsStudentWork && bIsStudentWork) {
            const aProblems = (a.lesson_json?.worksheet_questions?.length || 0) + 
                             (a.lesson_json?.problems_with_context?.length || 0);
            const bProblems = (b.lesson_json?.worksheet_questions?.length || 0) + 
                             (b.lesson_json?.problems_with_context?.length || 0);
            if (aProblems !== bProblems) return bProblems - aProblems;
          }
          
          // Then by material order or creation date
          if (a.material_order && b.material_order) {
            return a.material_order - b.material_order;
          }
          return new Date(a.created_at) - new Date(b.created_at);
        })
        .slice(0, 3); // Show max 3 upcoming assignments

      // CATEGORY 3: Needs Review - Completed with low grades (below 80%)
      const needsReview = enrichedMaterials
        .filter(m => {
          if (!m.completed_at || !m.grade_value || !m.grade_max_value) return false;
          const percentage = (m.grade_value / m.grade_max_value) * 100;
          return percentage < 80;
        })
        .sort((a, b) => {
          // Sort by grade percentage (lowest first)
          const aPercentage = (a.grade_value / a.grade_max_value) * 100;
          const bPercentage = (b.grade_value / b.grade_max_value) * 100;
          return aPercentage - bPercentage;
        })
        .slice(0, Math.min(3, limit)); // Show max 3 assignments needing review

      // Log category breakdown
      logger.info(`📊 Status-based assignments for child ${childId}:`);
      logger.info(`   Current Work: ${currentWork.length} (recently completed)`);
      logger.info(`   Upcoming: ${upcoming.length} (not yet started)`);
      logger.info(`   Needs Review: ${needsReview.length} (grades < 80%)`);
      
      // Log details of upcoming assignments for debugging
      const upcomingDetails = upcoming.slice(0, 3).map(m => 
        `"${m.title}" (${m.child_subjects?.subjects?.name}, ${m.content_type})`
      );
      logger.info(`🔍 Upcoming assignments: ${upcomingDetails.join(' | ')}`);

      return {
        currentWork,
        upcoming,
        needsReview
      };

    } catch (error) {
      logger.error('Error in getNextAssignments:', error);
      throw new Error('Failed to fetch next assignments');
    }
  }

  /**
   * Helper method to get enriched materials with lesson and unit data
   * @param {string} childId - UUID of the child
   * @returns {Array} Array of materials with full context
   */
  async getEnrichedMaterials(childId) {
    try {
      // Get all materials for the child
      const { data: materials, error: materialsError } = await supabase
        .from('materials')
        .select(`
          *,
          child_subjects!inner(
            id,
            child_id,
            custom_subject_name_override,
            subjects!subject_id(
              id,
              name
            )
          )
        `)
        .eq('child_subjects.child_id', childId)
        .order('created_at', { ascending: false });

      if (materialsError) {
        logger.error('Error fetching materials:', materialsError);
        throw materialsError;
      }

      if (!materials || materials.length === 0) {
        return [];
      }

      // Extract lesson IDs and fetch lessons data
      const lessonIds = [...new Set(materials.map(m => m.lesson_id).filter(Boolean))];
      let lessons = [];
      
      if (lessonIds.length > 0) {
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('lessons')
          .select('id, title, description, lesson_number, unit_id')
          .in('id', lessonIds);

        if (lessonsError) {
          logger.warn('Error fetching lessons:', lessonsError);
        } else {
          lessons = lessonsData || [];
        }
      }

      // Extract unit IDs and fetch units data
      const unitIds = [...new Set(lessons.map(l => l.unit_id).filter(Boolean))];
      let units = [];
      
      if (unitIds.length > 0) {
        const { data: unitsData, error: unitsError } = await supabase
          .from('units')
          .select('id, name, sequence_order')
          .in('id', unitIds);

        if (unitsError) {
          logger.warn('Error fetching units:', unitsError);
        } else {
          units = unitsData || [];
        }
      }

      // Create lookup maps and enrich materials
      const lessonMap = new Map(lessons.map(lesson => [lesson.id, lesson]));
      const unitMap = new Map(units.map(unit => [unit.id, unit]));

      return materials.map(material => {
        const lesson = lessonMap.get(material.lesson_id);
        const unit = lesson?.unit_id ? unitMap.get(lesson.unit_id) : null;
        
        return {
          ...material,
          lessons: lesson ? {
            ...lesson,
            units: unit || null
          } : null
        };
      });

    } catch (error) {
      logger.error('Error in getEnrichedMaterials:', error);
      throw error;
    }
  }

  /**
   * Get full context for a specific material
   * @param {string} materialId - UUID of the material
   * @returns {Object} Material with full lesson and subject context
   */
  async getMaterialContext(materialId) {
    try {
      logger.info(`Fetching material context for: ${materialId}`);

      // Step 1: Get material with child_subjects data
      const { data: material, error: materialError } = await supabase
        .from('materials')
        .select(`
          *,
          child_subjects!child_subject_id(
            *,
            subjects!subject_id(*),
            children!child_id(*)
          )
        `)
        .eq('id', materialId)
        .single();

      if (materialError) {
        logger.error('Error fetching material:', materialError);
        throw materialError;
      }

      if (!material) {
        logger.error(`Material not found: ${materialId}`);
        throw new Error('Material not found');
      }

      // Step 2: Fetch lesson data if lesson_id exists
      let lesson = null;
      if (material.lesson_id) {
        const { data: lessonData, error: lessonError } = await supabase
          .from('lessons')
          .select('*')
          .eq('id', material.lesson_id)
          .single();

        if (lessonError) {
          logger.warn('Error fetching lesson:', lessonError);
        } else {
          lesson = lessonData;
        }
      }

      // Step 3: Fetch unit data if lesson has unit_id
      let unit = null;
      if (lesson?.unit_id) {
        const { data: unitData, error: unitError } = await supabase
          .from('units')
          .select('*')
          .single()
          .eq('id', lesson.unit_id);

        if (unitError) {
          logger.warn('Error fetching unit:', unitError);
        } else {
          unit = unitData;
        }
      }

      // Step 4: Fetch child_subject for unit if needed
      let unitWithChildSubject = unit;
      if (unit && material.child_subjects?.id) {
        unitWithChildSubject = {
          ...unit,
          child_subjects: material.child_subjects // Use the already fetched child_subjects data
        };
      }

      // Step 5: Manually combine the data
      const enrichedMaterial = {
        ...material,
        lessons: lesson ? {
          ...lesson,
          units: unitWithChildSubject || null
        } : null
      };

      logger.info(`Successfully fetched context for material: ${enrichedMaterial.title}`);
      return enrichedMaterial;

    } catch (error) {
      logger.error('Error in getMaterialContext:', error);
      throw new Error('Failed to fetch material context');
    }
  }

  /**
   * Get recent progress for encouragement and context
   * @param {string} childId - UUID of the child
   * @param {number} days - Number of days back to look (default 7)
   * @returns {Array} Recently completed materials with grades
   */
  async getRecentProgress(childId, days = 7) {
    try {
      logger.info(`Fetching recent progress for child: ${childId} (last ${days} days)`);

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const { data, error } = await supabase
        .from('materials')
        .select(`
          id,
          title,
          content_type,
          grade_value,
          grade_max_value,
          completed_at,
          grading_notes,
          child_subjects!materials_child_subject_id_fkey(
            subjects!child_subjects_subject_id_fkey(name)
          )
        `)
        .eq('child_subjects.child_id', childId)
        .not('completed_at', 'is', null)
        .gte('completed_at', cutoff.toISOString())
        .order('completed_at', { ascending: false });

      if (error) {
        logger.error('Error fetching recent progress:', error);
        throw error;
      }

      logger.info(`Found ${data?.length || 0} recent completions for child ${childId}`);
      return data || [];

    } catch (error) {
      logger.error('Error in getRecentProgress:', error);
      throw new Error('Failed to fetch recent progress');
    }
  }

  /**
   * Get materials that need grading (completed but no grade yet)
   * @param {string} childId - UUID of the child
   * @returns {Array} Materials needing grades
   */
  async getMaterialsNeedingGrades(childId) {
    try {
      logger.info(`Fetching materials needing grades for child: ${childId}`);

      const { data, error } = await supabase
        .from('materials')
        .select(`
          *,
          child_subjects!materials_child_subject_id_fkey(
            subjects!child_subjects_subject_id_fkey(name)
          )
        `)
        .eq('child_subjects.child_id', childId)
        .not('completed_at', 'is', null)
        .is('grade_value', null)
        .not('grade_max_value', 'is', null)
        .order('completed_at', { ascending: true });

      if (error) {
        logger.error('Error fetching materials needing grades:', error);
        throw error;
      }

      logger.info(`Found ${data?.length || 0} materials needing grades for child ${childId}`);
      return data || [];

    } catch (error) {
      logger.error('Error in getMaterialsNeedingGrades:', error);
      throw new Error('Failed to fetch materials needing grades');
    }
  }

  /**
   * Determine assignment status based on completion and activity
   * @param {Object} material - Material object with dates
   * @returns {string} Status: 'completed_today', 'working_on', 'need_review', 'available'
   */
  determineAssignmentStatus(material) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (material.completed_at) {
      const completedDate = new Date(material.completed_at);
      const completedToday = completedDate >= today;
      
      logger.debug(`Assignment "${material.title}" completed at ${material.completed_at}, today check: ${completedToday}`);
      
      if (completedToday) return 'completed_today';
      if (!material.grade_value && material.grade_max_value) return 'need_review';
      return 'completed';
    }
    
    // For incomplete assignments, they are available to work on
    return 'available';
  }

  /**
   * Get learning context summary for AI prompt with status-based categories
   * @param {string} childId - UUID of the child
   * @returns {Object} Structured learning context with new categories
   */
  async getLearningContextSummary(childId) {
    try {
      logger.info(`Building learning context summary for child: ${childId}`);

      const [assignmentCategories, recentProgress, needingGrades] = await Promise.all([
        this.getNextAssignments(childId, 10), // Get assignments in new category format
        this.getRecentProgress(childId, 7),
        this.getMaterialsNeedingGrades(childId)
      ]);

      // Extract all assignments from categories into a single array for backward compatibility
      const allAssignments = [
        ...assignmentCategories.upcoming,
        ...assignmentCategories.currentWork,
        ...assignmentCategories.needsReview
      ];

      const summary = {
        // New status-based categories
        currentWork: assignmentCategories.currentWork,
        upcoming: assignmentCategories.upcoming,
        needsReview: assignmentCategories.needsReview,
        
        // Legacy fields for backward compatibility
        nextAssignments: allAssignments,
        recentProgress,
        needingGrades,
        hasActiveWork: allAssignments.length > 0,
        hasRecentSuccess: recentProgress.length > 0,
        
        // Updated status grouping with new categories
        assignmentsByStatus: {
          current_work: assignmentCategories.currentWork,
          upcoming: assignmentCategories.upcoming,
          needs_review: assignmentCategories.needsReview,
          // Legacy status fields for compatibility
          available: assignmentCategories.upcoming,
          completed_today: assignmentCategories.currentWork.filter(a => {
            const today = new Date().toDateString();
            return a.completed_at && new Date(a.completed_at).toDateString() === today;
          })
        }
      };

      logger.info(`Status-based context summary built:`);
      logger.info(`   Current Work: ${summary.currentWork.length} (recently completed)`);
      logger.info(`   Upcoming: ${summary.upcoming.length} (not yet started)`);
      logger.info(`   Needs Review: ${summary.needsReview.length} (grades < 80%)`);
      logger.info(`   Total Active Work: ${summary.hasActiveWork ? allAssignments.length : 0} assignments`);
      
      return summary;

    } catch (error) {
      logger.error('Error in getLearningContextSummary:', error);
      throw new Error('Failed to build learning context summary');
    }
  }

  /**
   * Extract questions from lesson_json for specific material
   * @param {Object} material - Material object with lesson_json
   * @returns {Array} Array of questions/problems
   */
  extractQuestionsFromMaterial(material) {
    try {
      if (!material?.lesson_json) {
        return [];
      }

      const lessonData = typeof material.lesson_json === 'string' 
        ? JSON.parse(material.lesson_json) 
        : material.lesson_json;

      // Handle different possible structures in lesson_json
      let questions = lessonData.questions || 
                     lessonData.problems || 
                     lessonData.exercises || 
                     lessonData.items || 
                     [];

      // Check for worksheet_questions (objects with question_text)
      if (!questions.length && lessonData.worksheet_questions) {
        questions = lessonData.worksheet_questions.map(q => q.question_text || q.question || q.text || q);
      }
      
      // Check for tasks_or_questions (strings)
      if (!questions.length && lessonData.tasks_or_questions) {
        questions = lessonData.tasks_or_questions;
      }

      return Array.isArray(questions) ? questions : [];

    } catch (error) {
      logger.warn(`Error extracting questions from material ${material?.id}:`, error);
      return [];
    }
  }

  /**
   * Format learning context for AI prompt using status-based categories
   * @param {Object} contextSummary - Result from getLearningContextSummary
   * @param {Object} specificAssignment - Optional: specific assignment to focus on
   * @returns {string} Formatted context string for AI prompt
   */
  formatContextForPrompt(contextSummary, specificAssignment = null) {
    try {
      let contextStr = '\nCURRENT LEARNING CONTEXT:\n';

      if (contextSummary.hasActiveWork) {
        // If a specific assignment was matched, use that. Otherwise, show overview of all assignments
        if (specificAssignment) {
          // SPECIFIC ASSIGNMENT CONTEXT - when user asked about a particular assignment
          const current = specificAssignment;
          const subject = current.child_subjects?.subjects?.name || 'Unknown Subject';
          const lesson = current.lessons?.title || 'Current Lesson';
          const unit = current.lessons?.units?.name || '';

          contextStr += `Subject: ${subject}${unit ? ` - ${unit}` : ''}\n`;
          contextStr += `Lesson: "${lesson}"\n`;
          contextStr += `Current Assignment: "${current.title}"\n\n`;
        } else {
          // STATUS-BASED OVERVIEW - show assignments organized by their status
          
          // CURRENT WORK - Recently completed assignments
          if (contextSummary.currentWork && contextSummary.currentWork.length > 0) {
            contextStr += `CURRENT WORK (Recently Completed):\n`;
            contextSummary.currentWork.slice(0, 3).forEach(assignment => {
              const subject = assignment.child_subjects?.subjects?.name || 'Unknown Subject';
              const grade = assignment.grade_value && assignment.grade_max_value 
                ? ` (${assignment.grade_value}/${assignment.grade_max_value})` 
                : '';
              contextStr += `  • "${assignment.title}" - ${subject}${grade}\n`;
            });
            contextStr += '\n';
          }
          
          // UPCOMING WORK - Not yet started
          if (contextSummary.upcoming && contextSummary.upcoming.length > 0) {
            contextStr += `UPCOMING ASSIGNMENTS:\n`;
            contextSummary.upcoming.slice(0, 5).forEach(assignment => {
              const subject = assignment.child_subjects?.subjects?.name || 'Unknown Subject';
              const contentType = assignment.content_type || 'assignment';
              contextStr += `  • "${assignment.title}" - ${subject} (${contentType})\n`;
            });
            contextStr += '\n';
          }
          
          // NEEDS REVIEW - Low grades
          if (contextSummary.needsReview && contextSummary.needsReview.length > 0) {
            contextStr += `NEEDS REVIEW (Grades < 80%):\n`;
            contextSummary.needsReview.slice(0, 3).forEach(assignment => {
              const subject = assignment.child_subjects?.subjects?.name || 'Unknown Subject';
              const percentage = Math.round((assignment.grade_value / assignment.grade_max_value) * 100);
              contextStr += `  • "${assignment.title}" - ${subject} (${percentage}%)\n`;
            });
            contextStr += '\n';
          }
          
          // Summary
          const totalCurrent = contextSummary.currentWork?.length || 0;
          const totalUpcoming = contextSummary.upcoming?.length || 0;
          const totalReview = contextSummary.needsReview?.length || 0;
          contextStr += `SUMMARY: ${totalCurrent} recently completed, ${totalUpcoming} upcoming, ${totalReview} need review\n\n`;
          
          contextStr += `NOTE: Student can get help with any of these assignments. Focus on what they're currently asking about.\n\n`;
          
          return contextStr + this.addRecentProgressContext(contextSummary);
        }

        // Extract full problem content from lesson_json (only for specific assignment focus)
        return contextStr + this.addSpecificAssignmentProblems(specificAssignment) + this.addRecentProgressContext(contextSummary);
      }

      // Add recent success for encouragement
      return contextStr + this.addRecentProgressContext(contextSummary);

    } catch (error) {
      logger.error('Error formatting context for prompt:', error);
      return '\nCURRENT LEARNING CONTEXT:\nNo current assignments found.\n';
    }
  }

  /**
   * Helper method to add specific assignment problems to context
   * @param {Object} assignment - The specific assignment to show problems for
   * @returns {string} Formatted problems section
   */
  addSpecificAssignmentProblems(assignment) {
    if (!assignment || !assignment.lesson_json) {
      return '';
    }

    try {
      const lessonData = typeof assignment.lesson_json === 'string' 
        ? JSON.parse(assignment.lesson_json) 
        : assignment.lesson_json;

      // Debug: Log what we found in lesson_json
      logger.info(`🔍 DEBUG: lesson_json keys for "${assignment.title}": ${Object.keys(lessonData).join(', ')}`);
      logger.info(`🔍 DEBUG: problems_with_context length: ${lessonData.problems_with_context?.length || 0}`);
      logger.info(`🔍 DEBUG: worksheet_questions length: ${lessonData.worksheet_questions?.length || 0}`);
      logger.info(`🔍 DEBUG: tasks_or_questions length: ${lessonData.tasks_or_questions?.length || 0}`);

      let contextStr = '';

      // Check for problems_with_context first (full problem text)
      if (lessonData.problems_with_context && Array.isArray(lessonData.problems_with_context) && lessonData.problems_with_context.length > 0) {
        logger.info(`🔍 DEBUG: Using problems_with_context for "${assignment.title}"`);
        contextStr += `COMPLETE ASSIGNMENT PROBLEMS:\n\n`;
        lessonData.problems_with_context.forEach((problem, index) => {
          // Handle both string and object formats
          let problemText;
          if (typeof problem === 'string') {
            problemText = problem;
          } else if (problem && typeof problem === 'object') {
            problemText = problem.problem_text || problem.question_text || problem.text || JSON.stringify(problem);
          } else {
            problemText = 'Problem text unavailable';
          }
          contextStr += `Problem ${index + 1}: ${problemText}\n\n`;
        });
      } else if (lessonData.worksheet_questions && Array.isArray(lessonData.worksheet_questions) && lessonData.worksheet_questions.length > 0) {
        // Fallback to worksheet_questions format
        logger.info(`🔍 DEBUG: Using worksheet_questions for "${assignment.title}"`);
        contextStr += `COMPLETE ASSIGNMENT PROBLEMS:\n\n`;
        lessonData.worksheet_questions.forEach((question, index) => {
          let problemText;
          if (typeof question === 'string') {
            problemText = question;
          } else if (question && typeof question === 'object') {
            problemText = question.question_text || question.problem_text || question.text || JSON.stringify(question);
          } else {
            problemText = 'Problem text unavailable';
          }
          contextStr += `Problem ${index + 1}: ${problemText}\n\n`;
        });
      } else if (lessonData.tasks_or_questions && Array.isArray(lessonData.tasks_or_questions) && lessonData.tasks_or_questions.length > 0) {
        // Fallback to tasks_or_questions format
        logger.info(`🔍 DEBUG: Processing tasks_or_questions for "${assignment.title}"`);
        contextStr += `COMPLETE ASSIGNMENT PROBLEMS:\n\n`;
        lessonData.tasks_or_questions.forEach((task, index) => {
          const problemText = typeof task === 'string' ? task : (task.text || task.question || 'Problem text unavailable');
          logger.info(`🔍 DEBUG: Task ${index + 1}: ${problemText.substring(0, 50)}...`);
          contextStr += `Problem ${index + 1}: ${problemText}\n\n`;
        });
        logger.info(`🔍 DEBUG: Added ${lessonData.tasks_or_questions.length} problems to context`);
      } else {
        // Fall back to regular questions extraction
        logger.info(`🔍 DEBUG: Falling back to extractQuestionsFromMaterial for "${assignment.title}"`);
        const questions = this.extractQuestionsFromMaterial(assignment);
        if (questions.length > 0) {
          contextStr += `ASSIGNMENT QUESTIONS:\n`;
          questions.forEach((q, i) => {
            const questionText = typeof q === 'string' ? q : (q.question || q.text || q.problem || 'Question');
            contextStr += `Problem ${i + 1}: ${questionText}\n`;
          });
          contextStr += '\n';
        }
      }

      // Add lesson context if available
      if (assignment.lessons?.description) {
        contextStr += `LESSON CONTEXT:\n${assignment.lessons.description}\n\n`;
      }

      return contextStr;

    } catch (error) {
      logger.warn('Error parsing lesson_json for assignment problems:', error);
      // Fall back to basic extraction
      const questions = this.extractQuestionsFromMaterial(assignment);
      if (questions.length > 0) {
        let contextStr = `ASSIGNMENT QUESTIONS:\n`;
        questions.slice(0, 3).forEach((q, i) => {
          contextStr += `${i + 1}. ${typeof q === 'string' ? q : q.question || q.text || 'Question'}\n`;
        });
        if (questions.length > 3) {
          contextStr += `... and ${questions.length - 3} more questions\n`;
        }
        return contextStr + '\n';
      }
      return '';
    }
  }

  /**
   * Helper method to add recent progress context
   * @param {Object} contextSummary - Learning context summary
   * @returns {string} Formatted recent progress section
   */
  addRecentProgressContext(contextSummary) {
    let contextStr = '';
    
    // Add recent success for encouragement
    if (contextSummary.hasRecentSuccess && contextSummary.recentProgress) {
      contextStr += 'RECENT PROGRESS:\n';
      contextSummary.recentProgress.slice(0, 2).forEach(item => {
        const grade = item.grade_value && item.grade_max_value 
          ? ` (${item.grade_value}/${item.grade_max_value})` 
          : '';
        contextStr += `- Completed "${item.title}"${grade}\n`;
      });
      contextStr += '\n';
    }

    contextStr += '\n🚨 CRITICAL INSTRUCTIONS:\n';
    contextStr += '1. Help the student with whichever assignment or category they ask about.\n';
    contextStr += '2. CURRENT WORK shows what they\'ve recently completed - use for context and encouragement.\n';
    contextStr += '3. UPCOMING shows what they should work on next - prioritize worksheets and assignments.\n';
    contextStr += '4. NEEDS REVIEW shows assignments with low grades - offer targeted help.\n';
    contextStr += '5. When referencing specific problems, use the EXACT problem text provided above.\n';
    contextStr += '6. Guide students step-by-step rather than giving direct answers.\n';

    return contextStr;
  }
}

module.exports = new LearningContextService();