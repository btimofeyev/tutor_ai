// Enhanced Chat History Service with Summarization and Cleanup
const { supabase } = require('../utils/supabaseClient');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class ChatHistoryService {
  constructor() {
    this.RECENT_MESSAGES_LIMIT = 50; // Keep 50 recent messages in full
    this.SUMMARIZATION_BATCH_SIZE = 20; // Summarize in batches of 20 messages
    this.SUMMARY_RETENTION_DAYS = 90; // Keep summaries for 90 days
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
   * Summarize old conversations and clean up database
   */
  async summarizeAndCleanup(childId) {
    try {
      console.log(`🧹 Starting summarization and cleanup for child ${childId}`);

      // Get messages older than the recent limit
      const { data: oldMessages, error } = await supabase
        .from('chat_messages')
        .select('id, role, content, created_at')
        .eq('child_id', childId)
        .order('created_at', { ascending: true });

      if (error || !oldMessages || oldMessages.length <= this.RECENT_MESSAGES_LIMIT) {
        console.log('No old messages to summarize');
        return;
      }

      // Messages to summarize (all but the most recent)
      const messagesToSummarize = oldMessages.slice(0, -this.RECENT_MESSAGES_LIMIT);
      
      if (messagesToSummarize.length < this.SUMMARIZATION_BATCH_SIZE) {
        console.log('Not enough old messages to warrant summarization');
        return;
      }

      // Group messages into conversation sessions (by time gaps)
      const conversationSessions = this.groupIntoSessions(messagesToSummarize);
      
      for (const session of conversationSessions) {
        if (session.messages.length >= 10) { // Only summarize substantial conversations
          await this.summarizeSession(childId, session);
          await this.deleteMessages(session.messages.map(m => m.id));
        }
      }

      console.log(`✅ Summarization and cleanup completed for child ${childId}`);
    } catch (error) {
      console.error('Error in summarizeAndCleanup:', error);
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
   * Summarize a conversation session using AI
   */
  async summarizeSession(childId, session) {
    try {
      const conversationText = session.messages
        .map(m => `${m.role}: ${m.content}`)
        .join('\n');

      const summaryPrompt = `Please provide a concise summary of this tutoring conversation between a student and their AI tutor Klio. Focus on:
- What topics were covered
- Any learning struggles or breakthroughs
- Key concepts learned
- Homework/assignments discussed
- Student's progress and understanding level

Conversation:
${conversationText}

Summary:`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Use cheaper model for summarization
        messages: [
          {
            role: "system",
            content: "You are helping to summarize tutoring conversations. Be concise but capture key learning moments, topics, and student progress."
          },
          {
            role: "user",
            content: summaryPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 300
      });

      const summary = response.choices[0].message.content;

      // Store the summary
      await supabase
        .from('conversation_summaries')
        .insert([{
          child_id: childId,
          summary: summary,
          message_count: session.messages.length,
          period_start: session.startTime.toISOString(),
          period_end: session.endTime.toISOString(),
          created_at: new Date().toISOString()
        }]);

      console.log(`📝 Summarized session with ${session.messages.length} messages`);
    } catch (error) {
      console.error('Error summarizing session:', error);
    }
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
   * Schedule cleanup for a child (call this periodically)
   */
  async scheduleCleanup(childId) {
    const stats = await this.getConversationStats(childId);
    
    // Trigger cleanup if we have too many current messages
    if (stats.currentMessages > this.RECENT_MESSAGES_LIMIT * 1.5) {
      await this.summarizeAndCleanup(childId);
      await this.cleanupOldSummaries(childId);
    }
  }
}

module.exports = new ChatHistoryService();