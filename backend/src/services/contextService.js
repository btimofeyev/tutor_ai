/**
 * Unified Context Service
 * Consolidates conversation context formatting, query detection, and intelligence
 * Replaces: conversationEnhancer.js, conversationIntelligence.js, enhancedContextFormatter.js
 */

const { getCurrentDateInfo, getDueDateStatus } = require('../utils/dateUtils');
const supabase = require('../utils/supabaseClient');

class ContextService {
  // === QUERY DETECTION ===
  
  isLessonQuery(message) {
    const lessonKeywords = [
      'lesson', 'lessons', 'homework', 'assignment', 'assignments', 'due', 'upcoming',
      'schedule', 'what do i have', 'what\'s next', 'coming up', 'work', 'study',
      'practice', 'review', 'test', 'quiz', 'worksheet', 'today', 'tomorrow'
    ];
    const messageLower = message.toLowerCase();
    return lessonKeywords.some(keyword => messageLower.includes(keyword));
  }

  isGradeQuery(message) {
    const gradeKeywords = [
      'grade', 'grades', 'score', 'scores', 'review', 'wrong', 'missed', 'failed',
      'perfect', 'how did i do', 'check my work', 'mistakes', 'incorrect', 'correct',
      'average', 'performance', 'results', 'feedback', 'percent', '%', 'points',
      'better', 'improve', 'study more', 'practice more', 'not good', 'disappointed'
    ];
    const messageLower = message.toLowerCase();
    return gradeKeywords.some(keyword => messageLower.includes(keyword));
  }

  detectConversationType(message) {
    const messageLower = message.toLowerCase();
    
    if (this.isHomeworkHelpQuery(messageLower)) {
      return { type: 'homework_help', guidance: 'Guide through problems step-by-step, reference lesson content' };
    }
    if (this.isConceptQuestionQuery(messageLower)) {
      return { type: 'concept_explanation', guidance: 'Explain using lesson vocabulary and connect to current curriculum' };
    }
    if (this.isLessonPreparationQuery(messageLower)) {
      return { type: 'lesson_preparation', guidance: 'Focus on lesson objectives, key concepts, and what to expect' };
    }
    return { type: 'general_chat', guidance: 'Be friendly but guide toward current lessons if appropriate' };
  }

  isHomeworkHelpQuery(messageLower) {
    const helpKeywords = ['help', 'stuck', 'don\'t understand', 'confused', 'problem', 'question'];
    return helpKeywords.some(keyword => messageLower.includes(keyword));
  }

  isConceptQuestionQuery(messageLower) {
    const conceptKeywords = ['what is', 'explain', 'how does', 'why', 'what does', 'mean'];
    return conceptKeywords.some(keyword => messageLower.includes(keyword));
  }

  isLessonPreparationQuery(messageLower) {
    const prepKeywords = ['prepare', 'ready for', 'study for', 'review for', 'what should i know'];
    return prepKeywords.some(keyword => messageLower.includes(keyword));
  }

  // === CONTEXT FORMATTING ===

  formatLearningContextForAI(mcpContext, currentDate = null) {
    if (!mcpContext || mcpContext.error) {
      return "No specific curriculum data available at the moment.";
    }

    const { currentDate: autoCurrentDate } = getCurrentDateInfo();
    const displayDate = currentDate || autoCurrentDate;

    let context = `📅 **Current Date**: ${displayDate}\n\n`;

    // Use full context text from new MCP server if available
    if (mcpContext.fullContextText) {
      context += mcpContext.fullContextText;
      return context;
    }

    // Legacy formatting for backward compatibility
    return context + this.formatLegacyContext(mcpContext);
  }

  formatLegacyContext(mcpContext) {
    const { today } = getCurrentDateInfo();
    let context = '';

    // Overdue assignments (highest priority)
    if (mcpContext.overdue?.length > 0) {
      context += `🚨 **OVERDUE ASSIGNMENTS** - Need immediate attention!\n`;
      mcpContext.overdue.forEach((material, index) => {
        const subjectName = this.getSubjectName(material);
        const status = getDueDateStatus(material.due_date, today);
        const completionStatus = material.completed_at ? ' (Completed late)' : '';
        context += `${index + 1}. **${material.title}** (${subjectName}) - ${status.text}${completionStatus} 🚨\n`;
      });
      context += "\n";
    }

    // Current lessons with enhanced info
    if (mcpContext.lessons?.length > 0) {
      context += this.formatLessonsSection(mcpContext.lessons);
    }

    // Grades analysis
    if (mcpContext.gradeAnalysis?.bySubject) {
      context += this.formatGradesSection(mcpContext.gradeAnalysis);
    }

    // Current assignments by urgency
    if (mcpContext.currentMaterials?.length > 0) {
      context += this.formatAssignmentsByUrgency(mcpContext.currentMaterials, today);
    }

    // Recent completed work
    if (mcpContext.recentWork?.length > 0) {
      context += this.formatRecentWorkSection(mcpContext.recentWork);
    }

    // Materials needing review
    if (mcpContext.materialsForReview?.length > 0) {
      context += this.formatReviewMaterialsSection(mcpContext.materialsForReview);
    }

    // Current focus and summary
    context += this.formatFocusAndSummary(mcpContext, today);

    return context;
  }

