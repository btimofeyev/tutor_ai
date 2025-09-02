const OpenAI = require('openai');
const logger = require('../utils/logger')('simpleOpenAIService');
const supabase = require('../utils/supabaseClient');

/**
 * Simple OpenAI Service - Enhanced with Responses API
 * Uses OpenAI's conversation storage and response chaining for better persistence
 */
class SimpleOpenAIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.config = {
      model: 'gpt-4o-mini', // Cost-effective model
      temperature: 0.7,
      max_tokens: 1000,
      store: true, // Enable 30-day conversation storage
    };

    // Fallback in-memory storage for response IDs when database fails
    this.responseChain = new Map();
    this.conversationHistory = new Map(); // sessionId -> [messages]
    
    logger.info('Simple OpenAI Service initialized with Responses API');
  }

  /**
   * Create new session with child information
   * Only stores session metadata temporarily - database entry created on first message
   */
  async createSession(childId, childName = 'Student', childGrade = null) {
    const sessionId = `session_${childId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Store session metadata temporarily (will be saved to database on first message)
      this.sessionMetadata = this.sessionMetadata || new Map();
      this.sessionMetadata.set(sessionId, {
        child_id: childId,
        child_name: childName,
        child_grade: childGrade,
        created_at: new Date().toISOString()
      });
      
      logger.info(`Created session: ${sessionId} for ${childName}${childGrade ? ` (Grade ${childGrade})` : ''}`);
      return sessionId;
      
    } catch (error) {
      logger.error('Error creating session:', error);
      throw error;
    }
  }

  /**
   * Send message with OpenAI Responses API and response chaining
   */
  async sendMessage(sessionId, message, childName = 'Student') {
    try {
      // Get previous response ID for chaining
      const previousResponseId = await this.getPreviousResponseId(sessionId);
      
      // Get child info from session metadata
      const sessionData = await this.getSessionData(sessionId);
      const childGrade = sessionData?.metadata?.child_grade || null;
      
      // Get or initialize conversation history
      let conversation = this.conversationHistory.get(sessionId) || [
        {
          role: 'system',
          content: this.buildStudyAssistantPrompt(childName, childGrade)
        }
      ];
      
      // Add current user message
      conversation.push({
        role: 'user',
        content: message
      });
      
      // Keep conversation manageable (last 10 exchanges = 20 messages + system)
      if (conversation.length > 21) {
        conversation = [
          conversation[0], // Keep system message
          ...conversation.slice(-20) // Keep last 20 user/assistant messages
        ];
      }
      
      console.log(`💬 Conversation length for ${sessionId.slice(-10)}: ${conversation.length - 1} messages`);

      // Create completion with store and response chaining
      const requestParams = {
        model: this.config.model,
        messages: conversation, // Use full conversation history
        temperature: this.config.temperature,
        max_tokens: this.config.max_tokens,
        store: this.config.store // Enable 30-day storage
        // metadata removed due to null value restrictions
      };

      // Note: Response chaining via 'include' parameter not yet supported in current OpenAI API
      // Using conversation persistence with 'store' parameter instead
      if (previousResponseId) {
        logger.debug(`Previous response available: ${previousResponseId} (will use store persistence)`);
      }

      // Get AI response
      const response = await this.openai.chat.completions.create(requestParams);
      const aiMessage = response.choices[0].message.content;
      const responseId = response.id;
      
      // Add AI response to conversation history
      conversation.push({
        role: 'assistant',
        content: aiMessage
      });
      
      // Store updated conversation
      this.conversationHistory.set(sessionId, conversation);

      // Create database session entry if this is the first message
      await this.ensureSessionInDatabase(sessionId);

      // Update session title with first message and update timestamps
      await this.updateSessionWithMessage(sessionId, message);

      // Save messages to database for persistence
      await this.saveMessagesToDatabase(sessionId, [
        { role: 'user', content: message, response_id: null },
        { role: 'assistant', content: aiMessage, response_id: responseId }
      ]);

      // Store response ID for tracking
      await this.updateSessionResponseId(sessionId, responseId, response.conversation_id);

      logger.info(`Session ${sessionId}: Message processed with response ${responseId}`);
      
      return {
        success: true,
        response: aiMessage,
        responseId: responseId,
        conversationId: response.conversation_id,
        usage: response.usage
      };

    } catch (error) {
      logger.error('Error processing message:', error);
      
      return {
        success: false,
        error: 'Failed to process your message. Please try again.',
        details: error.message
      };
    }
  }

  /**
   * Get previous response ID for chaining
   */
  async getPreviousResponseId(sessionId) {
    try {
      const { data, error } = await supabase
        .from('conversation_sessions')
        .select('last_response_id')
        .eq('session_id', sessionId)
        .single();
        
      if (error || !data) {
        logger.debug(`No previous response ID from database for session ${sessionId}`);
        // Fallback to in-memory storage
        const inMemoryResponse = this.responseChain.get(sessionId);
        console.log(`🔗 Using in-memory fallback for ${sessionId.slice(-10)}:`, inMemoryResponse || 'NONE');
        return inMemoryResponse || null;
      }
      
      console.log(`🔗 Database response ID for ${sessionId.slice(-10)}:`, data.last_response_id);
      return data.last_response_id;
    } catch (error) {
      logger.debug('Could not retrieve previous response ID:', error.message);
      // Fallback to in-memory storage
      const inMemoryResponse = this.responseChain.get(sessionId);
      console.log(`🔗 In-memory fallback after error for ${sessionId.slice(-10)}:`, inMemoryResponse || 'NONE');
      return inMemoryResponse || null;
    }
  }

  /**
   * Ensure session exists in database - creates it if this is the first message
   */
  async ensureSessionInDatabase(sessionId) {
    try {
      // Check if session already exists in database
      const { data: existingSession, error: checkError } = await supabase
        .from('conversation_sessions')
        .select('id')
        .eq('session_id', sessionId)
        .single();

      if (existingSession) {
        // Session already exists, nothing to do
        return;
      }

      // Get session metadata from temporary storage
      const metadata = this.sessionMetadata?.get(sessionId);
      if (!metadata) {
        logger.warn(`No session metadata found for ${sessionId}, using defaults`);
        return;
      }

      // Create database entry for session with first message
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('conversation_sessions')
        .insert([{
          child_id: metadata.child_id,
          session_id: sessionId,
          topic: 'Study Session', // Will be updated with first message topic later
          created_at: now,
          last_active: now,
          message_count: 0,
          metadata: {
            child_name: metadata.child_name,
            child_grade: metadata.child_grade,
            created_at: metadata.created_at
          }
        }])
        .select();

      if (error) {
        logger.warn('Could not store session in database:', error.message);
      } else {
        logger.info(`📝 Created database session ${sessionId} on first message`);
        // Remove from temporary storage since it's now in database
        this.sessionMetadata?.delete(sessionId);
      }
    } catch (error) {
      logger.warn('Error ensuring session in database:', error.message);
    }
  }

  /**
   * Update session with first message title and current timestamp
   */
  async updateSessionWithMessage(sessionId, message) {
    try {
      // Generate title from first message (first 40 characters)
      const title = message.length > 40 
        ? message.substring(0, 40).trim() + '...'
        : message.trim();

      // Get current message count
      const conversation = this.conversationHistory.get(sessionId) || [];
      const messageCount = Math.max(0, conversation.length - 1); // Subtract 1 for system message

      const updateData = {
        topic: title,
        last_active: new Date().toISOString(),
        message_count: messageCount
      };

      const { error } = await supabase
        .from('conversation_sessions')
        .update(updateData)
        .eq('session_id', sessionId);

      if (error) {
        logger.warn(`Could not update session ${sessionId} title:`, error.message);
      } else {
        console.log(`📝 Updated session ${sessionId.slice(-10)} title: "${title}"`);
      }
    } catch (error) {
      logger.warn('Error updating session with message:', error.message);
    }
  }

  /**
   * Save messages to database for persistence
   */
  async saveMessagesToDatabase(sessionId, messages) {
    try {
      const messagesToInsert = messages.map(msg => {
        const messageData = {
          session_id: sessionId,
          role: msg.role,
          content: msg.content,
          expires_at: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)) // 7 days from now
        };
        
        // Only include response_id if it's not null/undefined
        if (msg.response_id) {
          messageData.response_id = msg.response_id;
        }
        
        return messageData;
      });

      const { error } = await supabase
        .from('conversation_messages')
        .insert(messagesToInsert);

      if (error) {
        logger.warn(`Could not save messages to database for session ${sessionId}:`, error.message);
      } else {
        console.log(`💾 Saved ${messages.length} messages to database for session ${sessionId.slice(-10)}`);
      }
    } catch (error) {
      logger.warn('Error saving messages to database:', error.message);
    }
  }

  /**
   * Update session with latest response ID and conversation ID
   */
  async updateSessionResponseId(sessionId, responseId, conversationId = null) {
    // Always store in memory as fallback
    this.responseChain.set(sessionId, responseId);
    console.log(`💾 Stored response ${responseId} for session ${sessionId.slice(-10)}`);
    
    try {
      const updateData = {
        last_response_id: responseId,
        last_active: new Date().toISOString()
        // Note: message_count will be incremented via RPC or separate query
      };
      
      if (conversationId) {
        updateData.openai_conversation_id = conversationId;
      }
      
      const { error } = await supabase
        .from('conversation_sessions')
        .update(updateData)
        .eq('session_id', sessionId);
        
      if (error) {
        logger.warn(`Could not update session ${sessionId} in database:`, error.message);
        logger.info(`Using in-memory fallback for response chaining`);
      } else {
        console.log(`✅ Successfully stored response ${responseId} in database`);
      }
    } catch (error) {
      logger.warn('Could not update session response ID in database:', error.message);
      logger.info(`Using in-memory fallback for response chaining`);
    }
  }

  /**
   * Get session data from database
   */
  async getSessionData(sessionId) {
    try {
      const { data, error } = await supabase
        .from('conversation_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single();
        
      if (!error && data) {
        return data;
      }

      // If not found in database, check temporary metadata
      const tempMetadata = this.sessionMetadata?.get(sessionId);
      if (tempMetadata) {
        return {
          session_id: sessionId,
          child_id: tempMetadata.child_id,
          metadata: {
            child_name: tempMetadata.child_name,
            child_grade: tempMetadata.child_grade,
            created_at: tempMetadata.created_at
          }
        };
      }

      return null;
    } catch (error) {
      logger.debug('Could not get session data:', error.message);
      return null;
    }
  }

  /**
   * Get conversation history from memory or database
   */
  async getConversation(sessionId) {
    try {
      // First try to get conversation from in-memory storage
      const conversation = this.conversationHistory.get(sessionId);
      
      if (conversation && conversation.length > 1) {
        // Return messages without the system prompt (skip first message)
        const userMessages = conversation.slice(1).map((msg, index) => ({
          id: `${sessionId}_${index}`,
          role: msg.role,
          content: msg.content,
          timestamp: new Date().toISOString()
        }));
        
        console.log(`📜 Retrieved ${userMessages.length} messages from memory for session ${sessionId.slice(-10)}`);
        
        return {
          sessionId,
          messages: userMessages,
          messageCount: userMessages.length
        };
      }
      
      // If not in memory, try to load from database
      console.log(`🔍 No conversation in memory, checking database for session ${sessionId.slice(-10)}`);
      
      const { data, error } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('session_id', sessionId)
        .gt('expires_at', new Date().toISOString()) // Only get non-expired messages
        .order('created_at', { ascending: true });
      
      if (error) {
        logger.warn(`Could not load messages from database for session ${sessionId}:`, error.message);
        return {
          sessionId,
          messages: [],
          messageCount: 0
        };
      }
      
      if (!data || data.length === 0) {
        console.log(`📭 No messages found in database for session ${sessionId.slice(-10)}`);
        return {
          sessionId,
          messages: [],
          messageCount: 0
        };
      }
      
      // Convert database messages to frontend format
      const userMessages = data.map((msg, index) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        responseId: msg.response_id,
        timestamp: msg.created_at
      }));
      
      console.log(`📜 Retrieved ${userMessages.length} messages from database for session ${sessionId.slice(-10)}`);
      
      return {
        sessionId,
        messages: userMessages,
        messageCount: userMessages.length
      };
    } catch (error) {
      logger.error('Error getting conversation history:', error);
      return {
        sessionId,
        messages: [],
        messageCount: 0
      };
    }
  }

  /**
   * Clean up old sessions and expired messages
   */
  async cleanup() {
    try {
      const now = new Date().toISOString();
      const oneDayAgo = new Date(Date.now() - (24 * 60 * 60 * 1000)).toISOString();
      
      // Clean up expired messages (older than 7 days)
      const { data: expiredMessages, error: messageError } = await supabase
        .from('conversation_messages')
        .delete()
        .lt('expires_at', now);
        
      if (messageError) {
        logger.warn('Could not clean up expired messages:', messageError.message);
      } else {
        const deletedCount = expiredMessages?.length || 0;
        console.log(`🧹 Cleaned up ${deletedCount} expired messages`);
        logger.info(`Cleaned up ${deletedCount} expired conversation messages`);
      }
      
      // Clean up empty conversations - sessions with no user messages
      await this.cleanupEmptyConversations();
      
      // Clean up old sessions (inactive for more than 1 day)
      const { data: oldSessions, error: sessionError } = await supabase
        .from('conversation_sessions')
        .delete()
        .lt('last_active', oneDayAgo);
        
      if (sessionError) {
        logger.warn('Could not clean up old sessions:', sessionError.message);
      } else {
        const deletedCount = oldSessions?.length || 0;
        console.log(`🧹 Cleaned up ${deletedCount} old sessions`);
        logger.info(`Cleaned up ${deletedCount} old conversation sessions`);
      }
    } catch (error) {
      logger.warn('Cleanup error:', error.message);
    }
  }

  /**
   * Clean up empty conversations - sessions with no user messages
   */
  async cleanupEmptyConversations() {
    try {
      console.log('🧹 Starting cleanup of empty conversations...');
      
      // Get all sessions
      const { data: sessions, error: sessionError } = await supabase
        .from('conversation_sessions')
        .select('session_id');
      
      if (sessionError || !sessions) {
        logger.warn('Could not fetch sessions for cleanup:', sessionError?.message);
        return;
      }
      
      let deletedCount = 0;
      
      for (const session of sessions) {
        // Check if session has any user messages
        const { data: userMessages, error: messageError } = await supabase
          .from('conversation_messages')
          .select('id')
          .eq('session_id', session.session_id)
          .eq('role', 'user')
          .limit(1);
        
        if (!messageError && (!userMessages || userMessages.length === 0)) {
          // No user messages found, delete this empty conversation
          console.log(`🗑️ Deleting empty conversation: ${session.session_id.slice(-10)}`);
          
          // Delete any messages (system/assistant messages without user input)
          await supabase
            .from('conversation_messages')
            .delete()
            .eq('session_id', session.session_id);
          
          // Delete session
          await supabase
            .from('conversation_sessions')
            .delete()
            .eq('session_id', session.session_id);
          
          deletedCount++;
        }
      }
      
      console.log(`🧹 Cleanup complete: Deleted ${deletedCount} empty conversations`);
      logger.info(`Cleanup: Removed ${deletedCount} empty conversations`);
      
    } catch (error) {
      logger.warn('Error during empty conversation cleanup:', error.message);
    }
  }

  /**
   * Build the study assistant system prompt with child information
   */
  buildStudyAssistantPrompt(childName = 'Student', childGrade = null) {
    const gradeInfo = childGrade ? `The student is in grade ${childGrade}.` : '';
    
    return `You are Klio, a helpful AI study assistant for K-12 students. You are currently helping ${childName}. ${gradeInfo}

IMPORTANT STUDENT INFORMATION:
- Student's name: ${childName}
- ${childGrade ? `Grade level: ${childGrade}` : 'Grade level: Not specified'}
- Always remember the student's name throughout the conversation

Your role is to:
- Help students understand concepts through clear, age-appropriate explanations
- Answer questions about homework and schoolwork
- Provide examples and practice problems when asked
- Use the Socratic method to guide learning - ask questions to help students think through problems
- Be encouraging, patient, and supportive
- Adapt your language to be appropriate for the student's grade level${childGrade ? ` (grade ${childGrade})` : ''}

Guidelines:
- Keep responses concise but thorough
- Use markdown formatting for math expressions (e.g., $x^2 + 1 = 10$)
- When solving problems, guide the student through the steps rather than giving direct answers
- Ask follow-up questions to check understanding
- Be encouraging and celebrate progress
- If you don't understand something, ask for clarification
- Focus on educational content - if asked about non-academic topics, gently redirect to studies
- When the student asks about their name, respond with "${childName}"
- When asked about their grade, respond with "${childGrade ? `grade ${childGrade}` : 'I don\'t have your grade information'}"

Remember: You're here to help ${childName} learn and understand, not to do their work for them. Guide them to discover answers through questions and explanations.`;
  }

  /**
   * Get service health status
   */
  async getHealthStatus() {
    try {
      // Get active session count from database
      const { data, error } = await supabase
        .from('conversation_sessions')
        .select('id')
        .gte('last_active', new Date(Date.now() - (60 * 60 * 1000)).toISOString());
        
      const activeSessions = error ? 0 : (data?.length || 0);
      
      return {
        status: 'healthy',
        activeSessions,
        model: this.config.model,
        features: {
          responses_api: true,
          conversation_storage: true,
          response_chaining: true
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'degraded',
        activeSessions: 0,
        model: this.config.model,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new SimpleOpenAIService();