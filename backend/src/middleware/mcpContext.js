const mcpClient = require('../services/mcpClient');

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

    // Log the context for debugging
    console.log('MCP Context Summary:');
    console.log('- Child Subjects:', learningContext.childSubjects?.length || 0);
    console.log('- Current Lessons:', learningContext.currentLessons?.length || 0);
    console.log('- Upcoming Assignments:', learningContext.upcomingAssignments?.length || 0);
    console.log('- Current Focus:', learningContext.currentFocus?.title || 'None');

    // More detailed logging for the first few items
    if (learningContext.currentLessons?.length > 0) {
      console.log('Current Lessons Details:');
      learningContext.currentLessons.slice(0, 3).forEach((lesson, index) => {
        console.log(`  ${index + 1}. ${lesson.title} (${lesson.content_type}) - Due: ${lesson.due_date || 'No due date'}`);
      });
    }

    if (learningContext.upcomingAssignments?.length > 0) {
      console.log('Upcoming Assignments Details:');
      learningContext.upcomingAssignments.slice(0, 3).forEach((assignment, index) => {
        const dueDate = new Date(assignment.due_date);
        const today = new Date();
        const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        console.log(`  ${index + 1}. ${assignment.title} (${assignment.content_type}) - Due in ${daysUntil} days`);
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

// Helper function to determine if a query is asking about lessons/assignments
exports.isLessonQuery = (message) => {
  const lessonKeywords = [
    'lesson', 'lessons', 'homework', 'assignment', 'assignments', 'due', 'upcoming', 
    'schedule', 'what do i have', 'what\'s next', 'coming up', 'work', 'study',
    'practice', 'review', 'test', 'quiz', 'worksheet'
  ];
  
  const messageLower = message.toLowerCase();
  return lessonKeywords.some(keyword => messageLower.includes(keyword));
};

// Helper function to format learning context for AI prompts
exports.formatLearningContextForAI = (mcpContext) => {
  if (!mcpContext || mcpContext.error) {
    return "No specific curriculum data available at the moment.";
  }

  let context = "";

  // Current focus
  if (mcpContext.currentFocus) {
    const focus = mcpContext.currentFocus;
    context += `🎯 **Current Focus**: "${focus.title}" (${focus.content_type || 'lesson'})`;
    
    if (focus.due_date) {
      const dueDate = new Date(focus.due_date);
      const today = new Date();
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue === 0) {
        context += ` - **DUE TODAY!** ⚠️`;
      } else if (daysUntilDue === 1) {
        context += ` - **Due tomorrow** ⏰`;
      } else if (daysUntilDue > 0) {
        context += ` - Due in ${daysUntilDue} days`;
      } else {
        context += ` - **OVERDUE by ${Math.abs(daysUntilDue)} days!** 🚨`;
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

  // Active lessons
  if (mcpContext.currentLessons && mcpContext.currentLessons.length > 0) {
    context += "📖 **Active Lessons**:\n";
    mcpContext.currentLessons.slice(0, 4).forEach((lesson, index) => {
      const subjectName = lesson.child_subjects?.subjects?.name || 'General';
      context += `${index + 1}. "${lesson.title}" (${subjectName})`;
      
      if (lesson.due_date) {
        const dueDate = new Date(lesson.due_date);
        const today = new Date();
        const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntil <= 1) {
          context += ` - Due ${daysUntil === 0 ? 'today' : 'tomorrow'} ⚠️`;
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

  // Upcoming assignments with urgency
  if (mcpContext.upcomingAssignments && mcpContext.upcomingAssignments.length > 0) {
    context += "📅 **Upcoming Assignments**:\n";
    mcpContext.upcomingAssignments.slice(0, 3).forEach((assignment, index) => {
      const subjectName = assignment.child_subjects?.subjects?.name || 'General';
      const dueDate = new Date(assignment.due_date);
      const today = new Date();
      const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      
      let urgencyIcon = "";
      if (daysUntil <= 1) urgencyIcon = " 🚨";
      else if (daysUntil <= 3) urgencyIcon = " ⚠️";
      else if (daysUntil <= 7) urgencyIcon = " ⏰";
      
      context += `${index + 1}. "${assignment.title}" (${subjectName}) - Due ${dueDate.toLocaleDateString()}${urgencyIcon}\n`;
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