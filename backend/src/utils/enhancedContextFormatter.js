// Enhanced context formatter that prioritizes lesson content and makes it AI-friendly

const { getCurrentDateInfo, getDueDateStatus } = require('./dateUtils');

// Format lesson context in a way that AI can easily use in responses
function formatLessonsForAI(lessons, currentDate) {
  if (!lessons || lessons.length === 0) {
    return "No current lessons available.";
  }

  const today = new Date(currentDate).toISOString().split('T')[0];
  
  // Categorize lessons by urgency
  const dueToday = [];
  const dueSoon = [];
  const upcoming = [];
  
  lessons.forEach(lesson => {
    if (lesson.due_date) {
      const daysUntilDue = Math.ceil((new Date(lesson.due_date) - new Date(today)) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue === 0) {
        dueToday.push(lesson);
      } else if (daysUntilDue <= 3) {
        dueSoon.push(lesson);
      } else {
        upcoming.push(lesson);
      }
    } else {
      upcoming.push(lesson);
    }
  });

  let context = "";

  // Priority 1: Due today
  if (dueToday.length > 0) {
    context += "🎯 **LESSONS DUE TODAY** (Start with these!):\n";
    dueToday.forEach(lesson => {
      context += formatSingleLesson(lesson, "DUE TODAY");
    });
    context += "\n";
  }

  // Priority 2: Due soon
  if (dueSoon.length > 0) {
    context += "📅 **LESSONS DUE SOON** (Prepare for these):\n";
    dueSoon.forEach(lesson => {
      const daysUntilDue = Math.ceil((new Date(lesson.due_date) - new Date(today)) / (1000 * 60 * 60 * 24));
      const urgency = daysUntilDue === 1 ? "DUE TOMORROW" : `DUE IN ${daysUntilDue} DAYS`;
      context += formatSingleLesson(lesson, urgency);
    });
    context += "\n";
  }

  // Priority 3: All current lessons with details
  if (upcoming.length > 0) {
    context += "📚 **CURRENT CURRICULUM** (Available to study):\n";
    upcoming.slice(0, 8).forEach(lesson => { // Limit to avoid overwhelming
      context += formatSingleLesson(lesson);
    });
    if (upcoming.length > 8) {
      context += `... and ${upcoming.length - 8} more lessons available\n`;
    }
  }

  return context;
}

// Format a single lesson with all its rich content
function formatSingleLesson(lesson, urgency = null) {
  let content = `**${lesson.title}** (${lesson.subject})`;
  
  if (urgency) {
    content += ` - ⚠️ ${urgency}`;
  } else if (lesson.due_date) {
    content += ` - Due: ${lesson.due_date}`;
  }
  content += "\n";

  // Add learning objectives - these are key for AI responses
  if (lesson.objectives && lesson.objectives.length > 0) {
    content += `  🎯 Learning Goals: ${lesson.objectives.join(', ')}\n`;
  }

  // Add lesson focus - what the lesson is about
  if (lesson.focus) {
    content += `  📖 Focus: ${lesson.focus}\n`;
  }

  // Add key concepts for vocabulary
  if (lesson.keywords && lesson.keywords.length > 0) {
    content += `  🔑 Key Concepts: ${lesson.keywords.join(', ')}\n`;
  }

  // Add difficulty level for appropriate support
  if (lesson.difficulty_level) {
    content += `  📊 Level: ${lesson.difficulty_level}\n`;
  }

  content += "\n";
  return content;
}

