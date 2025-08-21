const supabase = require('../utils/supabaseClient');
const sessionMemoryService = require('./sessionMemoryService');
const OpenAI = require('openai');
const logger = require('../utils/logger')('parentSummaryService');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class ParentSummaryService {
  constructor() {
    this.config = {
      SUMMARY_RETENTION_DAYS: 30,
      MIN_MESSAGES_FOR_SUMMARY: 5,
      MAX_SUMMARY_LENGTH: 500,
      INAPPROPRIATE_KEYWORDS: [
        'inappropriate', 'violent', 'sexual', 'drugs', 'alcohol', 'weapons',
        'hate', 'bullying', 'scary', 'dangerous', 'adult content'
      ]
    };
    
    // Start periodic summary generation
    this.startSummaryTimer();
  }

  /**
   * Generate daily summaries for all active sessions
   */
  async generateDailySummaries() {
    try {
      logger.info('Starting daily summary generation');
      
      const sessionsForSummary = await sessionMemoryService.getSessionsReadyForSummary();
      let summariesGenerated = 0;
      
      for (const session of sessionsForSummary) {
        try {
          const summary = await this.generateSessionSummary(session);
          if (summary) {
            await this.storeSummary(summary);
            await sessionMemoryService.cleanupSession(session.sessionId);
            summariesGenerated++;
          }
        } catch (error) {
          logger.error(`Error generating summary for session ${session.sessionId}:`, error);
        }
      }
      
      logger.info(`Generated ${summariesGenerated} daily summaries`);
      
      // Cleanup old summaries
      await this.cleanupOldSummaries();
      
      return {
        success: true,
        summariesGenerated,
        totalSessionsProcessed: sessionsForSummary.length
      };
      
    } catch (error) {
      logger.error('Error generating daily summaries:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate a summary for a single session
   */
  async generateSessionSummary(sessionData) {
    try {
      if (sessionData.messages.length < this.config.MIN_MESSAGES_FOR_SUMMARY) {
        logger.debug(`Session ${sessionData.sessionId} too short for summary (${sessionData.messages.length} messages)`);
        return null;
      }

      // Extract topics and analyze messages
      const analysis = this.analyzeMessages(sessionData.messages);
      
      // Generate AI summary
      const aiSummary = await this.createAISummary(sessionData.messages, analysis);
      
      const summary = {
        child_id: sessionData.child_id,
        session_id: sessionData.sessionId,
        summary_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        session_start: sessionData.created_at,
        session_end: sessionData.last_activity,
        total_messages: sessionData.messages.length,
        topics_discussed: analysis.topics,
        subjects_covered: analysis.subjects,
        ai_summary: aiSummary,
        inappropriate_flags: analysis.inappropriateFlags,
        engagement_level: analysis.engagementLevel,
        duration_minutes: this.calculateSessionDuration(sessionData.created_at, sessionData.last_activity)
      };

      logger.debug(`Generated summary for session ${sessionData.sessionId}: ${analysis.topics.join(', ')}`);
      return summary;
      
    } catch (error) {
      logger.error(`Error generating session summary for ${sessionData.sessionId}:`, error);
      return null;
    }
  }

  /**
   * Analyze messages for topics, subjects, and inappropriate content
   */
  analyzeMessages(messages) {
    const analysis = {
      topics: [],
      subjects: [],
      inappropriateFlags: 0,
      engagementLevel: 'medium',
      totalUserMessages: 0,
      totalAIMessages: 0
    };

    // Common educational topics and subjects
    const topicKeywords = {
      'Math': ['math', 'numbers', 'addition', 'subtraction', 'multiplication', 'division', 'fractions', 'algebra', 'geometry'],
      'Science': ['science', 'experiment', 'biology', 'chemistry', 'physics', 'nature', 'animals', 'plants'],
      'Reading': ['reading', 'book', 'story', 'character', 'plot', 'author', 'literature'],
      'Writing': ['writing', 'essay', 'paragraph', 'sentence', 'grammar', 'spelling', 'composition'],
      'History': ['history', 'historical', 'past', 'ancient', 'war', 'civilization', 'culture'],
      'Geography': ['geography', 'country', 'continent', 'map', 'location', 'climate']
    };

    const topicCounts = {};
    
    messages.forEach(message => {
      const content = message.content.toLowerCase();
      
      // Count message types
      if (message.role === 'user') {
        analysis.totalUserMessages++;
      } else {
        analysis.totalAIMessages++;
      }
      
      // Check for inappropriate content
      if (this.containsInappropriateContent(content)) {
        analysis.inappropriateFlags++;
      }
      
      // Identify topics and subjects
      Object.entries(topicKeywords).forEach(([subject, keywords]) => {
        keywords.forEach(keyword => {
          if (content.includes(keyword)) {
            topicCounts[subject] = (topicCounts[subject] || 0) + 1;
          }
        });
      });
    });

    // Extract top topics and subjects
    const sortedTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
      
    analysis.topics = sortedTopics.map(([topic, count]) => topic);
    analysis.subjects = [...new Set(analysis.topics)]; // Unique subjects
    
    // Calculate engagement level
    const avgMessageLength = messages.reduce((sum, msg) => sum + msg.content.length, 0) / messages.length;
    if (avgMessageLength > 100 && analysis.totalUserMessages > 3) {
      analysis.engagementLevel = 'high';
    } else if (avgMessageLength < 30 || analysis.totalUserMessages < 2) {
      analysis.engagementLevel = 'low';
    }

    return analysis;
  }

  /**
   * Check if message contains inappropriate content
   */
  containsInappropriateContent(content) {
    return this.config.INAPPROPRIATE_KEYWORDS.some(keyword => 
      content.toLowerCase().includes(keyword)
    );
  }

  /**
   * Create AI-generated summary of the session
   */
  async createAISummary(messages, analysis) {
    try {
      // Prepare conversation text for summarization
      const conversationText = messages
        .map(msg => `${msg.role === 'user' ? 'Student' : 'Klio'}: ${msg.content}`)
        .join('\n');

      const prompt = `Summarize this tutoring session for a parent in 2-3 sentences. Focus on:
- What topics the child worked on
- How engaged they were
- Any progress or challenges noted
- Keep it positive and constructive

Topics identified: ${analysis.topics.join(', ') || 'General conversation'}
Engagement: ${analysis.engagementLevel}

Conversation:
${conversationText.substring(0, 2000)}...

Parent summary:`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Use cost-effective model for summaries
        messages: [
          {
            role: 'system',
            content: 'You create brief, positive summaries of tutoring sessions for parents. Focus on learning progress and topics covered. Keep it under 200 words.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      });

      return response.choices[0].message.content.trim();
      
    } catch (error) {
      logger.error('Error creating AI summary:', error);
      // Fallback to basic summary
      return `Session covered ${analysis.topics.join(', ') || 'general topics'} with ${analysis.engagementLevel} engagement. Student participated with ${analysis.totalUserMessages} messages over the session.`;
    }
  }

  /**
   * Calculate session duration in minutes
   */
  calculateSessionDuration(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return Math.round((end - start) / (1000 * 60)); // minutes
  }

  /**
   * Store summary in database
   */
  async storeSummary(summary) {
    try {
      const { data, error } = await supabase
        .from('parent_summaries')
        .insert([{
          child_id: summary.child_id,
          summary_date: summary.summary_date,
          session_start: summary.session_start,
          session_end: summary.session_end,
          total_messages: summary.total_messages,
          topics_discussed: summary.topics_discussed,
          subjects_covered: summary.subjects_covered,
          ai_summary: summary.ai_summary,
          inappropriate_flags: summary.inappropriate_flags,
          engagement_level: summary.engagement_level,
          duration_minutes: summary.duration_minutes,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        logger.error('Error storing summary:', error);
        return false;
      }

      logger.debug(`Stored summary for child ${summary.child_id} on ${summary.summary_date}`);
      return data;
      
    } catch (error) {
      logger.error('Error in storeSummary:', error);
      return false;
    }
  }

  /**
   * Get summaries for a child (for parent dashboard)
   */
  async getSummariesForChild(childId, limit = 30) {
    try {
      const { data, error } = await supabase
        .from('parent_summaries')
        .select('*')
        .eq('child_id', childId)
        .order('summary_date', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Error getting summaries for child:', error);
        return [];
      }

      return data || [];
      
    } catch (error) {
      logger.error('Error in getSummariesForChild:', error);
      return [];
    }
  }

  /**
   * Get summary statistics for a child
   */
  async getSummaryStats(childId, days = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { data, error } = await supabase
        .from('parent_summaries')
        .select('*')
        .eq('child_id', childId)
        .gte('summary_date', cutoffDate.toISOString().split('T')[0]);

      if (error) {
        logger.error('Error getting summary stats:', error);
        return null;
      }

      const summaries = data || [];
      
      const stats = {
        total_sessions: summaries.length,
        total_messages: summaries.reduce((sum, s) => sum + s.total_messages, 0),
        total_minutes: summaries.reduce((sum, s) => sum + s.duration_minutes, 0),
        inappropriate_flags: summaries.reduce((sum, s) => sum + s.inappropriate_flags, 0),
        subjects_covered: [...new Set(summaries.flatMap(s => s.subjects_covered))],
        average_engagement: this.calculateAverageEngagement(summaries),
        days_covered: days
      };

      return stats;
      
    } catch (error) {
      logger.error('Error in getSummaryStats:', error);
      return null;
    }
  }

  /**
   * Calculate average engagement level
   */
  calculateAverageEngagement(summaries) {
    if (summaries.length === 0) return 'none';
    
    const engagementScores = summaries.map(s => {
      switch (s.engagement_level) {
        case 'high': return 3;
        case 'medium': return 2;
        case 'low': return 1;
        default: return 2;
      }
    });
    
    const average = engagementScores.reduce((sum, score) => sum + score, 0) / engagementScores.length;
    
    if (average >= 2.5) return 'high';
    if (average >= 1.5) return 'medium';
    return 'low';
  }

  /**
   * Clean up old summaries
   */
  async cleanupOldSummaries() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.SUMMARY_RETENTION_DAYS);

      const { data, error } = await supabase
        .from('parent_summaries')
        .delete()
        .lt('summary_date', cutoffDate.toISOString().split('T')[0])
        .select('id');

      if (error) {
        logger.error('Error cleaning up old summaries:', error);
        return 0;
      }

      const deletedCount = data?.length || 0;
      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} old summaries`);
      }

      return deletedCount;
      
    } catch (error) {
      logger.error('Error in cleanupOldSummaries:', error);
      return 0;
    }
  }

  /**
   * Start timer for periodic summary generation
   */
  startSummaryTimer() {
    // Run daily at 11 PM
    const scheduleNextRun = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 0, 0, 0); // 11 PM

      const msUntilRun = tomorrow.getTime() - now.getTime();
      
      setTimeout(() => {
        this.generateDailySummaries().then(() => {
          scheduleNextRun(); // Schedule next run
        });
      }, msUntilRun);
      
      logger.info(`Next summary generation scheduled for ${tomorrow.toISOString()}`);
    };

    scheduleNextRun();
  }

  /**
   * Force generate summaries now (for testing/manual triggers)
   */
  async forceGenerateSummaries() {
    logger.info('Force generating summaries...');
    return await this.generateDailySummaries();
  }

  /**
   * Get summary service health status
   */
  getHealthStatus() {
    return {
      service: 'parentSummaryService',
      status: 'operational',
      config: {
        retentionDays: this.config.SUMMARY_RETENTION_DAYS,
        minMessages: this.config.MIN_MESSAGES_FOR_SUMMARY
      },
      lastRun: null // Could store this if needed
    };
  }
}

module.exports = new ParentSummaryService();