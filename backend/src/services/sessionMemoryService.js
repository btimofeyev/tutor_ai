const logger = require('../utils/logger')('sessionMemoryService');

class SessionMemoryService {
  constructor() {
    // In-memory cache for active sessions
    this.sessions = new Map();
    
    // Configuration
    this.config = {
      MAX_MESSAGES_PER_SESSION: 20,
      SESSION_EXPIRY_HOURS: 24,
      CLEANUP_INTERVAL_MINUTES: 60
    };
    
    // Start periodic cleanup
    this.startCleanupTimer();
  }

  /**
   * Generate a new session ID for a child
   */
  generateSessionId(childId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `session_${childId}_${timestamp}_${random}`;
  }

  /**
   * Get or create an active session for a child
   */
  async getSession(childId) {
    try {
      // Look for existing active session
      for (const [sessionId, session] of this.sessions.entries()) {
        if (session.child_id === childId && !this.isExpired(session)) {
          return {
            sessionId,
            ...session,
            isActive: session.messages.length > 0
          };
        }
      }
      
      // No active session found - return null to indicate no session exists
      // Don't auto-create sessions here - let forceNewSession handle creation
      logger.info(`No active session found for child ${childId}`);
      return null;
      
    } catch (error) {
      logger.error('Error getting session:', error);
      return null;
    }
  }

