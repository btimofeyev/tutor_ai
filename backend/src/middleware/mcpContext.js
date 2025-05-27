// backend/src/middleware/mcpContext.js - Updated with date awareness

const mcpClient = require('../services/mcpClient');

// Helper function to determine if a query is asking about lessons/assignments
exports.isLessonQuery = (message) => {
    const lessonKeywords = [
      'lesson', 'lessons', 'homework', 'assignment', 'assignments', 'due', 'upcoming', 
      'schedule', 'what do i have', 'what\'s next', 'coming up', 'work', 'study',
      'practice', 'review', 'test', 'quiz', 'worksheet', 'today', 'tomorrow', 'date'
    ];
  
  const messageLower = message.toLowerCase();
  return lessonKeywords.some(keyword => messageLower.includes(keyword));
};
exports.isGradeQuery = (message) => {
    const gradeKeywords = [
      'grade', 'grades', 'score', 'scores', 'review', 'wrong', 'missed', 'failed',
      'perfect', 'how did i do', 'check my work', 'mistakes', 'incorrect', 'correct',
      'average', 'performance', 'results', 'feedback', 'percent', '%', 'points',
      'better', 'improve', 'study more', 'practice more', 'not good', 'disappointed'
    ];
    
    const messageLower = message.toLowerCase();
    return gradeKeywords.some(keyword => messageLower.includes(keyword));
  };
// Helper function to format learning context for AI prompts with current date
exports.formatLearningContextForAI = (mcpContext, currentDate = null) => {
    if (!mcpContext || mcpContext.error) {
      return "No specific curriculum data available at the moment.";
    }
  
    // Get current date for calculations
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let context = "";
  
    // Add current date info at the top
    if (currentDate) {
      context += `📅 **Current Date**: ${currentDate}\n\n`;
    }
  
    // Current focus
    if (mcpContext.currentFocus) {
      const focus = mcpContext.currentFocus;
      context += `🎯 **Current Focus**: "${focus.title}" (${focus.content_type || 'lesson'})`;
      
      if (focus.due_date) {
        const dueDate = new Date(focus.due_date + 'T00:00:00');
        dueDate.setHours(0, 0, 0, 0);
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntilDue < 0) {
          context += ` - **OVERDUE by ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) !== 1 ? 's' : ''}!** 🚨`;
        } else if (daysUntilDue === 0) {
          context += ` - **DUE TODAY!** ⚠️`;
        } else if (daysUntilDue === 1) {
          context += ` - **Due tomorrow** ⏰`;
        } else if (daysUntilDue > 0) {
          context += ` - Due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`;
        }
      }
      
      // Add learning objectives if available
      if (focus.lesson_json?.learning_objectives?.length > 0) {
        context += `\n   📚 Learning goals: ${focus.lesson_json.learning_objectives.slice(0, 2).join(', ')}`;
      }
      
      // Add tasks/questions preview if available
      if (focus.lesson_json?.tasks_or_questions?.length > 0) {
        context += `\n   📝 Contains ${focus.lesson_json.tasks_or_questions.length} tasks/questions`;
      }
      
      context += "\n\n";
    }
  
    // Active lessons with accurate date calculations
    if (mcpContext.currentLessons && mcpContext.currentLessons.length > 0) {
      context += "📖 **Active Materials**:\n";
      mcpContext.currentLessons.slice(0, 4).forEach((lesson, index) => {
        const subjectName = lesson.lesson?.unit?.child_subject?.subject?.name || 
                           lesson.lesson?.unit?.child_subject?.custom_subject_name_override || 'General';
        context += `${index + 1}. "${lesson.title}" (${subjectName})`;
        
        if (lesson.due_date) {
          const dueDate = new Date(lesson.due_date + 'T00:00:00');
          dueDate.setHours(0, 0, 0, 0);
          const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
          
          if (daysUntil < 0) {
            context += ` - OVERDUE by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} 🚨`;
          } else if (daysUntil === 0) {
            context += ` - Due TODAY ⚠️`;
          } else if (daysUntil === 1) {
            context += ` - Due TOMORROW ⏰`;
          } else if (daysUntil <= 7) {
            context += ` - Due in ${daysUntil} days`;
          }
        }
        context += "\n";
      });
      
      if (mcpContext.currentLessons.length > 4) {
        context += `   ... and ${mcpContext.currentLessons.length - 4} more materials\n`;
      }
      context += "\n";
    }
  
    // Upcoming assignments with accurate urgency
    if (mcpContext.upcomingAssignments && mcpContext.upcomingAssignments.length > 0) {
      context += "📅 **Upcoming Assignments**:\n";
      mcpContext.upcomingAssignments.slice(0, 3).forEach((assignment, index) => {
        const subjectName = assignment.lesson?.unit?.child_subject?.subject?.name || 
                           assignment.lesson?.unit?.child_subject?.custom_subject_name_override || 'General';
        const dueDate = new Date(assignment.due_date + 'T00:00:00');
        dueDate.setHours(0, 0, 0, 0);
        const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        
        let urgencyIcon = "";
        let urgencyText = "";
        
        if (daysUntil < 0) {
          urgencyIcon = " 🚨";
          urgencyText = ` (OVERDUE by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''})`;
        } else if (daysUntil === 0) {
          urgencyIcon = " 🚨";
          urgencyText = " (DUE TODAY)";
        } else if (daysUntil === 1) {
          urgencyIcon = " ⚠️";
          urgencyText = " (DUE TOMORROW)";
        } else if (daysUntil <= 3) {
          urgencyIcon = " ⚠️";
          urgencyText = ` (Due in ${daysUntil} days)`;
        } else if (daysUntil <= 7) {
          urgencyIcon = " ⏰";
          urgencyText = ` (Due in ${daysUntil} days)`;
        }
        
        context += `${index + 1}. "${assignment.title}" (${subjectName})${urgencyText}${urgencyIcon}\n`;
      });
      context += "\n";
    }
  
    // Progress summary
    if (mcpContext.progress) {
      const progress = mcpContext.progress;
      context += "📊 **Progress Summary**:\n";
      context += `- Completed materials: ${progress.summary?.totalCompletedMaterials || 0}\n`;
      
      if (progress.summary?.averageGrade !== null) {
        context += `- Average grade: ${progress.summary.averageGrade}%\n`;
      }
      
      if (progress.summary?.subjectsProgress?.length > 0) {
        context += "- Subject progress: ";
        progress.summary.subjectsProgress.forEach((subj, index) => {
          context += `${subj.subject} (${subj.completionRate}%)`;
          if (index < progress.summary.subjectsProgress.length - 1) context += ", ";
        });
        context += "\n";
      }
    }
  
    return context || "No specific curriculum data available at the moment.";
  };