  formatLessonsSection(lessons) {
    let context = `📚 **Current Lessons (${lessons.length}):**\n`;
    lessons.forEach((lesson, index) => {
      context += `${index + 1}. **${lesson.title}** (${lesson.subject || 'General'})\n`;
      if (lesson.objectives?.length > 0) {
        context += `   📋 Learning Goals: ${lesson.objectives.join(', ')}\n`;
      }
      if (lesson.focus) {
        context += `   📖 Focus: ${lesson.focus}\n`;
      }
      if (lesson.keywords?.length > 0) {
        context += `   🔑 Key Concepts: ${lesson.keywords.join(', ')}\n`;
      }
      if (lesson.difficulty_level) {
        context += `   📊 Level: ${lesson.difficulty_level}\n`;
      }
      if (lesson.due_date) {
        context += `   📅 Due: ${lesson.due_date}\n`;
      }
    });
    return context + "\n";
  }

  formatGradesSection(gradeAnalysis) {
    let context = "📊 **Current Grades**:\n";
    for (const [subject, gradeData] of Object.entries(gradeAnalysis.bySubject)) {
      if (gradeData.average !== null) {
        context += `- **${subject}**: ${gradeData.average}% (${gradeData.earned}/${gradeData.possible} points from ${gradeData.count} assignments)\n`;
      } else {
        context += `- **${subject}**: No grades yet (${gradeData.materials.length} materials assigned)\n`;
      }
    }
    if (gradeAnalysis.overall.average !== null) {
      context += `- **Overall Average**: ${gradeAnalysis.overall.average}% across all subjects\n`;
    }
    return context + "\n";
  }

  formatAssignmentsByUrgency(currentMaterials, today) {
    const materialsByUrgency = this.groupMaterialsByUrgency(currentMaterials, today);
    let context = '';

    // Due today
    if (materialsByUrgency.today.length > 0) {
      context += `⚠️ **DUE TODAY** - Complete these today!\n`;
      materialsByUrgency.today.forEach((material, index) => {
        const subjectName = this.getSubjectName(material);
        context += `${index + 1}. **${material.title}** (${subjectName}) - DUE TODAY ⚠️\n`;
      });
      context += "\n";
    }

    // Due tomorrow
    if (materialsByUrgency.tomorrow.length > 0) {
      context += `⏰ **DUE TOMORROW** - Start working on these!\n`;
      materialsByUrgency.tomorrow.forEach((material, index) => {
        const subjectName = this.getSubjectName(material);
        context += `${index + 1}. **${material.title}** (${subjectName}) - DUE TOMORROW ⏰\n`;
      });
      context += "\n";
    }

    // Upcoming
    if (materialsByUrgency.upcoming.length > 0) {
      context += `📋 **UPCOMING ASSIGNMENTS**:\n`;
      materialsByUrgency.upcoming.slice(0, 5).forEach((material, index) => {
        const subjectName = this.getSubjectName(material);
        const status = getDueDateStatus(material.due_date, today);
        context += `${index + 1}. **${material.title}** (${subjectName}) - ${status.text}\n`;
      });
      if (materialsByUrgency.upcoming.length > 5) {
        context += `   ... and ${materialsByUrgency.upcoming.length - 5} more upcoming assignments\n`;
      }
      context += "\n";
    }

    return context;
  }

  formatRecentWorkSection(recentWork) {
    let context = "✅ **Recent Completed Work**:\n";
    recentWork.slice(0, 5).forEach((material, index) => {
      const subjectName = this.getSubjectName(material);
      let gradeInfo = '';
      if (material.grade_value && material.grade_max_value) {
        const percentage = Math.round((parseFloat(material.grade_value) / parseFloat(material.grade_max_value)) * 100);
        gradeInfo = `: ${material.grade_value}/${material.grade_max_value} = ${percentage}%`;
      }
      context += `${index + 1}. **${material.title}** (${subjectName})${gradeInfo}\n`;
    });
    return context + "\n";
  }

  formatReviewMaterialsSection(materialsForReview) {
    let context = "📝 **Materials Needing Review** (below 70%):\n";
    materialsForReview.slice(0, 3).forEach((material, index) => {
      const subjectName = this.getSubjectName(material);
      context += `${index + 1}. **${material.title}** (${subjectName}): ${material.percentage}% - ${material.reason}\n`;
    });
    return context + "\n";
  }