  /**
   * Add a message to an active session
   */
  async addMessage(sessionId, role, content, metadata = {}) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        logger.warn(`Attempted to add message to non-existent session: ${sessionId}`);
        return false;
      }

      if (this.isExpired(session)) {
        logger.warn(`Attempted to add message to expired session: ${sessionId}`);
        this.sessions.delete(sessionId);
        return false;
      }

      const message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        role: role, // 'user' or 'assistant'
        content: content,
        timestamp: new Date().toISOString(),
        metadata: metadata
      };

      // Add message and maintain limit
      session.messages.push(message);
      
      // Keep only the most recent messages
      if (session.messages.length > this.config.MAX_MESSAGES_PER_SESSION) {
        session.messages = session.messages.slice(-this.config.MAX_MESSAGES_PER_SESSION);
      }
      
      // Update session activity
      session.last_activity = new Date();
      
      logger.debug(`Added ${role} message to session ${sessionId}. Total messages: ${session.messages.length}`);
      return true;
      
    } catch (error) {
      logger.error('Error adding message to session:', error);
      return false;
    }
  }

  /**
   * Get recent conversation context for AI
   */
  async getConversationContext(childId, maxMessages = 10) {
    try {
      const sessionData = await this.getSession(childId);
      if (!sessionData || !sessionData.messages) {
        return {
          messages: [],
          hasHistory: false,
          sessionId: sessionData?.sessionId || null
        };
      }

      // Get recent messages for context
      const recentMessages = sessionData.messages.slice(-maxMessages);
      
      // Format for AI context
      const formattedMessages = recentMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
        timestamp: msg.timestamp
      }));

      return {
        messages: formattedMessages,
        hasHistory: sessionData.isActive && recentMessages.length > 0,
        sessionId: sessionData.sessionId,
        lastActivity: sessionData.last_activity,
        messageCount: sessionData.messages.length
      };
      
    } catch (error) {
      logger.error('Error getting conversation context:', error);
      return {
        messages: [],
        hasHistory: false,
        sessionId: null
      };
    }
  }

  /**
   * Get session messages for summary generation
   */
  async getSessionForSummary(sessionId) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return null;
      }

      return {
        child_id: session.child_id,
        messages: session.messages,
        created_at: session.created_at,
        last_activity: session.last_activity,
        total_messages: session.messages.length
      };
      
    } catch (error) {
      logger.error('Error getting session for summary:', error);
      return null;
    }
  }

  /**
   * Get formatted session messages for frontend display
   */
  async getSessionMessages(childId) {
    try {
      const sessionData = await this.getSession(childId);
      if (!sessionData || !sessionData.messages || sessionData.messages.length === 0) {
        return {
          messages: [],
          hasHistory: false,
          sessionId: null,
          lastResponseId: null
        };
      }

      // Format messages for frontend display
      const formattedMessages = sessionData.messages.map(msg => ({
        id: msg.id || Date.now(),
        type: msg.role === 'assistant' ? 'tutor' : 'user',
        content: msg.content,
        timestamp: msg.timestamp,
        responseId: msg.metadata?.responseId || null
      }));

      // Get the last response ID for chain-of-thought continuity
      const lastTutorMessage = sessionData.messages
        .filter(msg => msg.role === 'assistant')
        .pop();
      
      const lastResponseId = lastTutorMessage?.metadata?.responseId || null;

      return {
        messages: formattedMessages,
        hasHistory: sessionData.isActive && formattedMessages.length > 0,
        sessionId: sessionData.sessionId,
        lastResponseId: lastResponseId,
        lastActivity: sessionData.last_activity,
        messageCount: formattedMessages.length
      };
      
    } catch (error) {
      logger.error('Error getting session messages for frontend:', error);
      return {
        messages: [],
        hasHistory: false,
        sessionId: null,
        lastResponseId: null
      };
    }
  }

  /**
   * Mark session for summary and cleanup
   */
  async markSessionForSummary(sessionId) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return false;
      }

      // Mark as ready for summary
      session.ready_for_summary = true;
      session.summary_marked_at = new Date();
      
      logger.info(`Session ${sessionId} marked for summary generation`);
      return true;
      
    } catch (error) {
      logger.error('Error marking session for summary:', error);
      return false;
    }
  }

  /**
   * Clean up session after summary is generated
   */
  async cleanupSession(sessionId) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return false;
      }

      this.sessions.delete(sessionId);
      logger.info(`Cleaned up session ${sessionId}`);
      return true;
      
    } catch (error) {
      logger.error('Error cleaning up session:', error);
      return false;
    }
  }

  /**
   * Get sessions ready for summary generation
   */
  async getSessionsReadyForSummary() {
    try {
      const readySessions = [];
      const cutoffTime = new Date(Date.now() - 4 * 60 * 60 * 1000); // 4 hours old
      
      for (const [sessionId, session] of this.sessions.entries()) {
        const shouldSummarize = 
          session.messages.length >= 5 && // Minimum messages for summary
          (session.ready_for_summary || 
           session.last_activity < cutoffTime || 
           this.isExpired(session));
           
        if (shouldSummarize) {
          readySessions.push({
            sessionId,
            ...session
          });
        }
      }
      
      return readySessions;
      
    } catch (error) {
      logger.error('Error getting sessions ready for summary:', error);
      return [];
    }
  }

  /**
   * Check if session is expired
   */
  isExpired(session) {
    return new Date() > session.expires_at;
  }

  /**
   * Start periodic cleanup of expired sessions
   */
  startCleanupTimer() {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.config.CLEANUP_INTERVAL_MINUTES * 60 * 1000);
    
    logger.info('Started session cleanup timer');
  }

  /**
   * Remove expired sessions from memory
   */
  cleanupExpiredSessions() {
    try {
      let cleanedCount = 0;
      const now = new Date();
      
      for (const [sessionId, session] of this.sessions.entries()) {
        if (this.isExpired(session)) {
          this.sessions.delete(sessionId);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} expired sessions`);
      }
      
      // Log current session count
      logger.debug(`Active sessions: ${this.sessions.size}`);
      
    } catch (error) {
      logger.error('Error during session cleanup:', error);
    }
  }

  /**
   * Get session statistics
   */
  getStats() {
    try {
      const stats = {
        total_active_sessions: this.sessions.size,
        sessions_by_age: {
          under_1_hour: 0,
          under_6_hours: 0,
          under_24_hours: 0,
          expired: 0
        },
        total_messages: 0
      };
      
      const now = new Date();
      
      for (const session of this.sessions.values()) {
        const ageHours = (now - session.last_activity) / (1000 * 60 * 60);
        
        if (this.isExpired(session)) {
          stats.sessions_by_age.expired++;
        } else if (ageHours < 1) {
          stats.sessions_by_age.under_1_hour++;
        } else if (ageHours < 6) {
          stats.sessions_by_age.under_6_hours++;
        } else {
          stats.sessions_by_age.under_24_hours++;
        }
        
        stats.total_messages += session.messages.length;
      }
      
      return stats;
      
    } catch (error) {
      logger.error('Error getting session stats:', error);
      return null;
    }
  }

  /**
   * End a specific session for a child (for New Chat, logout, etc.)
   */
  async endSession(childId, reason = 'manual') {
    try {
      let endedSessionId = null;
      
      // Find and remove the child's active session
      for (const [sessionId, session] of this.sessions.entries()) {
        if (session.child_id === childId) {
          endedSessionId = sessionId;
          
          // Mark for summary if it has enough messages
          if (session.messages.length >= 5) {
            session.ready_for_summary = true;
            session.summary_marked_at = new Date();
            session.end_reason = reason;
            logger.info(`Session ${sessionId} marked for summary before ending (reason: ${reason})`);
          } else {
            // Remove immediately if too few messages
            this.sessions.delete(sessionId);
            logger.info(`Session ${sessionId} ended and removed (reason: ${reason}, messages: ${session.messages.length})`);
          }
          break;
        }
      }
      
      return {
        success: true,
        endedSessionId,
        reason
      };
      
    } catch (error) {
      logger.error('Error ending session:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Force start a new session for a child (for login, new chat)
   */
  async forceNewSession(childId, reason = 'new_session') {
    try {
      // First end any existing session
      await this.endSession(childId, reason);
      
      // Create new session
      const sessionId = this.generateSessionId(childId);
      const newSession = {
        child_id: childId,
        messages: [],
        curriculumContext: {
          assignments: new Map(),
          performanceData: null,
          subjectContexts: new Map(),
          lastUpdated: null,
          activeTopics: []
        },
        performance: {
          correctAnswers: 0,
          incorrectAnswers: 0,
          masteredConcepts: [],
          currentDifficultyLevel: 2, // 1=struggling, 2=building, 3=proficient, 4=advanced
          lastCorrectStreak: 0,
          conversationTopics: []
        },
        created_at: new Date(),
        last_activity: new Date(),
        expires_at: new Date(Date.now() + this.config.SESSION_EXPIRY_HOURS * 60 * 60 * 1000),
        start_reason: reason
      };
      
      this.sessions.set(sessionId, newSession);
      
      logger.info(`Force created new session ${sessionId} for child ${childId} (reason: ${reason})`);
      return {
        success: true,
        sessionId,
        reason
      };
      
    } catch (error) {
      logger.error('Error forcing new session:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Store curriculum context in session
   */
  async storeCurriculumContext(sessionId, type, key, data) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        logger.warn(`Attempted to store curriculum context in non-existent session: ${sessionId}`);
        return false;
      }

      if (this.isExpired(session)) {
        logger.warn(`Attempted to store curriculum context in expired session: ${sessionId}`);
        this.sessions.delete(sessionId);
        return false;
      }

      // Store curriculum data based on type
      switch (type) {
        case 'assignment':
          session.curriculumContext.assignments.set(key, data);
          break;
        case 'performance':
          session.curriculumContext.performanceData = data;
          break;
        case 'subject':
          session.curriculumContext.subjectContexts.set(key, data);
          break;
        case 'topic':
          if (!session.curriculumContext.activeTopics.includes(key)) {
            session.curriculumContext.activeTopics.push(key);
          }
          break;
      }

      session.curriculumContext.lastUpdated = new Date();
      
      logger.debug(`Stored ${type} curriculum context in session ${sessionId}: ${key}`);
      return true;
      
    } catch (error) {
      logger.error('Error storing curriculum context:', error);
      return false;
    }
  }

  /**
   * Get all curriculum context from session
   */
  async getCurriculumContext(sessionId) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session || this.isExpired(session)) {
        return null;
      }

      return session.curriculumContext;
      
    } catch (error) {
      logger.error('Error getting curriculum context:', error);
      return null;
    }
  }

  /**
   * Format curriculum context for AI prompt injection
   */
  formatCurriculumContextForAI(curriculumContext) {
    if (!curriculumContext) return '';

    let contextText = '\n\n[STUDENT\'S CURRENT COURSEWORK CONTEXT:';
    
    // Check if we have structured comprehensive context (new format)
    if (curriculumContext.performanceData && 
        curriculumContext.performanceData.includes('STUDENT\'S CURRENT COURSEWORK CONTEXT')) {
      // New structured format - use as-is
      contextText = '\n\n' + curriculumContext.performanceData;
    } else {
      // Legacy format - build from components
      
      // Add performance data
      if (curriculumContext.performanceData) {
        contextText += '\n\nPERFORMACE REVIEW:\n' + curriculumContext.performanceData;
      }

      // Add assignment details
      if (curriculumContext.assignments && curriculumContext.assignments.size > 0) {
        contextText += '\n\nASSIGNMENT DETAILS:';
        for (const [title, content] of curriculumContext.assignments) {
          contextText += `\n\n**${title}**:\n${content}`;
        }
      }

      // Add subject contexts
      if (curriculumContext.subjectContexts && curriculumContext.subjectContexts.size > 0) {
        contextText += '\n\nSUBJECT CONTEXTS:';
        for (const [subject, content] of curriculumContext.subjectContexts) {
          contextText += `\n\n**${subject}**:\n${content}`;
        }
      }

      // Add active topics
      if (curriculumContext.activeTopics && curriculumContext.activeTopics.length > 0) {
        contextText += '\n\nACTIVE TOPICS: ' + curriculumContext.activeTopics.join(', ');
      }

      contextText += '\n]';
    }
    
    return contextText + '\n\n';
  }

  /**
   * Track student performance for adaptive difficulty
   */
  async trackPerformance(sessionId, isCorrect, concept = null) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session || this.isExpired(session)) {
        return false;
      }

      if (isCorrect) {
        session.performance.correctAnswers++;
        session.performance.lastCorrectStreak++;
        if (concept && !session.performance.masteredConcepts.includes(concept)) {
          session.performance.masteredConcepts.push(concept);
        }
        
        // Increase difficulty after 2 correct in a row
        if (session.performance.lastCorrectStreak >= 2 && session.performance.currentDifficultyLevel < 4) {
          session.performance.currentDifficultyLevel++;
          logger.info(`Increased difficulty level to ${session.performance.currentDifficultyLevel} for session ${sessionId}`);
        }
      } else {
        session.performance.incorrectAnswers++;
        session.performance.lastCorrectStreak = 0;
        
        // Decrease difficulty after struggles
        if (session.performance.currentDifficultyLevel > 1) {
          session.performance.currentDifficultyLevel--;
          logger.info(`Decreased difficulty level to ${session.performance.currentDifficultyLevel} for session ${sessionId}`);
        }
      }

      return true;
    } catch (error) {
      logger.error('Error tracking performance:', error);
      return false;
    }
  }

  /**
   * Get session performance data
   */
  getSessionPerformance(sessionId) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session || this.isExpired(session)) {
        return null;
      }
      return session.performance;
    } catch (error) {
      logger.error('Error getting session performance:', error);
      return null;
    }
  }

  /**
   * Add topic to conversation tracking
   */
  async addConversationTopic(sessionId, topic) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session || this.isExpired(session)) {
        return false;
      }

      if (!session.performance.conversationTopics.includes(topic)) {
        session.performance.conversationTopics.push(topic);
      }
      return true;
    } catch (error) {
      logger.error('Error adding conversation topic:', error);
      return false;
    }
  }

  /**
   * Advanced difficulty adjustment based on performance patterns
   */
  adjustDifficultyIntelligently(sessionId) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session || this.isExpired(session)) {
        return false;
      }

      const perf = session.performance;
      const totalAnswers = perf.correctAnswers + perf.incorrectAnswers;
      
      // Not enough data to adjust
      if (totalAnswers < 3) {
        return false;
      }

      const accuracyRate = perf.correctAnswers / totalAnswers;
      
      // Intelligent difficulty adjustment based on accuracy patterns
      if (accuracyRate >= 0.8 && perf.lastCorrectStreak >= 3) {
        // Student is excelling, increase difficulty
        if (perf.currentDifficultyLevel < 4) {
          perf.currentDifficultyLevel++;
          logger.info(`🚀 Student excelling! Increased difficulty to level ${perf.currentDifficultyLevel}`);
          return 'increased';
        }
      } else if (accuracyRate <= 0.4 && perf.incorrectAnswers >= 3) {
        // Student struggling, decrease difficulty
        if (perf.currentDifficultyLevel > 1) {
          perf.currentDifficultyLevel--;
          logger.info(`📉 Student struggling, decreased difficulty to level ${perf.currentDifficultyLevel}`);
          return 'decreased';
        }
      }
      
      return 'stable';
    } catch (error) {
      logger.error('Error adjusting difficulty:', error);
      return false;
    }
  }

  /**
   * Get learning insights for the session
   */
  getSessionInsights(sessionId) {
    try {
      const session = this.sessions.get(sessionId);
      if (!session || this.isExpired(session)) {
        return null;
      }

      const perf = session.performance;
      const totalAnswers = perf.correctAnswers + perf.incorrectAnswers;
      
      if (totalAnswers === 0) {
        return {
          status: 'starting',
          message: 'Beginning learning session',
          accuracy: 0,
          difficultyLevel: perf.currentDifficultyLevel
        };
      }

      const accuracyRate = perf.correctAnswers / totalAnswers;
      
      let status = 'working';
      let message = `Working through problems with ${Math.round(accuracyRate * 100)}% accuracy`;
      
      if (accuracyRate >= 0.8) {
        status = 'excelling';
        message = `Excelling! ${Math.round(accuracyRate * 100)}% accuracy with ${perf.lastCorrectStreak} correct in a row`;
      } else if (accuracyRate <= 0.4) {
        status = 'struggling';
        message = `Working through challenges - needs more support`;
      }

      return {
        status,
        message,
        accuracy: accuracyRate,
        difficultyLevel: perf.currentDifficultyLevel,
        masteredConcepts: perf.masteredConcepts.length,
        topicsDiscussed: perf.conversationTopics.length
      };
    } catch (error) {
      logger.error('Error getting session insights:', error);
      return null;
    }
  }

  /**
   * Force cleanup all sessions (for maintenance)
   */
  async clearAllSessions() {
    try {
      const count = this.sessions.size;
      this.sessions.clear();
      logger.warn(`Force cleared all ${count} sessions`);
      return count;
    } catch (error) {
      logger.error('Error clearing all sessions:', error);
      return 0;
    }
  }
}

module.exports = new SessionMemoryService();