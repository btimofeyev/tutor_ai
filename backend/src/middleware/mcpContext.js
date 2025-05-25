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
    context += "📖 **Active Lessons**:\n";
    mcpContext.currentLessons.slice(0, 4).forEach((lesson, index) => {
      const subjectName = lesson.child_subjects?.subjects?.name || 'General';
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
      context += `   ... and ${mcpContext.currentLessons.length - 4} more lessons\n`;
    }
    context += "\n";
  }

  // Upcoming assignments with accurate urgency
  if (mcpContext.upcomingAssignments && mcpContext.upcomingAssignments.length > 0) {
    context += "📅 **Upcoming Assignments**:\n";
    mcpContext.upcomingAssignments.slice(0, 3).forEach((assignment, index) => {
      const subjectName = assignment.child_subjects?.subjects?.name || 'General';
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
    context += `- Completed lessons: ${progress.summary?.totalCompletedLessons || 0}\n`;
    
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

    // Get comprehensive learning context using the enhanced MCP client
    const learningContext = await mcpClient.getLearningContext(childId);

    // Add to request object
    req.mcpContext = learningContext;

    // Log the context for debugging with current date
    const currentDate = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    console.log('MCP Context Summary for', currentDate, ':');
    console.log('- Child Subjects:', learningContext.childSubjects?.length || 0);
    console.log('- Current Lessons:', learningContext.currentLessons?.length || 0);
    console.log('- Upcoming Assignments:', learningContext.upcomingAssignments?.length || 0);
    console.log('- Current Focus:', learningContext.currentFocus?.title || 'None');

    // More detailed logging for the first few items with date calculations
    if (learningContext.currentLessons?.length > 0) {
      console.log('Current Lessons Details:');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      learningContext.currentLessons.slice(0, 3).forEach((lesson, index) => {
        let dueDateInfo = lesson.due_date || 'No due date';
        if (lesson.due_date) {
          const dueDate = new Date(lesson.due_date + 'T00:00:00');
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
        console.log(`  ${index + 1}. ${lesson.title} (${lesson.content_type}) - ${dueDateInfo}`);
      });
    }

    if (learningContext.upcomingAssignments?.length > 0) {
      console.log('Upcoming Assignments Details:');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      learningContext.upcomingAssignments.slice(0, 3).forEach((assignment, index) => {
        const dueDate = new Date(assignment.due_date + 'T00:00:00');
        dueDate.setHours(0, 0, 0, 0);
        const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        
        let urgencyNote = '';
        if (daysUntil === 0) urgencyNote = ' [TODAY!]';
        else if (daysUntil === 1) urgencyNote = ' [TOMORROW]';
        
        console.log(`  ${index + 1}. ${assignment.title} (${assignment.content_type}) - Due in ${daysUntil} days${urgencyNote}`);
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
    next();
  }
};