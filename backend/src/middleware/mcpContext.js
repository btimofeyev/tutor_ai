// backend/src/middleware/mcpContext.js - SIMPLIFIED VERSION
const mcpClient = require('../services/mcpClientWrapper');
const { getCurrentDateInfo, getDueDateStatus } = require('../utils/dateUtils');

// 🎯 SMART QUERY DETECTION
exports.isLessonQuery = (message) => {
  const lessonKeywords = [
    'lesson', 'lessons', 'homework', 'assignment', 'assignments', 'due', 'upcoming', 
    'schedule', 'what do i have', 'what\'s next', 'coming up', 'work', 'study',
    'practice', 'review', 'test', 'quiz', 'worksheet', 'today', 'tomorrow'
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

// 🎯 SMART CONTEXT FORMATTING
exports.formatLearningContextForAI = (mcpContext, currentDate = null) => {
  if (!mcpContext || mcpContext.error) {
    return "No specific curriculum data available at the moment.";
  }

  const { today, currentDate: autoCurrentDate } = getCurrentDateInfo();
  const displayDate = currentDate || autoCurrentDate;
  
  let context = `📅 **Current Date**: ${displayDate}\n\n`;

  // If we have the full context text from the new MCP server, include it
  if (mcpContext.fullContextText) {
    context += mcpContext.fullContextText;
    return context;
  }

  // Otherwise, use the legacy formatting
  // 🚨 OVERDUE ASSIGNMENTS (HIGHEST PRIORITY)
  if (mcpContext.overdue?.length > 0) {
    context += `🚨 **OVERDUE ASSIGNMENTS** - Need immediate attention!\n`;
    mcpContext.overdue.forEach((material, index) => {
      const subjectName = material.subject || material.lesson?.unit?.child_subject?.subject?.name || 
                         material.lesson?.unit?.child_subject?.custom_subject_name_override || 'General';
      const status = getDueDateStatus(material.due_date, today);
      const completionStatus = material.completed_at ? ' (Completed late)' : '';
      context += `${index + 1}. **${material.title}** (${subjectName}) - ${status.text}${completionStatus} 🚨\n`;
    });
    context += "\n";
  }

  // 📚 CURRENT LESSONS (ENHANCED!)
  if (mcpContext.lessons?.length > 0) {
    context += `📚 **Current Lessons (${mcpContext.lessons.length}):**\n`;
    mcpContext.lessons.forEach((lesson, index) => {
      context += `${index + 1}. **${lesson.title}** (${lesson.subject || 'General'})\n`;
      
      // Add learning objectives if available
      if (lesson.objectives && lesson.objectives.length > 0) {
        context += `   📋 Learning Goals: ${lesson.objectives.join(', ')}\n`;
      }
      
      // Add lesson focus if available
      if (lesson.focus) {
        context += `   📖 Focus: ${lesson.focus}\n`;
      }
      
      // Add key concepts if available
      if (lesson.keywords && lesson.keywords.length > 0) {
        context += `   🔑 Key Concepts: ${lesson.keywords.join(', ')}\n`;
      }
      
      // Add difficulty level for confidence building
      if (lesson.difficulty_level) {
        context += `   📊 Level: ${lesson.difficulty_level}\n`;
      }
      
      // Add due date if available
      if (lesson.due_date) {
        context += `   📅 Due: ${lesson.due_date}\n`;
      }
    });
    context += "\n";
  }

  // 📊 CURRENT GRADES (if available)
  if (mcpContext.gradeAnalysis?.bySubject) {
    context += "📊 **Current Grades**:\n";
    
    for (const [subject, gradeData] of Object.entries(mcpContext.gradeAnalysis.bySubject)) {
      if (gradeData.average !== null) {
        context += `- **${subject}**: ${gradeData.average}% (${gradeData.earned}/${gradeData.possible} points from ${gradeData.count} assignments)\n`;
      } else {
        context += `- **${subject}**: No grades yet (${gradeData.materials.length} materials assigned)\n`;
      }
    }
    
    if (mcpContext.gradeAnalysis.overall.average !== null) {
      context += `- **Overall Average**: ${mcpContext.gradeAnalysis.overall.average}% across all subjects\n`;
    }
    context += "\n";
  }

  // 📚 CURRENT ASSIGNMENTS
  if (mcpContext.currentMaterials?.length > 0) {
    // Group by urgency
    const materialsByUrgency = {
      today: [],
      tomorrow: [],
      soon: [],
      upcoming: [],
      noDate: []
    };

    mcpContext.currentMaterials.forEach(material => {
      if (!material.due_date) {
        materialsByUrgency.noDate.push(material);
      } else {
        const status = getDueDateStatus(material.due_date, today);
        switch (status.status) {
          case 'today':
            materialsByUrgency.today.push(material);
            break;
          case 'tomorrow':
            materialsByUrgency.tomorrow.push(material);
            break;
          case 'soon':
            materialsByUrgency.soon.push(material);
            break;
          default:
            materialsByUrgency.upcoming.push(material);
        }
      }
    });

    // Show due today
    if (materialsByUrgency.today.length > 0) {
      context += `⚠️ **DUE TODAY** - Complete these today!\n`;
      materialsByUrgency.today.forEach((material, index) => {
        const subjectName = material.lesson?.unit?.child_subject?.subject?.name || 
                           material.lesson?.unit?.child_subject?.custom_subject_name_override || 'General';
        context += `${index + 1}. **${material.title}** (${subjectName}) - DUE TODAY ⚠️\n`;
      });
      context += "\n";
    }

    // Show due tomorrow
    if (materialsByUrgency.tomorrow.length > 0) {
      context += `⏰ **DUE TOMORROW** - Start working on these!\n`;
      materialsByUrgency.tomorrow.forEach((material, index) => {
        const subjectName = material.lesson?.unit?.child_subject?.subject?.name || 
                           material.lesson?.unit?.child_subject?.custom_subject_name_override || 'General';
        context += `${index + 1}. **${material.title}** (${subjectName}) - DUE TOMORROW ⏰\n`;
      });
      context += "\n";
    }

    // Show upcoming (limit to 5)
    if (materialsByUrgency.upcoming.length > 0) {
      context += `📋 **UPCOMING ASSIGNMENTS**:\n`;
      materialsByUrgency.upcoming.slice(0, 5).forEach((material, index) => {
        const subjectName = material.lesson?.unit?.child_subject?.subject?.name || 
                           material.lesson?.unit?.child_subject?.custom_subject_name_override || 'General';
        const status = getDueDateStatus(material.due_date, today);
        context += `${index + 1}. **${material.title}** (${subjectName}) - ${status.text}\n`;
      });
      if (materialsByUrgency.upcoming.length > 5) {
        context += `   ... and ${materialsByUrgency.upcoming.length - 5} more upcoming assignments\n`;
      }
      context += "\n";
    }
  }

  // ✅ RECENT COMPLETED WORK (if available)
  if (mcpContext.recentWork?.length > 0) {
    context += "✅ **Recent Completed Work**:\n";
    
    mcpContext.recentWork.slice(0, 5).forEach((material, index) => {
      const subjectName = material.lesson?.unit?.child_subject?.subject?.name || 
                         material.lesson?.unit?.child_subject?.custom_subject_name_override || 'General';
      
      let gradeInfo = '';
      if (material.grade_value && material.grade_max_value) {
        const percentage = Math.round((parseFloat(material.grade_value) / parseFloat(material.grade_max_value)) * 100);
        gradeInfo = `: ${material.grade_value}/${material.grade_max_value} = ${percentage}%`;
      }
      
      context += `${index + 1}. **${material.title}** (${subjectName})${gradeInfo}\n`;
    });
    context += "\n";
  }

  // 📝 MATERIALS NEEDING REVIEW
  if (mcpContext.materialsForReview?.length > 0) {
    context += "📝 **Materials Needing Review** (below 70%):\n";
    mcpContext.materialsForReview.slice(0, 3).forEach((material, index) => {
      const subjectName = material.lesson?.unit?.child_subject?.subject?.name || 
                         material.lesson?.unit?.child_subject?.custom_subject_name_override || 'General';
      context += `${index + 1}. **${material.title}** (${subjectName}): ${material.percentage}% - ${material.reason}\n`;
    });
    context += "\n";
  }

  // 🎯 CURRENT FOCUS
  if (mcpContext.currentFocus) {
    context += `🎯 **Immediate Priority**: "${mcpContext.currentFocus.title}" (${mcpContext.currentFocus.content_type || 'lesson'})`;
    
    if (mcpContext.currentFocus.due_date) {
      const status = getDueDateStatus(mcpContext.currentFocus.due_date, today);
      context += ` - **${status.text}**`;
      if (status.urgent) context += ` ${status.status === 'overdue' ? '🚨' : '⚠️'}`;
    }
    context += "\n\n";
  }

  // 🔔 SUMMARY STATUS
  const totalOverdue = mcpContext.overdue?.length || 0;
  const totalCurrent = mcpContext.currentMaterials?.length || 0;
  const totalRecent = mcpContext.recentWork?.length || 0;

  context += "🔔 **Status Summary**:\n";
  if (totalOverdue > 0) context += `- 🚨 ${totalOverdue} OVERDUE assignment${totalOverdue !== 1 ? 's' : ''} (needs immediate attention)\n`;
  context += `- 📚 ${totalCurrent} active assignments\n`;
  context += `- ✅ ${totalRecent} recently completed\n`;
  
  if (totalOverdue === 0) {
    context += "- ✅ No overdue assignments - you're caught up! 🎉\n";
  }

  return context;
};

// 🚀 SIMPLIFIED MIDDLEWARE
exports.enrichWithMCPContext = async (req, res, next) => {
  const childId = req.child?.child_id;
  
  if (!childId) {
    return next();
  }

  try {

    // Check if this is a grade-related query
    const message = req.body?.message || '';
    const isGradeRelatedQuery = exports.isGradeQuery(message);

    let learningContext;
    
    if (isGradeRelatedQuery) {
      learningContext = await mcpClient.getEnhancedLearningContext(childId);
    } else {
      learningContext = await mcpClient.getLearningContext(childId);
    }

    // Add to request object
    req.mcpContext = learningContext;
    req.isGradeQuery = isGradeRelatedQuery;

    // Log summary

    next();
  } catch (error) {
    console.error('❌ MCP context enrichment error:', error);
    
    // Continue without MCP context on error
    req.mcpContext = {
      currentMaterials: [],
      overdue: [],
      recentWork: [],
      currentFocus: null,
      gradeAnalysis: null,
      error: error.message
    };
    req.isGradeQuery = false;
    next();
  }
};