// Enhanced context formatter that prioritizes actionable information
function formatEnhancedLearningContext(mcpContext, currentDate = null) {
  if (!mcpContext || mcpContext.error) {
    return "I don't have access to your current lessons right now, but I'm here to help with any questions you have!";
  }

  const { today, currentDate: autoCurrentDate } = getCurrentDateInfo();
  const displayDate = currentDate || autoCurrentDate;
  
  let context = `📅 Today is ${displayDate}\n\n`;

  // Priority 1: Any overdue work (most urgent)
  if (mcpContext.overdue && mcpContext.overdue.length > 0) {
    context += "🚨 **URGENT - OVERDUE WORK**:\n";
    mcpContext.overdue.forEach(item => {
      context += `• ${item.title} (${item.subject || 'General'}) - Was due: ${item.due_date}\n`;
    });
    context += "\n";
  }

  // Priority 2: Current lessons with rich content
  if (mcpContext.lessons && mcpContext.lessons.length > 0) {
    context += formatLessonsForAI(mcpContext.lessons, displayDate);
  } else {
    // Fallback to raw lesson data if parsing didn't work
    if (mcpContext.fullContextText && mcpContext.fullContextText.includes('Current Lessons')) {
      context += "📚 **YOUR CURRENT LESSONS:**\n";
      const lessonMatch = mcpContext.fullContextText.match(/📚 \*\*Current Lessons[\s\S]*?(?=\n\n|\n📊|$)/);
      if (lessonMatch) {
        context += lessonMatch[0] + "\n\n";
      }
    }
  }

  // Priority 3: Recent grades/performance (for encouragement)
  if (mcpContext.recentWork && mcpContext.recentWork.length > 0) {
    context += "✨ **RECENT ACHIEVEMENTS**:\n";
    mcpContext.recentWork.slice(0, 3).forEach(work => {
      let gradeInfo = '';
      if (work.grade_value && work.grade_max_value) {
        const percentage = Math.round((work.grade_value / work.grade_max_value) * 100);
        gradeInfo = ` - ${percentage}% ⭐`;
      }
      context += `• ${work.title} (${work.subject || 'General'})${gradeInfo}\n`;
    });
    context += "\n";
  }

  // Priority 4: What to focus on next
  if (mcpContext.currentFocus) {
    context += `🎯 **RECOMMENDED FOCUS**: "${mcpContext.currentFocus.title}"\n`;
    if (mcpContext.currentFocus.due_date) {
      const status = getDueDateStatus(mcpContext.currentFocus.due_date, today);
      context += `   ${status.text} ${status.urgent ? '⚠️' : ''}\n`;
    }
    context += "\n";
  }

  // Add helpful summary
  const totalLessons = mcpContext.lessons ? mcpContext.lessons.length : 0;
  const totalOverdue = mcpContext.overdue ? mcpContext.overdue.length : 0;
  
  context += "💡 **AI TUTOR GUIDANCE**:\n";
  if (totalOverdue > 0) {
    context += `• Priority: Complete ${totalOverdue} overdue assignment${totalOverdue > 1 ? 's' : ''} first\n`;
  }
  context += `• ${totalLessons} lessons available to explore\n`;
  context += "• Ask me about any lesson objectives, concepts, or questions!\n";

  return context;
}

// Helper to extract specific lesson by name
function findLessonByName(lessons, lessonName) {
  if (!lessons || !lessonName) return null;
  
  return lessons.find(lesson => 
    lesson.title.toLowerCase().includes(lessonName.toLowerCase()) ||
    lessonName.toLowerCase().includes(lesson.title.toLowerCase())
  );
}

// Helper to get lesson suggestions based on current context
function generateLessonSuggestions(mcpContext, studentMessage) {
  if (!mcpContext.lessons || mcpContext.lessons.length === 0) {
    return [];
  }

  const suggestions = [];
  const messageLower = studentMessage.toLowerCase();

  // Check for subject mentions
  const subjectMentions = {
    'math': ['math', 'mathematics', 'number', 'count', 'add', 'subtract', 'multiply', 'divide'],
    'history': ['history', 'past', 'timeline', 'historical'],
    'science': ['science', 'experiment', 'hypothesis'],
    'english': ['reading', 'writing', 'story', 'book']
  };

  for (const [subject, keywords] of Object.entries(subjectMentions)) {
    if (keywords.some(keyword => messageLower.includes(keyword))) {
      const subjectLessons = mcpContext.lessons.filter(lesson => 
        lesson.subject.toLowerCase().includes(subject)
      );
      suggestions.push(...subjectLessons.slice(0, 2));
    }
  }

  // If no specific subject match, suggest due soon or current focus
  if (suggestions.length === 0) {
    const dueSoon = mcpContext.lessons.filter(lesson => lesson.due_date);
    suggestions.push(...dueSoon.slice(0, 2));
  }

  return suggestions.slice(0, 3); // Limit to 3 suggestions
}

module.exports = {
  formatEnhancedLearningContext,
  formatLessonsForAI,
  formatSingleLesson,
  findLessonByName,
  generateLessonSuggestions
};