  formatFocusAndSummary(mcpContext, today) {
    let context = '';

    // Current focus
    if (mcpContext.currentFocus) {
      context += `🎯 **Immediate Priority**: "${mcpContext.currentFocus.title}" (${mcpContext.currentFocus.content_type || 'lesson'})`;
      if (mcpContext.currentFocus.due_date) {
        const status = getDueDateStatus(mcpContext.currentFocus.due_date, today);
        context += ` - **${status.text}**`;
        if (status.urgent) context += ` ${status.status === 'overdue' ? '🚨' : '⚠️'}`;
      }
      context += "\n\n";
    }

    // Status summary
    const totalOverdue = mcpContext.overdue?.length || 0;
    const totalCurrent = mcpContext.currentMaterials?.length || 0;
    const totalRecent = mcpContext.recentWork?.length || 0;

    context += "🔔 **Status Summary**:\n";
    if (totalOverdue > 0) {
      context += `- 🚨 ${totalOverdue} OVERDUE assignment${totalOverdue !== 1 ? 's' : ''} (needs immediate attention)\n`;
    }
    context += `- 📚 ${totalCurrent} active assignments\n`;
    context += `- ✅ ${totalRecent} recently completed\n`;

    if (totalOverdue === 0) {
      context += "- ✅ No overdue assignments - you're caught up! 🎉\n";
    }

    return context;
  }

  // === CONVERSATION ENHANCEMENT ===

  enhanceConversationContext(message, mcpContext) {
    const conversationType = this.detectConversationType(message);
    const specificLesson = this.findMentionedLesson(mcpContext.lessons, message);
    
    return {
      specificLesson,
      conversationType: conversationType.type,
      responseGuidance: conversationType.guidance,
      priorityContext: this.getPriorityContext(mcpContext),
      suggestedLessons: specificLesson ? [] : this.generateLessonSuggestions(mcpContext, message)
    };
  }

  findMentionedLesson(lessons, message) {
    if (!lessons) return null;
    const messageLower = message.toLowerCase();
    return lessons.find(lesson => 
      messageLower.includes(lesson.title.toLowerCase()) ||
      lesson.keywords?.some(keyword => messageLower.includes(keyword.toLowerCase()))
    );
  }

  getPriorityContext(mcpContext) {
    if (mcpContext.overdue?.length > 0) {
      return `URGENT: Student has ${mcpContext.overdue.length} overdue assignment(s). Consider redirecting to these first.`;
    }
    if (mcpContext.currentFocus) {
      return `FOCUS: Current priority is "${mcpContext.currentFocus.title}"`;
    }
    return '';
  }

  generateLessonSuggestions(mcpContext, message) {
    // Simple relevance-based suggestions
    if (!mcpContext.lessons) return [];
    
    const messageLower = message.toLowerCase();
    return mcpContext.lessons
      .filter(lesson => 
        lesson.keywords?.some(keyword => messageLower.includes(keyword.toLowerCase())) ||
        lesson.subject?.toLowerCase().includes(messageLower)
      )
      .slice(0, 3);
  }

  // === STUDENT INTELLIGENCE ANALYSIS ===

  async analyzeStudentProfile(childId) {
    try {
      // Get recent performance data
      const { data: childData } = await supabase
        .from('children')
        .select('lifetime_correct, current_streak, created_at')
        .eq('id', childId)
        .single();

      // Analyze based on available data
      return {
        confidence_level: this.assessConfidenceLevel(childData),
        engagement_level: this.assessEngagementLevel(childData),
        recent_success_rate: this.calculateSuccessRate(childData),
        days_using_app: this.calculateDaysUsing(childData?.created_at)
      };
    } catch (error) {
      return this.getDefaultProfile();
    }
  }

  assessConfidenceLevel(childData) {
    if (!childData) return 'medium';
    const streak = childData.current_streak || 0;
    if (streak > 10) return 'high';
    if (streak < 3) return 'low';
    return 'medium';
  }

  assessEngagementLevel(childData) {
    if (!childData) return 'medium';
    const totalCorrect = childData.lifetime_correct || 0;
    if (totalCorrect > 100) return 'high';
    if (totalCorrect < 20) return 'low';
    return 'medium';
  }

  calculateSuccessRate(childData) {
    return childData?.lifetime_correct > 0 ? Math.min(childData.lifetime_correct / 100, 1) : 0.7;
  }

  calculateDaysUsing(createdAt) {
    if (!createdAt) return 0;
    const created = new Date(createdAt);
    const now = new Date();
    return Math.floor((now - created) / (1000 * 60 * 60 * 24));
  }

  getDefaultProfile() {
    return {
      confidence_level: 'medium',
      engagement_level: 'medium',
      recent_success_rate: 0.7,
      days_using_app: 0
    };
  }

  // === HELPER METHODS ===

  getSubjectName(material) {
    return material.subject || 
           material.lesson?.unit?.child_subject?.custom_subject_name_override ||
           material.lesson?.unit?.child_subject?.subject?.name || 
           'General';
  }

  groupMaterialsByUrgency(materials, today) {
    const groups = { today: [], tomorrow: [], soon: [], upcoming: [], noDate: [] };
    
    materials.forEach(material => {
      if (!material.due_date) {
        groups.noDate.push(material);
      } else {
        const status = getDueDateStatus(material.due_date, today);
        switch (status.status) {
          case 'today': groups.today.push(material); break;
          case 'tomorrow': groups.tomorrow.push(material); break;
          case 'soon': groups.soon.push(material); break;
          default: groups.upcoming.push(material);
        }
      }
    });

    return groups;
  }
}

// Export singleton instance
module.exports = new ContextService();