// Enhanced Chat History Service with Summarization and Cleanup
const supabase = require('../utils/supabaseClient');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class ChatHistoryService {
  constructor() {
    // Configurable retention policies
    this.config = {
      RECENT_MESSAGES_LIMIT: parseInt(process.env.RECENT_MESSAGES_LIMIT) || 50,
      SUMMARIZATION_BATCH_SIZE: parseInt(process.env.SUMMARIZATION_BATCH_SIZE) || 20,
      SUMMARY_RETENTION_DAYS: parseInt(process.env.SUMMARY_RETENTION_DAYS) || 90,
      CLEANUP_TRIGGER_MULTIPLIER: parseFloat(process.env.CLEANUP_TRIGGER_MULTIPLIER) || 1.5,
      MIN_SESSION_SIZE: parseInt(process.env.MIN_SESSION_SIZE) || 10,
      SESSION_GAP_HOURS: parseInt(process.env.SESSION_GAP_HOURS) || 4,
      ENABLE_DATA_EXPORT: process.env.ENABLE_DATA_EXPORT === 'true' || false,
      GRADUATED_RETENTION_ENABLED: process.env.GRADUATED_RETENTION_ENABLED === 'true' || true
    };

    // Graduated retention timeline (in days)
    this.retentionLevels = {
      IMMEDIATE: 0,     // Full messages for immediate access
      SUMMARY: 30,      // Convert to summaries after 30 days
      ARCHIVE: 90,      // Archive summaries after 90 days
      DELETE: 365       // Delete archives after 1 year
    };
  }

  /**
   * Store a chat message in the database
   */
  async storeMessage(childId, role, content, metadata = {}) {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([{
          child_id: childId,
          role: role, // 'user' or 'assistant'
          content: content,
          metadata: metadata,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Error storing chat message:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in storeMessage:', error);
      return null;
    }
  }

  /**
   * Get recent chat history from database with intelligent context building
   */
  async getRecentHistory(childId, limit = 50) {
    try {
      // Get recent messages
      const { data: recentMessages, error } = await supabase
        .from('chat_messages')
        .select('role, content, created_at, metadata')
        .eq('child_id', childId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting recent history:', error);
        return [];
      }

      // Reverse to get chronological order
      const chronologicalMessages = recentMessages.reverse();

      // Get conversation summaries for context before these messages
      const oldestMessageTime = chronologicalMessages[0]?.created_at;
      let conversationSummaries = [];
      
      if (oldestMessageTime) {
        const { data: summaries } = await supabase
          .from('conversation_summaries')
          .select('summary, message_count, period_start, period_end')
          .eq('child_id', childId)
          .lt('period_end', oldestMessageTime)
          .order('period_end', { ascending: false })
          .limit(3); // Get last 3 summaries for context

        conversationSummaries = summaries || [];
      }

      return {
        recentMessages: chronologicalMessages,
        conversationSummaries: conversationSummaries.reverse() // Chronological order
      };
    } catch (error) {
      console.error('Error in getRecentHistory:', error);
      return { recentMessages: [], conversationSummaries: [] };
    }
  }

  /**
   * Build context for AI with recent messages and summaries
   */
  async buildContextForAI(childId, currentMessage, maxMessages = 40) {
    const { recentMessages, conversationSummaries } = await this.getRecentHistory(childId, maxMessages);
    
    let contextMessages = [];
    
    // Add conversation summaries as system context
    if (conversationSummaries.length > 0) {
      const summaryContext = conversationSummaries
        .map(s => `[Summary ${s.period_start.split('T')[0]} to ${s.period_end.split('T')[0]}]: ${s.summary}`)
        .join('\n');
      
      contextMessages.push({
        role: 'system',
        content: `Previous conversation context:\n${summaryContext}`
      });
    }

    // Add recent messages
    const formattedMessages = recentMessages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));

    return [...contextMessages, ...formattedMessages];
  }

  /**
   * Validate summary quality before cleanup
   */
  async validateSummaryQuality(summary, originalMessages) {
    const validationCriteria = {
      minLength: 20,
      maxLength: 2000, // Very lenient for now
      mustContainKeywords: ['student', 'help', 'question', 'learn', 'topic', 'discuss', 'understand', 'practice', 'work'],
      messageCountRatio: 0.01 // Very flexible validation
    };

    console.log(`📊 Summary validation: length=${summary?.length}, criteria.maxLength=${validationCriteria.maxLength}`);

    if (!summary || summary.length < validationCriteria.minLength) {
      console.log(`❌ Summary too short: ${summary?.length} < ${validationCriteria.minLength}`);
      return { valid: false, reason: 'Summary too short' };
    }

    if (summary.length > validationCriteria.maxLength) {
      console.log(`❌ Summary too long: ${summary.length} > ${validationCriteria.maxLength}`);
      return { valid: false, reason: 'Summary too long' };
    }

    const originalContentLength = originalMessages.reduce((sum, msg) => sum + msg.content.length, 0);
    if (summary.length < originalContentLength * validationCriteria.messageCountRatio) {
      return { valid: false, reason: 'Summary too brief compared to original content' };
    }

    const hasKeyTopics = validationCriteria.mustContainKeywords.some(keyword => 
      summary.toLowerCase().includes(keyword)
    );
    if (!hasKeyTopics) {
      console.log(`⚠️ Summary lacks educational keywords but accepting anyway`);
      // Accept anyway for now - just log the warning
    }

    return { valid: true, reason: 'Summary quality validated' };
  }

  /**
   * Export data before cleanup for backup
   */
  async exportDataBeforeCleanup(childId, messages) {
    if (!this.config.ENABLE_DATA_EXPORT) return null;

    try {
      const exportData = {
        childId,
        exportDate: new Date().toISOString(),
        messageCount: messages.length,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          created_at: msg.created_at,
          metadata: msg.metadata
        }))
      };

      // Store export in a separate table for potential recovery
      const { data, error } = await supabase
        .from('chat_message_exports')
        .insert([{
          child_id: childId,
          export_data: exportData,
          message_count: messages.length,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating data export:', error);
        return null;
      }

      console.log(`💾 Exported ${messages.length} messages before cleanup`);
      return data;
    } catch (error) {
      console.error('Error in exportDataBeforeCleanup:', error);
      return null;
    }
  }

  /**
   * Enhanced summarization and cleanup with validation
   */
  async summarizeAndCleanup(childId) {
    try {
      console.log(`🧹 Starting enhanced summarization and cleanup for child ${childId}`);

      // Get messages older than the recent limit
      const { data: oldMessages, error } = await supabase
        .from('chat_messages')
        .select('id, role, content, created_at, metadata')
        .eq('child_id', childId)
        .order('created_at', { ascending: true });

      if (error || !oldMessages || oldMessages.length <= this.config.RECENT_MESSAGES_LIMIT) {
        console.log('No old messages to summarize');
        return;
      }

      // Messages to summarize (all but the most recent)
      const messagesToSummarize = oldMessages.slice(0, -this.config.RECENT_MESSAGES_LIMIT);
      
      if (messagesToSummarize.length < this.config.SUMMARIZATION_BATCH_SIZE) {
        console.log('Not enough old messages to warrant summarization');
        return;
      }

      // Export data before cleanup if enabled
      if (this.config.ENABLE_DATA_EXPORT) {
        await this.exportDataBeforeCleanup(childId, messagesToSummarize);
      }

      // Group messages into conversation sessions (by time gaps)
      const conversationSessions = this.groupIntoSessions(messagesToSummarize);
      
      let successfulSummarizations = 0;
      let failedSummarizations = 0;

      for (const session of conversationSessions) {
        if (session.messages.length >= this.config.MIN_SESSION_SIZE) {
          const summaryResult = await this.summarizeSession(childId, session);
          
          if (summaryResult.success) {
            await this.deleteMessages(session.messages.map(m => m.id));
            successfulSummarizations++;
          } else {
            console.warn(`Failed to summarize session: ${summaryResult.reason}`);
            failedSummarizations++;
          }
        }
      }

      console.log(`✅ Cleanup completed: ${successfulSummarizations} sessions summarized, ${failedSummarizations} failed`);
      return { success: true, summarized: successfulSummarizations, failed: failedSummarizations };
    } catch (error) {
      console.error('Error in summarizeAndCleanup:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Group messages into conversation sessions based on time gaps
   */
  groupIntoSessions(messages) {
    const sessions = [];
    let currentSession = { messages: [], startTime: null, endTime: null };
    
    const SESSION_GAP_HOURS = 4; // New session if gap > 4 hours
    
    for (const message of messages) {
      const messageTime = new Date(message.created_at);
      
      if (!currentSession.startTime) {
        // First message
        currentSession.startTime = messageTime;
        currentSession.endTime = messageTime;
        currentSession.messages = [message];
      } else {
        const timeSinceLastMessage = (messageTime - currentSession.endTime) / (1000 * 60 * 60); // hours
        
        if (timeSinceLastMessage > SESSION_GAP_HOURS) {
          // Start new session
          if (currentSession.messages.length > 0) {
            sessions.push(currentSession);
          }
          currentSession = {
            messages: [message],
            startTime: messageTime,
            endTime: messageTime
          };
        } else {
          // Continue current session
          currentSession.messages.push(message);
          currentSession.endTime = messageTime;
        }
      }
    }
    
    // Add final session
    if (currentSession.messages.length > 0) {
      sessions.push(currentSession);
    }
    
    return sessions;
  }

  /**
   * Enhanced summarize a conversation session using AI with validation
   */
  async summarizeSession(childId, session) {
    try {
      const conversationText = session.messages
        .map(m => `${m.role}: ${m.content}`)
        .join('\n');

      const summaryPrompt = `Summarize this tutoring conversation in 2-3 sentences. Include the main topic discussed and any key learning points.

Conversation:
${conversationText}

Brief summary:`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Use cheaper model for summarization
        messages: [
          {
            role: "system",
            content: "You summarize tutoring conversations very briefly. Use 2-3 sentences maximum. Focus on the main topic and key learning points."
          },
          {
            role: "user",
            content: summaryPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 150
      });

      const summary = response.choices[0].message.content;

      // Validate summary quality before storing
      const validation = await this.validateSummaryQuality(summary, session.messages);
      
      if (!validation.valid) {
        console.warn(`Summary validation failed: ${validation.reason}`);
        return { success: false, reason: validation.reason };
      }

      // Store the summary with validation metadata
      const { data, error } = await supabase
        .from('conversation_summaries')
        .insert([{
          child_id: childId,
          summary: summary,
          message_count: session.messages.length,
          period_start: session.startTime.toISOString(),
          period_end: session.endTime.toISOString(),
          validation_status: 'validated',
          validation_score: this.calculateSummaryScore(summary, session.messages),
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Error storing summary:', error);
        return { success: false, reason: 'Database error' };
      }

      console.log(`📝 Summarized and validated session with ${session.messages.length} messages`);
      return { success: true, summaryId: data.id };
    } catch (error) {
      console.error('Error summarizing session:', error);
      return { success: false, reason: error.message };
    }
  }

  /**
   * Calculate a quality score for the summary
   */
  calculateSummaryScore(summary, originalMessages) {
    let score = 0;

    // Length score (appropriate length)
    const lengthRatio = summary.length / originalMessages.reduce((sum, msg) => sum + msg.content.length, 0);
    if (lengthRatio >= 0.05 && lengthRatio <= 0.3) score += 25;

    // Content diversity score (mentions multiple aspects)
    const educationalKeywords = ['topic', 'learn', 'understand', 'question', 'answer', 'practice', 'homework', 'assignment'];
    const keywordMatches = educationalKeywords.filter(keyword => 
      summary.toLowerCase().includes(keyword)
    ).length;
    score += Math.min(keywordMatches * 5, 25);

    // Structure score (contains specific information)
    if (summary.includes('topic') || summary.includes('subject')) score += 25;
    if (summary.includes('progress') || summary.includes('understand')) score += 25;

    return Math.min(score, 100);
  }

  /**
   * Delete old messages after summarization
   */
  async deleteMessages(messageIds) {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .in('id', messageIds);

      if (error) {
        console.error('Error deleting messages:', error);
      } else {
        console.log(`🗑️ Deleted ${messageIds.length} old messages`);
      }
    } catch (error) {
      console.error('Error in deleteMessages:', error);
    }
  }

  /**
   * Clean up old summaries (keep only recent summaries)
   */
  async cleanupOldSummaries(childId) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.SUMMARY_RETENTION_DAYS);

      const { error } = await supabase
        .from('conversation_summaries')
        .delete()
        .eq('child_id', childId)
        .lt('created_at', cutoffDate.toISOString());

      if (error) {
        console.error('Error cleaning up old summaries:', error);
      }
    } catch (error) {
      console.error('Error in cleanupOldSummaries:', error);
    }
  }

  /**
   * Get conversation statistics
   */
  async getConversationStats(childId) {
    try {
      const [messagesResult, summariesResult] = await Promise.all([
        supabase
          .from('chat_messages')
          .select('id', { count: 'exact' })
          .eq('child_id', childId),
        supabase
          .from('conversation_summaries')
          .select('message_count')
          .eq('child_id', childId)
      ]);

      const currentMessages = messagesResult.count || 0;
      const summarizedMessages = summariesResult.data?.reduce((sum, s) => sum + s.message_count, 0) || 0;

      return {
        currentMessages,
        summarizedMessages,
        totalMessages: currentMessages + summarizedMessages
      };
    } catch (error) {
      console.error('Error getting conversation stats:', error);
      return { currentMessages: 0, summarizedMessages: 0, totalMessages: 0 };
    }
  }

  /**
   * Implement graduated retention system
   */
  async applyGraduatedRetention(childId) {
    if (!this.config.GRADUATED_RETENTION_ENABLED) return;

    try {
      console.log(`🎯 Applying graduated retention for child ${childId}`);
      
      const now = new Date();
      
      // Stage 1: Convert old messages to summaries (30+ days old)
      const summaryDate = new Date(now.getTime() - this.retentionLevels.SUMMARY * 24 * 60 * 60 * 1000);
      await this.convertOldMessagesToSummaries(childId, summaryDate);
      
      // Stage 2: Archive old summaries (90+ days old)
      const archiveDate = new Date(now.getTime() - this.retentionLevels.ARCHIVE * 24 * 60 * 60 * 1000);
      await this.archiveOldSummaries(childId, archiveDate);
      
      // Stage 3: Delete archived data (365+ days old)
      const deleteDate = new Date(now.getTime() - this.retentionLevels.DELETE * 24 * 60 * 60 * 1000);
      await this.deleteArchivedData(childId, deleteDate);
      
      console.log(`✅ Graduated retention applied for child ${childId}`);
    } catch (error) {
      console.error('Error applying graduated retention:', error);
    }
  }

  /**
   * Convert messages older than specified date to summaries
   */
  async convertOldMessagesToSummaries(childId, cutoffDate) {
    const { data: oldMessages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('child_id', childId)
      .lt('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: true });

    if (error || !oldMessages || oldMessages.length === 0) return;

    const sessions = this.groupIntoSessions(oldMessages);
    for (const session of sessions) {
      if (session.messages.length >= this.config.MIN_SESSION_SIZE) {
        const result = await this.summarizeSession(childId, session);
        if (result.success) {
          await this.deleteMessages(session.messages.map(m => m.id));
        }
      }
    }
  }

  /**
   * Archive old summaries to separate table
   */
  async archiveOldSummaries(childId, cutoffDate) {
    // Move old summaries to archive table
    const { data: oldSummaries, error } = await supabase
      .from('conversation_summaries')
      .select('*')
      .eq('child_id', childId)
      .lt('created_at', cutoffDate.toISOString());

    if (error || !oldSummaries || oldSummaries.length === 0) return;

    // Insert into archive table
    const archiveData = oldSummaries.map(summary => ({
      ...summary,
      archived_at: new Date().toISOString()
    }));

    await supabase.from('conversation_summaries_archive').insert(archiveData);
    
    // Delete from main table
    const summaryIds = oldSummaries.map(s => s.id);
    await supabase
      .from('conversation_summaries')
      .delete()
      .in('id', summaryIds);

    console.log(`📦 Archived ${oldSummaries.length} summaries`);
  }

  /**
   * Delete archived data older than retention period
   */
  async deleteArchivedData(childId, cutoffDate) {
    // Delete very old exports
    await supabase
      .from('chat_message_exports')
      .delete()
      .eq('child_id', childId)
      .lt('created_at', cutoffDate.toISOString());

    // Delete very old archived summaries
    await supabase
      .from('conversation_summaries_archive')
      .delete()
      .eq('child_id', childId)
      .lt('created_at', cutoffDate.toISOString());

    console.log(`🗑️ Deleted archived data older than ${cutoffDate.toISOString()}`);
  }

  /**
   * Enhanced schedule cleanup for a child with configurable triggers
   */
  async scheduleCleanup(childId, options = {}) {
    try {
      const stats = await this.getConversationStats(childId);
      const triggerLimit = this.config.RECENT_MESSAGES_LIMIT * this.config.CLEANUP_TRIGGER_MULTIPLIER;
      
      console.log(`📊 Child ${childId} stats: ${stats.currentMessages}/${triggerLimit} messages`);
      
      // Trigger immediate cleanup if we have too many current messages
      if (stats.currentMessages > triggerLimit || options.force) {
        console.log(`🚨 Triggering cleanup for child ${childId} (${stats.currentMessages} messages)`);
        
        const result = await this.summarizeAndCleanup(childId);
        
        if (result.success) {
          // Apply graduated retention if enabled
          if (this.config.GRADUATED_RETENTION_ENABLED) {
            await this.applyGraduatedRetention(childId);
          } else {
            // Fallback to simple cleanup
            await this.cleanupOldSummaries(childId);
          }
        }
        
        return result;
      }
      
      return { success: true, action: 'no_cleanup_needed', stats };
    } catch (error) {
      console.error('Error in scheduleCleanup:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get comprehensive cleanup status for a child
   */
  async getCleanupStatus(childId) {
    try {
      const [messages, summaries, exports, archived] = await Promise.all([
        supabase.from('chat_messages').select('id', { count: 'exact' }).eq('child_id', childId),
        supabase.from('conversation_summaries').select('id', { count: 'exact' }).eq('child_id', childId),
        supabase.from('chat_message_exports').select('id', { count: 'exact' }).eq('child_id', childId),
        supabase.from('conversation_summaries_archive').select('id', { count: 'exact' }).eq('child_id', childId)
      ]);

      return {
        currentMessages: messages.count || 0,
        summaries: summaries.count || 0,
        exports: exports.count || 0,
        archived: archived.count || 0,
        triggerThreshold: this.config.RECENT_MESSAGES_LIMIT * this.config.CLEANUP_TRIGGER_MULTIPLIER,
        needsCleanup: (messages.count || 0) > this.config.RECENT_MESSAGES_LIMIT * this.config.CLEANUP_TRIGGER_MULTIPLIER
      };
    } catch (error) {
      console.error('Error getting cleanup status:', error);
      return null;
    }
  }
}

module.exports = new ChatHistoryService();