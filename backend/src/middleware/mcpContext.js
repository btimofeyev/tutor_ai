// backend/src/middleware/mcpContext.js - Updated with date awareness

const mcpClient = require('../services/mcpClient');
const { getCurrentDateInfo, getDueDateStatus } = require('../utils/dateUtils');

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
  
    const { today, currentDate: autoCurrentDate } = getCurrentDateInfo();
    const displayDate = currentDate || autoCurrentDate;
    
    let context = `📅 **Current Date**: ${displayDate}\n\n`;
  
    // DEDUPLICATE MATERIALS: Combine and deduplicate all materials by ID
    const allMaterialsRaw = [
      ...(mcpContext.currentMaterials || []),
      ...(mcpContext.upcomingAssignments || []),
      ...(mcpContext.allMaterials || [])
    ];
  
    // Remove duplicates by ID
    const seenIds = new Set();
    const allMaterials = allMaterialsRaw.filter(material => {
      if (!material.id) return true;
      if (seenIds.has(material.id)) return false;
      seenIds.add(material.id);
      return true;
    });
  
    console.log(`📋 Deduplication: ${allMaterialsRaw.length} raw materials -> ${allMaterials.length} unique materials`);
  
    // CATEGORIZE ALL MATERIALS BY DUE DATE STATUS (including completed for overdue check)
    const materialsByStatus = {
      overdue: [],
      today: [],
      tomorrow: [],
      soon: [],
      upcoming: [],
      future: [],
      noDate: []
    };
  
    // Include both completed AND incomplete materials for overdue detection
    allMaterials.forEach(material => {
      if (!material.due_date) {
        // Only include incomplete materials in noDate
        if (!material.completed_at) {
          materialsByStatus.noDate.push(material);
        }
      } else {
        const status = getDueDateStatus(material.due_date, today);
        
        // For overdue: include both completed and incomplete to catch missed deadlines
        if (status.status === 'overdue') {
          materialsByStatus.overdue.push(material);
        } else if (!material.completed_at) {
          // For other statuses: only include incomplete materials
          materialsByStatus[status.status].push(material);
        }
      }
    });
  
    // ACCURATE GRADE INFORMATION (show early for context)
    if (mcpContext.gradeAnalysis && mcpContext.gradeAnalysis.bySubject) {
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
  
    // ===== PRIORITY ASSIGNMENT SECTIONS =====
    // These sections are designed to be the PRIMARY response for "What lessons do I have?" type queries
  
    // 🚨 OVERDUE ASSIGNMENTS (HIGHEST PRIORITY - always show first)
    if (materialsByStatus.overdue.length > 0) {
      context += `🚨 **OVERDUE ASSIGNMENTS** - Need immediate attention!\n`;
      materialsByStatus.overdue.forEach((material, index) => {
        const subjectName = material.lesson?.unit?.child_subject?.subject?.name || 
                           material.lesson?.unit?.child_subject?.custom_subject_name_override || 'General';
        const status = getDueDateStatus(material.due_date, today);
        const completionStatus = material.completed_at ? ' (Completed late)' : '';
        context += `${index + 1}. **${material.title}** (${subjectName}) - ${status.text}${completionStatus} 🚨\n`;
      });
      context += "\n";
    }
  
    // ⚠️ DUE TODAY ASSIGNMENTS
    if (materialsByStatus.today.length > 0) {
      context += `⚠️ **DUE TODAY** - Complete these today!\n`;
      materialsByStatus.today.forEach((material, index) => {
        const subjectName = material.lesson?.unit?.child_subject?.subject?.name || 
                           material.lesson?.unit?.child_subject?.custom_subject_name_override || 'General';
        context += `${index + 1}. **${material.title}** (${subjectName}) - DUE TODAY ⚠️\n`;
      });
      context += "\n";
    }
  
    // ⏰ DUE TOMORROW ASSIGNMENTS
    if (materialsByStatus.tomorrow.length > 0) {
      context += `⏰ **DUE TOMORROW** - Start working on these!\n`;
      materialsByStatus.tomorrow.forEach((material, index) => {
        const subjectName = material.lesson?.unit?.child_subject?.subject?.name || 
                           material.lesson?.unit?.child_subject?.custom_subject_name_override || 'General';
        context += `${index + 1}. **${material.title}** (${subjectName}) - DUE TOMORROW ⏰\n`;
      });
      context += "\n";
    }
  
    // 📅 DUE SOON (within 3 days)
    if (materialsByStatus.soon.length > 0) {
      context += `📅 **DUE SOON** (within 3 days):\n`;
      materialsByStatus.soon.forEach((material, index) => {
        const subjectName = material.lesson?.unit?.child_subject?.subject?.name || 
                           material.lesson?.unit?.child_subject?.custom_subject_name_override || 'General';
        const status = getDueDateStatus(material.due_date, today);
        context += `${index + 1}. **${material.title}** (${subjectName}) - ${status.text} ⚠️\n`;
      });
      context += "\n";
    }
  
    // 📋 UPCOMING ASSIGNMENTS (4-7 days)
    if (materialsByStatus.upcoming.length > 0) {
      context += `📋 **UPCOMING ASSIGNMENTS** (this week):\n`;
      materialsByStatus.upcoming.slice(0, 5).forEach((material, index) => {
        const subjectName = material.lesson?.unit?.child_subject?.subject?.name || 
                           material.lesson?.unit?.child_subject?.custom_subject_name_override || 'General';
        const status = getDueDateStatus(material.due_date, today);
        context += `${index + 1}. **${material.title}** (${subjectName}) - ${status.text}\n`;
      });
      if (materialsByStatus.upcoming.length > 5) {
        context += `   ... and ${materialsByStatus.upcoming.length - 5} more upcoming assignments\n`;
      }
      context += "\n";
    }
  
    // 📖 IN-PROGRESS MATERIALS (no due date)
    if (materialsByStatus.noDate.length > 0) {
      context += `📖 **Other Materials** (no due date):\n`;
      materialsByStatus.noDate.slice(0, 5).forEach((material, index) => {
        const subjectName = material.lesson?.unit?.child_subject?.subject?.name || 
                           material.lesson?.unit?.child_subject?.custom_subject_name_override || 'General';
        context += `${index + 1}. **${material.title}** (${subjectName})\n`;
      });
      if (materialsByStatus.noDate.length > 5) {
        context += `   ... and ${materialsByStatus.noDate.length - 5} more materials\n`;
      }
      context += "\n";
    }
  
    // ===== SECONDARY INFORMATION SECTIONS =====
  
    // COMPLETED ASSIGNMENTS WITH ACTUAL GRADES (for grade-related queries)
    if (mcpContext.completedMaterials && mcpContext.completedMaterials.length > 0) {
      context += "✅ **Recent Completed Assignments**:\n";
      
      const gradedMaterials = mcpContext.completedMaterials
        .filter(m => m.grade_value && m.grade_max_value)
        .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
        .slice(0, 5); // Show fewer to save space
      
      gradedMaterials.forEach((material, index) => {
        const percentage = Math.round((parseFloat(material.grade_value) / parseFloat(material.grade_max_value)) * 100);
        const subjectName = material.lesson?.unit?.child_subject?.subject?.name || 
                           material.lesson?.unit?.child_subject?.custom_subject_name_override || 'General';
        
        context += `${index + 1}. **${material.title}** (${subjectName}): ${material.grade_value}/${material.grade_max_value} = ${percentage}%\n`;
      });
      context += "\n";
    }
  
    // MATERIALS NEEDING REVIEW (for performance improvement)
    if (mcpContext.materialsForReview && mcpContext.materialsForReview.length > 0) {
      context += "📝 **Materials Needing Review** (below 70%):\n";
      mcpContext.materialsForReview.slice(0, 3).forEach((material, index) => {
        const subjectName = material.lesson?.unit?.child_subject?.subject?.name || 
                           material.lesson?.unit?.child_subject?.custom_subject_name_override || 'General';
        context += `${index + 1}. **${material.title}** (${subjectName}): ${material.percentage}% - ${material.reason}\n`;
      });
      context += "\n";
    }
  
    // CURRENT FOCUS (highest priority item for immediate action)
    const currentFocus = materialsByStatus.overdue[0] || 
                        materialsByStatus.today[0] || 
                        materialsByStatus.tomorrow[0] || 
                        materialsByStatus.soon[0] || 
                        mcpContext.currentFocus;
  
    if (currentFocus) {
      context += `🎯 **Immediate Priority**: "${currentFocus.title}" (${currentFocus.content_type || 'lesson'})`;
      
      if (currentFocus.due_date) {
        const status = getDueDateStatus(currentFocus.due_date, today);
        context += ` - **${status.text}**`;
        if (status.urgent) context += ` ${status.status === 'overdue' ? '🚨' : '⚠️'}`;
      }
      
      if (currentFocus.lesson_json?.learning_objectives?.length > 0) {
        context += `\n   📚 Learning goals: ${currentFocus.lesson_json.learning_objectives.slice(0, 2).join(', ')}`;
      }
      
      context += "\n\n";
    }
  
    // SUMMARY STATUS (for quick overview)
    const totalOverdue = materialsByStatus.overdue.length;
    const totalDueToday = materialsByStatus.today.length;
    const totalDueTomorrow = materialsByStatus.tomorrow.length;
    const totalDueSoon = materialsByStatus.soon.length;
  
    context += "🔔 **Assignment Status Summary**:\n";
    if (totalOverdue > 0) context += `- 🚨 ${totalOverdue} OVERDUE assignment${totalOverdue !== 1 ? 's' : ''} (needs immediate attention)\n`;
    if (totalDueToday > 0) context += `- ⚠️ ${totalDueToday} due TODAY\n`;
    if (totalDueTomorrow > 0) context += `- ⏰ ${totalDueTomorrow} due TOMORROW\n`;
    if (totalDueSoon > 0) context += `- 📅 ${totalDueSoon} due within 3 days\n`;
    
    if (totalOverdue === 0 && totalDueToday === 0 && totalDueTomorrow === 0 && totalDueSoon === 0) {
      context += "- ✅ No urgent assignments - you're caught up with immediate deadlines! 🎉\n";
    }
    context += "\n";
  
    // ADDITIONAL CONTEXT for lesson-specific queries
    context += `**Total Active Materials**: ${allMaterials.filter(m => !m.completed_at).length}\n`;
    context += `**Completed Materials**: ${mcpContext.completedMaterials?.length || 0}\n`;
  
    return context;
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