// Middleware to add MCP context to requests
exports.enrichWithMCPContext = async (req, res, next) => {
    const childId = req.child?.child_id;
    
    if (!childId) {
      return next();
    }
  
    try {
      console.log('enrichWithMCPContext - childId:', childId);
  
      // Check if this is a grade-related query from the request body
      const message = req.body?.message || '';
      const isGradeRelatedQuery = exports.isGradeQuery(message);
  
      let learningContext;
      
      if (isGradeRelatedQuery) {
        console.log('Grade-related query detected, using enhanced context...');
        // Get enhanced context with grade data
        learningContext = await mcpClient.getEnhancedLearningContext(childId);
      } else {
        // Get regular learning context
        learningContext = await mcpClient.getLearningContext(childId);
      }
  
      // Add to request object
      req.mcpContext = learningContext;
      req.isGradeQuery = isGradeRelatedQuery;
  
      // Log the context for debugging with current date
      const currentDate = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      console.log('MCP Context Summary for', currentDate, ':');
      console.log('- Is Grade Query:', isGradeRelatedQuery);
      console.log('- Child Subjects:', learningContext.childSubjects?.length || 0);
      console.log('- Current Materials:', learningContext.currentLessons?.length || 0);
      console.log('- Upcoming Assignments:', learningContext.upcomingAssignments?.length || 0);
      console.log('- Current Focus:', learningContext.currentFocus?.title || 'None');
      
      if (isGradeRelatedQuery && learningContext.gradeAnalysis) {
        console.log('- Grade Analysis Available:', !!learningContext.gradeAnalysis);
        console.log('- Average Grade:', learningContext.averageGrade || 'N/A');
        console.log('- Materials for Review:', learningContext.materialsForReview?.length || 0);
      }
  
      // More detailed logging for the first few items with date calculations
      if (learningContext.currentLessons?.length > 0) {
        console.log('Current Materials Details:');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        learningContext.currentLessons.slice(0, 3).forEach((material, index) => {
          let dueDateInfo = material.due_date || 'No due date';
          if (material.due_date) {
            const dueDate = new Date(material.due_date + 'T00:00:00');
            dueDate.setHours(0, 0, 0, 0);
            const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            if (daysUntil < 0) {
              dueDateInfo += ` (OVERDUE by ${Math.abs(daysUntil)} days)`;
            } else if (daysUntil === 0) {
              dueDateInfo += ' (DUE TODAY!)';
            } else if (daysUntil === 1) {
              dueDateInfo += ' (DUE TOMORROW)';
            } else {
              dueDateInfo += ` (Due in ${daysUntil} days)`;
            }
          }
          console.log(`  ${index + 1}. ${material.title} (${material.content_type}) - ${dueDateInfo}`);
        });
      }
  
      if (isGradeRelatedQuery && learningContext.materialsForReview?.length > 0) {
        console.log('Materials Needing Review:');
        learningContext.materialsForReview.slice(0, 3).forEach((material, index) => {
          console.log(`  ${index + 1}. ${material.title} - ${material.grade_percentage}% (${material.review_reason})`);
        });
      }
  
      next();
    } catch (error) {
      console.error('MCP context enrichment error:', error);
      // Continue without MCP context on error, but log the error
      req.mcpContext = {
        childSubjects: [],
        currentLessons: [],
        upcomingAssignments: [],
        currentFocus: null,
        progress: null,
        error: error.message
      };
      req.isGradeQuery = false;
      next();
    }
  };