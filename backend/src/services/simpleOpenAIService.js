const OpenAI = require('openai');
const logger = require('../utils/logger')('simpleOpenAIService');
const supabase = require('../utils/supabaseClient');
const learningContextService = require('./learningContextService');

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
      model: 'gpt-5-mini', // Cost-effective model
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
   * Now supports quiz context for targeted tutoring help
   */
  async sendMessage(sessionId, message, childName = 'Student', quizContext = null) {
    try {
      // Get previous response ID for chaining
      const previousResponseId = await this.getPreviousResponseId(sessionId);
      
      // Get child info from session metadata
      const sessionData = await this.getSessionData(sessionId);
      const childGrade = sessionData?.metadata?.child_grade || null;
      const childId = sessionData?.child_id;
      
      // Handle quiz context first if provided
      let learningContext = null;
      let homeworkIntent = { needsContext: false, specificAssignment: null, confidence: 0 };
      
      if (quizContext?.isQuizActive) {
        logger.info(`🧪 Quiz context active: "${quizContext.quizTitle}" - Processing quiz hint request`);
        // For quiz context, we'll use a special system prompt
        homeworkIntent = { needsContext: true, isQuizContext: true, quizContext: quizContext, confidence: 1.0 };
      } else if (childId) {
        try {
          // Fetch full learning context for regular homework help
          learningContext = await learningContextService.getLearningContextSummary(childId);
          logger.info(`Fetched learning context for child ${childId}: ${learningContext.nextAssignments.length} assignments`);
          
          // Detect homework intent with assignment matching
          homeworkIntent = this.detectHomeworkIntent(message, learningContext.nextAssignments);
          
          // Filter to specific assignment if one was matched
          if (homeworkIntent.specificAssignment) {
            learningContext = this.filterToSpecificAssignment(learningContext, homeworkIntent.specificAssignment);
            logger.info(`🎯 Context filtered to specific assignment: "${homeworkIntent.specificAssignment.title}" (confidence: ${homeworkIntent.confidence.toFixed(2)})`);
          } else if (homeworkIntent.needsContext) {
            logger.info(`📚 Using all available assignments context (no specific match found)`);
          }
          
        } catch (error) {
          logger.warn('Could not fetch learning context:', error.message);
          // Fallback to simple intent detection without assignments
          homeworkIntent = this.detectHomeworkIntent(message, []);
        }
      } else {
        // Fallback for no childId
        homeworkIntent = this.detectHomeworkIntent(message, []);
      }
      
      // Log quiz completion detection for debugging
      if (homeworkIntent.isQuizCompletion) {
        logger.info(`🧪 QUIZ COMPLETION DETECTED for session ${sessionId.slice(-6)}`);
        logger.info(`📊 Quiz results: ${JSON.stringify(homeworkIntent.quizResults)}`);
      }
      
      // Get or initialize conversation history with context-aware system prompt
      let conversation = this.conversationHistory.get(sessionId) || [];
      
      if (conversation.length === 0) {
        // New conversation - determine system prompt type
        let systemPrompt;
        if (homeworkIntent.isQuizCompletion) {
          // Use quiz review system prompt for quiz completion
          systemPrompt = this.buildQuizReviewPrompt(childName, childGrade, homeworkIntent.quizResults);
        } else if (homeworkIntent.isQuizContext) {
          // Use quiz-specific system prompt
          systemPrompt = this.buildQuizHintPrompt(childName, childGrade, homeworkIntent.quizContext);
        } else {
          // Use regular context-aware prompt
          const contextToUse = homeworkIntent.needsContext ? learningContext : null;
          systemPrompt = this.buildContextAwarePrompt(childName, childGrade, contextToUse);
        }
        
        conversation = [
          {
            role: 'system',
            content: systemPrompt
          }
        ];
      } else if (homeworkIntent.isQuizCompletion) {
        // Update system prompt for quiz review
        const newSystemPrompt = this.buildQuizReviewPrompt(childName, childGrade, homeworkIntent.quizResults);
        conversation[0] = {
          role: 'system',
          content: newSystemPrompt
        };
      } else if (homeworkIntent.isQuizContext) {
        // Update system prompt for quiz context
        const newSystemPrompt = this.buildQuizHintPrompt(childName, childGrade, homeworkIntent.quizContext);
        conversation[0] = {
          role: 'system',
          content: newSystemPrompt
        };
      } else if (homeworkIntent.needsContext && learningContext && learningContext.hasActiveWork) {
        // Update system prompt if we have homework intent with learning context
        const newSystemPrompt = this.buildContextAwarePrompt(childName, childGrade, learningContext);
        conversation[0] = {
          role: 'system',
          content: newSystemPrompt
        };
      }
      
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
      const responseMessage = response.choices[0].message;
      const responseId = response.id;
      
      // Handle tool calls if present
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        logger.info(`🔧 AI wants to call ${responseMessage.tool_calls.length} tool(s)`);
        
        // Process each tool call
        const toolResults = [];
        for (const toolCall of responseMessage.tool_calls) {
          try {
            const result = await this.handleToolCall(toolCall, childId, learningContext);
            toolResults.push({
              tool_call_id: toolCall.id,
              role: "tool",
              content: JSON.stringify(result)
            });
          } catch (error) {
            logger.error(`Error executing tool ${toolCall.function.name}:`, error);
            toolResults.push({
              tool_call_id: toolCall.id,
              role: "tool", 
              content: JSON.stringify({ error: error.message })
            });
          }
        }
        
        // Add assistant message with tool calls
        conversation.push({
          role: 'assistant',
          content: responseMessage.content,
          tool_calls: responseMessage.tool_calls
        });
        
        // Add tool results
        conversation.push(...toolResults);
        
        // Get final AI response after tool execution
        const finalResponse = await this.openai.chat.completions.create({
          model: this.config.model,
          messages: conversation,
          temperature: this.config.temperature,
          max_tokens: this.config.max_tokens
        });
        
        const aiMessage = finalResponse.choices[0].message.content;
        
        // Add final AI response
        conversation.push({
          role: 'assistant',
          content: aiMessage
        });
        
        // Store updated conversation and return the final message
        this.conversationHistory.set(sessionId, conversation);
        
        return {
          content: aiMessage,
          responseId: finalResponse.id,
          toolCallResults: toolResults
        };
      }
      
      // No tool calls - regular response
      const aiMessage = responseMessage.content;
      
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
   * Build quiz-specific system prompt for providing hints without giving away answers
   */
  buildQuizHintPrompt(childName = 'Student', childGrade = null, quizContext = null) {
    const gradeInfo = childGrade ? `The student is in grade ${childGrade}.` : '';
    
    let prompt = `You are Klio, a helpful AI study assistant for K-12 students. You are currently helping ${childName} during a QUIZ. ${gradeInfo}

🧪 QUIZ MODE ACTIVE 🧪

CURRENT QUIZ CONTEXT:
- Quiz Title: "${quizContext?.quizTitle || 'Practice Quiz'}"
- Assignment: "${quizContext?.assignmentTitle || 'Current Assignment'}"
- Student's Name: ${childName}
- ${childGrade ? `Grade Level: ${childGrade}` : 'Grade level: Not specified'}

CURRENT QUESTION CONTEXT:`;

    if (quizContext?.currentQuestion) {
      const question = quizContext.currentQuestion;
      prompt += `
- Question: "${question.question}"
- Question Type: ${question.type || 'unknown'}`;
      
      if (question.options && question.options.length > 0) {
        prompt += `
- Multiple Choice Options: ${question.options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join(', ')}`;
      }
      
      if (question.hint) {
        prompt += `
- Built-in Hint: "${question.hint}"`;
      }
    }

    if (quizContext?.learningObjectives?.length > 0) {
      prompt += `

LEARNING OBJECTIVES FOR THIS ASSIGNMENT:
${quizContext.learningObjectives.map(obj => `- ${obj}`).join('\n')}`;
    }

    if (quizContext?.keyTerms?.length > 0) {
      prompt += `

KEY TERMS TO FOCUS ON:
${quizContext.keyTerms.map(term => `- ${term}`).join('\n')}`;
    }

    prompt += `

🚨 CRITICAL QUIZ MODE INSTRUCTIONS:
1. **NEVER give the direct answer** - this is a quiz and the student must figure it out themselves
2. **Provide step-by-step guidance** using the Socratic method
3. **Ask leading questions** that help the student think through the problem
4. **Reference the learning objectives** and key terms when giving hints
5. **Break down complex problems** into smaller, manageable steps
6. **Encourage the student** and be patient with their learning process
7. **If it's multiple choice**, help them eliminate wrong answers without revealing the right one
8. **Focus on the thinking process** rather than the final answer

EXAMPLE GOOD RESPONSES:
❌ "The answer is B" 
✅ "Let's think about this step by step. What do you know about [concept]? Can you eliminate any answers that don't fit?"

❌ "32.4 ÷ 4 = 8.1"
✅ "Great question! When dividing decimals, what happens if we think about this as 324 ÷ 4 first? What would that equal? Then, where should we place the decimal point?"

Remember: Your goal is to help ${childName} learn and discover the answer themselves, not to give it away. Guide them to success through understanding!`;

    return prompt;
  }

  /**
   * Build quiz review system prompt for handling quiz completion results
   * @param {string} childName - Student's name
   * @param {string} childGrade - Student's grade level
   * @param {Object} quizResults - Extracted quiz results
   * @returns {string} Quiz review focused system prompt
   */
  buildQuizReviewPrompt(childName = 'Student', childGrade = null, quizResults = null) {
    const gradeInfo = childGrade ? `Grade ${childGrade}` : 'K-12';
    
    let prompt = `You are Klio, an active AI tutor helping ${childName} (${gradeInfo}) learn from their quiz mistakes.

🎯 QUIZ TUTORING MODE - BE CONCISE AND INTERACTIVE

RESPONSE RULES:
- Keep responses SHORT (2-3 sentences MAX)
- Start with ONE guiding question immediately
- NO long explanations or paragraphs
- If student gave random/nonsense answers, address that first

TUTORING STRATEGY:
1. Pick ONE missed concept to work on
2. Ask a simple question to check understanding
3. Based on their answer, either:
   - Ask a follow-up question to guide them
   - Give a short hint and ask another question
   - Move to next concept once they understand

EXAMPLE APPROACH:
❌ Bad: "The movable-type printing press was introduced to Europe by Johannes Gutenberg in the 15th century. This invention allowed for the mass production of books..."

✅ Good: "I see you put 'free' for the printing press question. Let's think - what do you think a printing press does?"

DETECT RANDOM ANSWERS:
If student answered with words like "free", "maga", "awesome" - these are random guesses.
Start with: "I noticed you guessed on some questions. That's okay! Let's work through [concept] together."

START IMMEDIATELY with a question about their FIRST missed concept. No greetings or summaries.`;

    return prompt;
  }

  /**
   * Calculate string similarity score using Levenshtein-like algorithm
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score between 0 and 1
   */
  calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1;
    
    // Check for exact substring matches
    if (s1.includes(s2) || s2.includes(s1)) {
      return 0.8;
    }
    
    // Word-based matching for titles
    const words1 = s1.split(/\s+/).filter(w => w.length > 2);
    const words2 = s2.split(/\s+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    let matchingWords = 0;
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1.includes(word2) || word2.includes(word1) || word1 === word2) {
          matchingWords++;
          break;
        }
      }
    }
    
    return matchingWords / Math.max(words1.length, words2.length);
  }

  /**
   * Get content type priority bonus for preferring student work over teacher lessons
   * @param {Object} assignment - Assignment object
   * @returns {number} Priority multiplier (0.4-1.0)
   */
  getContentTypePriority(assignment) {
    const title = assignment.title?.toLowerCase() || '';
    const contentType = assignment.content_type_suggestion?.toLowerCase() || '';
    const dbContentType = assignment.content_type?.toLowerCase() || '';
    const subjectName = assignment.child_subjects?.subjects?.name?.toLowerCase() || '';
    
    // HIGHEST PRIORITY: Use database content_type as primary indicator
    // Student work always gets highest priority
    if (['worksheet', 'assignment', 'practice', 'review', 'test', 'quiz'].includes(dbContentType)) {
      logger.info(`🎯 High priority content: "${assignment.title}" (database: ${dbContentType})`);
      return 1.0; // Full bonus for confirmed student work
    }
    
    // LOWEST PRIORITY: Teacher lessons from database
    if (dbContentType === 'lesson') {
      // Exception: Some lesson titles might actually be student work incorrectly categorized
      if (title.includes('worksheet') || title.includes('practice problem set') || 
          title.includes('mixed practice') || title.includes('homeschool')) {
        logger.info(`🎯 High priority content: "${assignment.title}" (lesson with student work title)`);
        return 0.9; // Slightly lower than pure worksheets but still high
      }
      logger.info(`🔽 Low priority content: "${assignment.title}" (database: lesson)`);
      return 0.3; // Very low priority for teacher lessons
    }
    
    // Fallback to title-based analysis when database content_type is unclear
    // Highest priority: Student worksheets/assignments (actual homework)
    if (title.includes('worksheet') || title.includes('assignment') || 
        title.includes('practice problem set') || title.includes('mixed practice') ||
        contentType === 'worksheet' || title.includes('homeschool')) {
      logger.info(`🎯 High priority content: "${assignment.title}" (student work by title)`);
      return 0.9; // High but slightly lower than database-confirmed
    }
    
    // Medium-high priority: Reviews, tests, exercises (still student work)
    if (title.includes('review') || title.includes('test') || title.includes('quiz') || 
        title.includes('exam') || contentType === 'review' || contentType === 'test') {
      logger.info(`📋 Medium priority content: "${assignment.title}" (assessment)`);
      return 0.8;
    }
    
    // Medium priority: Discussions, think exercises
    if (title.includes('think') || title.includes('discuss') || title.includes('analysis')) {
      logger.info(`💭 Medium priority content: "${assignment.title}" (discussion)`);
      return 0.7;
    }
    
    // Medium priority: Subject-specific lesson formats that are student work
    // English/Literature: "After Reading from THE OUTLAWS..." or "Chapter X Review"
    if ((title.includes('after reading') && title.includes('think') && title.includes('discuss')) ||
        (title.includes('chapter') && title.includes('review')) ||
        (title.includes('section') && title.includes('review'))) {
      logger.info(`📚 Medium priority content: "${assignment.title}" (subject lesson assignment)`);
      return 0.7;
    }
    
    // Lower priority: Generic lesson content (likely teacher instructional material)
    if (title.includes('lesson') && !title.includes('problems about') && 
        !title.includes('review') && !title.includes('after reading') &&
        !title.includes('worksheet') && !title.includes('assignment')) {
      logger.info(`🔽 Low priority content: "${assignment.title}" (generic lesson content)`);
      return 0.4; // Reduced weight for generic lessons
    }
    
    logger.info(`📄 Default priority content: "${assignment.title}"`);
    return 0.6; // Default
  }

  /**
   * Get problem richness score based on number and depth of problems
   * @param {Object} assignment - Assignment object
   * @returns {number} Richness multiplier (0.3-1.0)
   */
  getProblemRichnessScore(assignment) {
    // Parse lesson_json if it's a string, or use directly if it's already an object
    let lessonData = null;
    if (assignment.lesson_json) {
      try {
        lessonData = typeof assignment.lesson_json === 'string' 
          ? JSON.parse(assignment.lesson_json) 
          : assignment.lesson_json;
      } catch (error) {
        logger.warn(`Error parsing lesson_json for "${assignment.title}":`, error);
      }
    }
    
    // Count problems from various sources in lesson_json
    const problemsWithContext = lessonData?.problems_with_context?.length || 0;
    const worksheetQuestions = lessonData?.worksheet_questions?.length || 0;
    const tasksOrQuestions = lessonData?.tasks_or_questions?.length || 0;
    
    const totalProblems = Math.max(problemsWithContext, worksheetQuestions, tasksOrQuestions);
    
    // Also consider content richness indicators from lesson_json
    const hasDetailedContent = lessonData?.full_text_content?.length > 1000;
    const hasLearningObjectives = lessonData?.learning_objectives?.length > 3;
    
    logger.info(`🔍 Problem count breakdown for "${assignment.title}": problems_with_context=${problemsWithContext}, worksheet_questions=${worksheetQuestions}, tasks_or_questions=${tasksOrQuestions}, max=${totalProblems}`);
    
    let richnessScore = 0.3; // Base score
    
    // Problem count scoring
    if (totalProblems >= 25) {
      richnessScore = 1.0; // Comprehensive worksheet (25+ problems)
    } else if (totalProblems >= 15) {
      richnessScore = 0.9; // Large assignment (15-24 problems)
    } else if (totalProblems >= 10) {
      richnessScore = 0.8; // Medium assignment (10-14 problems)
    } else if (totalProblems >= 5) {
      richnessScore = 0.6; // Small assignment (5-9 problems)
    } else if (totalProblems > 0) {
      richnessScore = 0.4; // Some problems (better than nothing)
    } else {
      richnessScore = 0.3; // No problems found
    }
    
    // Bonus for rich content - but this should boost even low problem counts
    if (hasDetailedContent) {
      richnessScore += 0.2; // Larger bonus for detailed content
      logger.info(`📋 Rich content bonus applied for "${assignment.title}"`);
    }
    if (hasLearningObjectives) {
      richnessScore += 0.1; // Bonus for learning objectives
      logger.info(`🎯 Learning objectives bonus applied for "${assignment.title}"`);
    }
    
    // For assignments with no problems but rich content, give minimum viable score
    if (totalProblems === 0 && hasDetailedContent) {
      richnessScore = Math.max(richnessScore, 0.5);
      logger.info(`📄 Minimum viable score applied for content-rich assignment "${assignment.title}"`);
    }
    
    // Cap at 1.0
    richnessScore = Math.min(richnessScore, 1.0);
    
    logger.info(`📊 Problem richness for "${assignment.title}": ${totalProblems} problems, content=${hasDetailedContent ? 'rich' : 'basic'}, objectives=${hasLearningObjectives ? 'yes' : 'no'}, richness=${richnessScore.toFixed(2)}`);
    return richnessScore;
  }

  /**
   * Extract assignment reference from student's message
   * @param {string} message - Student's message
   * @param {Array} assignments - Available assignments from learning context
   * @returns {Object} { found: boolean, assignment: Object|null, confidence: number }
   */
  extractAssignmentReference(message, assignments) {
    if (!message || !assignments || assignments.length === 0) {
      return { found: false, assignment: null, confidence: 0 };
    }
    
    const lowerMessage = message.toLowerCase();
    logger.info(`🔍 Extracting assignment reference from: "${message}"`);
    logger.info(`📚 Available assignments: ${assignments.map(a => a.title).join(', ')}`);
    
    let bestMatch = null;
    let bestScore = 0;
    const minConfidence = 0.2; // Minimum confidence threshold (lowered for new scoring system)
    
    for (const assignment of assignments) {
      const title = assignment.title || '';
      const subject = assignment.child_subjects?.subjects?.name || '';
      const unit = assignment.units?.name || '';
      
      // Direct title matching
      const titleScore = this.calculateSimilarity(message, title);
      
      // Subject-based matching (e.g., "math assignment")
      const subjectScore = lowerMessage.includes(subject.toLowerCase()) ? 0.5 : 0;
      
      // Unit-based matching (e.g., "unit 2", "chapter 12")
      const unitScore = unit && lowerMessage.includes(unit.toLowerCase()) ? 0.6 : 0;
      
      // Keywords matching (specific phrases that indicate assignments)
      let keywordScore = 0;
      const assignmentKeywords = [
        'help with', 'work on', 'working on', 'about', 'tell me about',
        'explain', 'review', 'assignment', 'worksheet', 'lesson'
      ];
      
      for (const keyword of assignmentKeywords) {
        if (lowerMessage.includes(keyword)) {
          // Extract text after keyword
          const afterKeyword = lowerMessage.split(keyword)[1];
          if (afterKeyword) {
            const extractedText = afterKeyword.trim();
            const extractedScore = this.calculateSimilarity(extractedText, title);
            keywordScore = Math.max(keywordScore, extractedScore);
          }
        }
      }
      
      // Enhanced lesson number matching - boost worksheets over teacher lessons
      let lessonNumberBonus = 0;
      const lessonMatch = lowerMessage.match(/lesson\s+(\d+)/);
      if (lessonMatch) {
        const lessonNumber = lessonMatch[1];
        const titleLower = title.toLowerCase();
        
        if (titleLower.includes(`lesson ${lessonNumber}`) || titleLower.includes(`lesson${lessonNumber}`)) {
          // Base bonus for lesson number match
          lessonNumberBonus = 0.6;
          
          // Extra bonus for student worksheets vs teacher lessons
          if (titleLower.includes('mixed practice') || 
              titleLower.includes('problem set') || 
              titleLower.includes('homeschool') ||
              titleLower.includes('saxon math')) {
            lessonNumberBonus = 0.9; // Higher bonus for student worksheets
            logger.info(`🎯 Lesson number bonus (student worksheet): "${title}" gets ${lessonNumberBonus}`);
          } else if (titleLower.includes('problems about')) {
            lessonNumberBonus = 0.5; // Lower bonus for teacher lessons  
            logger.info(`📝 Lesson number bonus (teacher lesson): "${title}" gets ${lessonNumberBonus}`);
          }
        }
      }
      
      // Base similarity score
      const baseScore = Math.max(
        titleScore * 1.0,      // Full title match gets highest weight
        keywordScore * 0.9,    // Keyword-extracted match
        lessonNumberBonus,     // Lesson number matching with worksheet preference
        unitScore * 0.8,       // Unit match
        subjectScore * 0.6     // Subject match gets lower weight
      );
      
      // Enhanced scoring with content prioritization
      const contentBonus = this.getContentTypePriority(assignment);
      const richnessBonus = this.getProblemRichnessScore(assignment);
      
      // For very strong title matches, reduce content penalty impact
      let finalScore = baseScore * contentBonus * richnessBonus;
      
      // If we have a very strong title match (0.8+), don't let content penalty kill it
      if (titleScore >= 0.8) {
        const titleBoostedScore = baseScore * Math.max(contentBonus, 0.7) * Math.max(richnessBonus, 0.5);
        finalScore = Math.max(finalScore, titleBoostedScore);
        logger.info(`🎯 Strong title match bonus applied for "${title}"`);
      }
      
      logger.info(`📊 Assignment "${title}": base=${baseScore.toFixed(2)}, content=${contentBonus.toFixed(2)}, richness=${richnessBonus.toFixed(2)}, final=${finalScore.toFixed(2)}`);
      
      if (finalScore > bestScore && finalScore >= minConfidence) {
        bestScore = finalScore;
        bestMatch = assignment;
      }
    }
    
    if (bestMatch) {
      logger.info(`✅ Assignment match found: "${bestMatch.title}" (confidence: ${bestScore.toFixed(2)})`);
      return { found: true, assignment: bestMatch, confidence: bestScore };
    } else {
      logger.info('❌ No assignment match found above confidence threshold');
      return { found: false, assignment: null, confidence: 0 };
    }
  }

  /**
   * Filter learning context to focus on specific assignment
   * @param {Object} learningContext - Full learning context
   * @param {Object} specificAssignment - The assignment to focus on
   * @returns {Object} Filtered learning context with only the specific assignment
   */
  filterToSpecificAssignment(learningContext, specificAssignment) {
    if (!learningContext || !specificAssignment) {
      return learningContext;
    }
    
    logger.info(`🎯 Filtering context to specific assignment: "${specificAssignment.title}"`);
    
    return {
      ...learningContext,
      nextAssignments: [specificAssignment], // Only include the specific assignment
      hasActiveWork: true
    };
  }

  /**
   * Detect if student's message indicates they need homework/assignment help
   * @param {string} message - Student's message
   * @param {Array} assignments - Available assignments (optional for enhanced matching)
   * @returns {Object} { needsContext: boolean, specificAssignment: Object|null, confidence: number }
   */
  detectHomeworkIntent(message, assignments = []) {
    const homeworkKeywords = [
      'homework', 'assignment', 'worksheet', 'problem', 'question',
      'next', 'help', 'stuck', "don't understand", 'quiz', 'test',
      'due', 'work on', 'working on', 'exercise', 'practice',
      'math problem', 'science question', 'history assignment',
      'what is it', 'tell me about', 'explain', 'about', 'lesson',
      'chapter', 'unit', 'study', 'review'
    ];
    
    const lowerMessage = message.toLowerCase();
    const hasKeyword = homeworkKeywords.some(word => lowerMessage.includes(word));
    
    // Check for quiz completion messages
    const quizCompletionPatterns = [
      'i just completed the quiz',
      'i completed the quiz',
      'finished the quiz',
      'just finished the quiz',
      'quiz on',
      'scored',
      'got wrong:',
      'questions i got wrong',
      'correct answer:'
    ];
    
    const isQuizCompletion = quizCompletionPatterns.some(pattern => 
      lowerMessage.includes(pattern)
    ) || (
      lowerMessage.includes('quiz') && 
      (lowerMessage.includes('scored') || lowerMessage.includes('questions'))
    );
    
    let quizResults = null;
    if (isQuizCompletion) {
      quizResults = this.extractQuizResults(message);
    }
    
    // Also check for very short follow-up questions that are clearly about assignments
    const isFollowUpQuestion = lowerMessage.length < 20 && (
      lowerMessage.includes('what') || 
      lowerMessage.includes('how') || 
      lowerMessage.includes('why') || 
      lowerMessage.includes('about')
    );
    
    const needsContext = hasKeyword || isFollowUpQuestion || isQuizCompletion;
    
    // If context needed and assignments available, try to match specific assignment
    let assignmentMatch = { found: false, assignment: null, confidence: 0 };
    if (needsContext && assignments.length > 0) {
      assignmentMatch = this.extractAssignmentReference(message, assignments);
    }
    
    return {
      needsContext,
      specificAssignment: assignmentMatch.assignment,
      confidence: assignmentMatch.confidence,
      isQuizCompletion,
      quizResults
    };
  }

  /**
   * Extract quiz results from a quiz completion message
   * @param {string} message - The message containing quiz results
   * @returns {Object} Extracted quiz data
   */
  extractQuizResults(message) {
    const results = {
      quizTitle: null,
      score: null,
      totalQuestions: null,
      timeSpent: null,
      wrongQuestions: [],
      hasWrongQuestions: false
    };

    // Extract quiz title
    const titleMatch = message.match(/quiz on ['""]([^'""]*)['""]/i) || 
                      message.match(/completed the quiz on ([^.]*)/i);
    if (titleMatch) {
      results.quizTitle = titleMatch[1].trim();
    }

    // Extract score (X out of Y format)
    const scoreMatch = message.match(/(\d+)\s+out of\s+(\d+)/i);
    if (scoreMatch) {
      results.score = parseInt(scoreMatch[1]);
      results.totalQuestions = parseInt(scoreMatch[2]);
    }

    // Extract time spent
    const timeMatch = message.match(/(\d+)\s+minutes?\s+and\s+(\d+)\s+seconds?/i) ||
                     message.match(/(\d+)\s+minutes?/i);
    if (timeMatch) {
      if (timeMatch[2]) {
        results.timeSpent = `${timeMatch[1]} minutes and ${timeMatch[2]} seconds`;
      } else {
        results.timeSpent = `${timeMatch[1]} minutes`;
      }
    }

    // Check if there are wrong questions listed
    results.hasWrongQuestions = message.toLowerCase().includes('questions i got wrong:') ||
                               message.toLowerCase().includes('got wrong:') ||
                               message.toLowerCase().includes('my answer:');

    // Extract wrong questions (simplified - just detect presence)
    if (results.hasWrongQuestions) {
      const wrongSectionMatch = message.match(/questions i got wrong:(.*?)(?:can you help me|$)/is);
      if (wrongSectionMatch) {
        const wrongSection = wrongSectionMatch[1];
        // Count question numbers mentioned
        const questionMatches = wrongSection.match(/question\s+\d+/gi);
        if (questionMatches) {
          results.wrongQuestions = questionMatches;
        }
      }
    }

    return results;
  }

  /**
   * Build context-aware system prompt that includes learning materials
   * @param {string} childName - Student's name
   * @param {string} childGrade - Student's grade level
   * @param {Object} learningContext - Learning context from learningContextService
   * @returns {string} Enhanced system prompt with learning context
   */
  buildContextAwarePrompt(childName = 'Student', childGrade = null, learningContext = null) {
    // Start with base prompt
    let prompt = this.buildStudyAssistantPrompt(childName, childGrade);
    
    // Add learning context if available
    if (learningContext && learningContext.hasActiveWork) {
      // Determine if we have a specific assignment context
      const specificAssignment = learningContext.nextAssignments && learningContext.nextAssignments.length === 1 
        ? learningContext.nextAssignments[0] 
        : null;
        
      const contextStr = learningContextService.formatContextForPrompt(learningContext, specificAssignment);
      console.log('🔍 DEBUG: Learning context being added to AI prompt:');
      console.log('📝 Full context string length:', contextStr.length);
      console.log('📋 Context type:', specificAssignment ? 'specific assignment' : 'multiple assignments overview');
      console.log('📋 Context preview:', contextStr.substring(0, 500) + '...');
      prompt += contextStr;
      
      // The formatContextForPrompt method now handles all the prompt logic
      // including specific assignment focus vs. multiple assignments overview
    }
    
    return prompt;
  }

  /**
   * Generate quiz questions from assignment content
   * @param {Object} assignment - Assignment object with lesson_json
   * @param {number} questionCount - Number of questions to generate (default 5)
   * @returns {Object} Generated quiz object
   */
  async generateQuiz(assignment, requestedCount = null) {
    try {
      logger.info(`🧪 Generating quiz for assignment: "${assignment.title}"`);
      
      if (!assignment || !assignment.lesson_json) {
        throw new Error('Assignment or lesson content not found');
      }

      const subject = assignment.child_subjects?.subjects?.name || 'General';
      const grade = assignment.child_subjects?.children?.grade || 'Elementary';

      // Simple, direct prompt with all assignment content
      const prompt = `Create a practice quiz for this ${subject} assignment for ${grade} level students.

ASSIGNMENT TITLE: "${assignment.title}"

ASSIGNMENT CONTENT:
${JSON.stringify(assignment.lesson_json, null, 2)}

INSTRUCTIONS:
- Generate ${requestedCount ? requestedCount : 'an appropriate number of (5-15)'} questions based on the actual content above
- Focus on the key concepts, vocabulary words, and problems shown in the assignment
- Make questions test understanding of the specific material, not generic knowledge
- For vocabulary: test definitions and usage in context
- For math: create similar problems with different numbers
- For reading: test comprehension of the specific content

QUESTION TYPE RULES:
1. MULTIPLE CHOICE: Always provide exactly 4 options (A, B, C, D) with clear, distinct answers
2. SHORT ANSWER: For open-ended questions where students type their own response
3. FILL IN BLANK: Use format "The word _____ means brave" with clear single-word answers
4. AVOID: Questions asking for labels, underlining, or interface actions students can't perform

EXAMPLES OF GOOD QUESTIONS:
✅ "What does 'valiant' mean? A) Cowardly B) Brave and courageous C) Tired D) Hungry"
✅ "Complete the sentence: The knight was _____ in battle. (valiant/coward/lazy/tired)"
✅ "Explain what you learned from this assignment about narrative writing."
❌ "Underline the modifier in this sentence" (students can't underline)
❌ "Label the parts of speech" (without providing label options)

Return your response as valid JSON in this exact format:
{
  "title": "Practice Quiz: [Assignment Title]",
  "subject": "${subject}",
  "questions": [
    {
      "id": "q1",
      "question": "Question text here",
      "type": "multiple_choice",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correctAnswer": "B",
      "hint": "Helpful hint for the student"
    }
  ]
}`;

      // Generate quiz using structured output
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational quiz generator. Create engaging quizzes that test students on the specific content provided. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 2500
      });

      const quiz = JSON.parse(response.choices[0].message.content);
      
      // Ensure quiz has proper structure
      if (!quiz.questions || !Array.isArray(quiz.questions)) {
        throw new Error('Invalid quiz format received from AI');
      }

      // Add unique quiz ID
      quiz.id = `quiz_${assignment.id}_${Date.now()}`;
      quiz.assignmentId = assignment.id;
      
      logger.info(`✅ Generated quiz with ${quiz.questions.length} questions using direct GPT approach`);
      return quiz;

    } catch (error) {
      logger.error('Error generating quiz:', error);
      
      // Simple fallback
      return this.generateSimpleFallbackQuiz(assignment, requestedCount || 5);
    }
  }

  /**
   * Simple fallback quiz generation
   */
  generateSimpleFallbackQuiz(assignment, questionCount = 5) {
    logger.info('Generating simple fallback quiz');
    
    const subject = assignment.child_subjects?.subjects?.name || 'General';
    const questions = [];
    
    // Create basic questions about the assignment
    for (let i = 1; i <= questionCount; i++) {
      questions.push({
        id: `q${i}`,
        question: `Based on "${assignment.title}", what is one key concept you learned?`,
        type: 'short_answer',
        correctAnswer: 'Answers will vary based on assignment content',
        hint: 'Think about the main ideas covered in this assignment.'
      });
    }

    return {
      id: `fallback_quiz_${assignment.id}_${Date.now()}`,
      title: `Practice Quiz: ${assignment.title}`,
      subject: subject,
      assignmentId: assignment.id,
      questions: questions
    };
  }

  /**
   * Build prompt for AI quiz generation
   */
  buildQuizGenerationPrompt(assignment, problems, questionCount) {
    const subject = assignment.child_subjects?.subjects?.name || 'General';
    const grade = assignment.child_subjects?.children?.grade || 'Elementary';
    
    // Extract learning objectives and key concepts from the assignment
    const learningObjectives = assignment.learning_objectives || [];
    const keyTerms = assignment.assignment_metadata?.key_terms || [];
    const lessonContent = assignment.main_content_summary_or_extract || '';
    
    let prompt = `Generate a ${questionCount}-question practice quiz based on the actual content of this ${subject} assignment for ${grade} level students.

ASSIGNMENT DETAILS:
Title: "${assignment.title}"
Subject: ${subject}
Grade Level: ${grade}
Content Summary: ${lessonContent}

LEARNING OBJECTIVES:
${learningObjectives.map(obj => `- ${obj}`).join('\n')}

KEY TERMS TO FOCUS ON:
${keyTerms.map(term => `- ${term}`).join('\n')}

ACTUAL ASSIGNMENT CONTENT TO BASE QUIZ ON:
`;

    // Include the actual problems from the assignment with enhanced context
    problems.slice(0, 20).forEach((problem, index) => {
      let problemText = '';
      let questionType = 'unknown';
      let additionalContext = '';
      
      if (typeof problem === 'string') {
        problemText = problem;
      } else if (problem.problem_text) {
        problemText = problem.problem_text;
        questionType = problem.problem_type || 'unknown';
        if (problem.concepts) {
          additionalContext = ` [Concepts: ${problem.concepts.join(', ')}]`;
        }
      } else if (problem.question_text) {
        problemText = problem.question_text;
        questionType = problem.question_type || 'unknown';
      } else {
        problemText = problem.text || `Problem ${index + 1}`;
      }
      
      prompt += `${index + 1}. [${questionType}] ${problemText}${additionalContext}\n`;
    });

    // Extract lesson data once for use throughout this method
    const lessonData = typeof assignment.lesson_json === 'string' 
      ? JSON.parse(assignment.lesson_json) 
      : assignment.lesson_json;

    // Add more context from the full lesson content if available
    if (lessonData?.full_text_content) {
      const fullTextData = typeof lessonData.full_text_content === 'string' 
        ? JSON.parse(lessonData.full_text_content) 
        : lessonData.full_text_content;
      
      if (fullTextData?.main_content_summary_or_extract) {
        prompt += `\nLESSON SUMMARY: ${fullTextData.main_content_summary_or_extract}\n`;
      }
    }

    // If we have specific question types from the original, mention them
    const questionTypes = [...new Set(problems.map(p => p.problem_type || p.question_type).filter(Boolean))];
    if (questionTypes.length > 0) {
      prompt += `\nORIGINAL QUESTION TYPES USED: ${questionTypes.join(', ')}\n`;
    }

    // Include any narrative passages or context that questions refer to
    
    if (lessonData?.full_text_content) {
      const fullTextData = typeof lessonData.full_text_content === 'string' 
        ? JSON.parse(lessonData.full_text_content) 
        : lessonData.full_text_content;
      
      if (fullTextData?.tasks_or_questions) {
        prompt += `\nCONTEXT PASSAGES (use these if questions refer to them):`;
        fullTextData.tasks_or_questions.forEach((task, index) => {
          if (task.includes('Last week I got a new roommate') || task.includes('narrative') || task.length > 100) {
            prompt += `\nPassage ${index + 1}: ${task}\n`;
          }
        });
      }
    }

    prompt += `

🎯 CRITICAL REQUIREMENTS FOR HIGH-QUALITY QUIZZES:
1. **USE THE ACTUAL ASSIGNMENT CONTENT** - Create questions that directly reference the problems and concepts shown above
2. **DON'T CREATE GENERIC QUESTIONS** - Questions must be based on the specific material provided
3. **COPY THE STYLE** - Use the same question format and approach as the original assignment
4. **TEST THE SAME CONCEPTS** - Focus on the exact learning objectives and key terms listed
5. **APPROPRIATE DIFFICULTY** - Make questions suitable for ${grade} level students
6. **REALISTIC OPTIONS** - For multiple choice, create 4 plausible options where only one is clearly correct
7. **INCLUDE CONTEXT** - Reference the specific assignment material, not generic examples
8. **EDUCATIONAL VALUE** - Each question should help students review what they learned

EXAMPLES OF GOOD VS BAD QUIZ QUESTIONS:

❌ BAD (Generic): "What does 'happy' mean? A) Sad B) Joyful C) Angry D) Tired"
✅ GOOD (Based on content): "In the narrative about Max the fish, what point of view is used when the writer says 'I got a new roommate'? A) First-person B) Second-person C) Third-person D) Omniscient"

❌ BAD (Unrelated): "What is 2+2? A) 3 B) 4 C) 5 D) 6"  
✅ GOOD (From lesson): "When dividing 95.01 by 3, what is the first step? A) Move the decimal B) Divide 95 by 3 C) Round to nearest whole number D) Multiply by 10"

CREATE QUESTIONS THAT DIRECTLY TEST THE MATERIAL PROVIDED ABOVE - NOT RANDOM VOCABULARY OR GENERIC PROBLEMS!

FORMAT YOUR RESPONSE AS JSON:
{
  "title": "Practice Quiz: [Assignment Title]",
  "subject": "${subject}",
  "questions": [
    {
      "id": "q1",
      "question": "Question text here",
      "type": "multiple_choice" | "short_answer" | "numeric",
      "options": ["A option", "B option", "C option", "D option"] (only for multiple_choice),
      "correctAnswer": "correct answer here",
      "hint": "helpful hint for students"
    }
  ]
}

Generate the quiz now:`;

    return prompt;
  }

  /**
   * Parse AI response into quiz format
   */
  parseQuizResponse(aiResponse, assignment) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const quizData = JSON.parse(jsonMatch[0]);
      
      // Validate and format the quiz
      const quiz = {
        id: `quiz_${assignment.id}_${Date.now()}`,
        title: quizData.title || `Practice Quiz: ${assignment.title}`,
        subject: quizData.subject || assignment.child_subjects?.subjects?.name || 'General',
        assignmentId: assignment.id,
        questions: []
      };

      // Process questions
      if (quizData.questions && Array.isArray(quizData.questions)) {
        quiz.questions = quizData.questions.map((q, index) => ({
          id: q.id || `q${index + 1}`,
          question: q.question,
          type: q.type || 'short_answer',
          options: q.options || null,
          correctAnswer: q.correctAnswer,
          hint: q.hint || 'Think step by step through this problem.'
        }));
      }

      return quiz;

    } catch (error) {
      logger.warn('Error parsing AI quiz response:', error);
      // Fallback to structured extraction
      return this.extractQuizFromText(aiResponse, assignment);
    }
  }

  /**
   * Extract quiz from unstructured text response
   */
  extractQuizFromText(text, assignment) {
    const questions = [];
    const lines = text.split('\n');
    
    let currentQuestion = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Look for question patterns
      if (trimmed.match(/^\d+\./) || trimmed.toLowerCase().includes('question')) {
        if (currentQuestion) {
          questions.push(currentQuestion);
        }
        currentQuestion = {
          id: `q${questions.length + 1}`,
          question: trimmed.replace(/^\d+\.\s*/, ''),
          type: 'short_answer',
          correctAnswer: 'Answer will vary',
          hint: 'Think about what you learned in this lesson.'
        };
      }
    }
    
    if (currentQuestion) {
      questions.push(currentQuestion);
    }

    return {
      id: `quiz_${assignment.id}_${Date.now()}`,
      title: `Practice Quiz: ${assignment.title}`,
      subject: assignment.child_subjects?.subjects?.name || 'General',
      assignmentId: assignment.id,
      questions: questions.slice(0, 5) // Limit to 5 questions
    };
  }

  /**
   * Generate fallback quiz when AI generation fails
   */
  generateFallbackQuiz(assignment, questionCount = 5) {
    logger.info('Generating fallback quiz with assignment context');
    
    const subject = assignment.child_subjects?.subjects?.name || 'General';
    const keyTerms = assignment.assignment_metadata?.key_terms || [];
    const learningObjectives = assignment.learning_objectives || [];
    const questions = [];

    // Create questions based on learning objectives and actual content
    if (learningObjectives.length > 0) {
      learningObjectives.slice(0, Math.min(questionCount, 3)).forEach((objective, index) => {
        // Make more specific questions based on the objective
        let questionText = `Based on your work in "${assignment.title}", ${objective.toLowerCase()}`;
        if (questionText.endsWith('s')) {
          questionText = questionText.slice(0, -1); // Remove trailing 's' for better grammar
        }
        questionText += '. Give an example from the assignment.';
        
        questions.push({
          id: `q${index + 1}`,
          question: questionText,
          type: 'short_answer',
          correctAnswer: `Students should provide examples related to: ${objective}`,
          hint: `Think about the specific examples and concepts covered when learning about: ${objective.toLowerCase()}`
        });
      });
    }

    // Create questions based on key terms
    if (keyTerms.length > 0 && questions.length < questionCount) {
      const remainingSlots = questionCount - questions.length;
      keyTerms.slice(0, remainingSlots).forEach((term, index) => {
        questions.push({
          id: `qt${index + 1}`,
          question: `What is a ${term} in the context of ${subject}?`,
          type: 'short_answer',
          correctAnswer: `Refer to ${assignment.title} for the definition of ${term}`,
          hint: `This term was covered in your ${assignment.title} assignment.`
        });
      });
    }

    // If still need more questions, add subject-specific ones
    while (questions.length < questionCount) {
      const qNum = questions.length + 1;
      if (subject.toLowerCase().includes('english') || subject.toLowerCase().includes('language')) {
        questions.push({
          id: `qeng${qNum}`,
          question: `From your ${assignment.title} work, what is an example of good writing?`,
          type: 'short_answer',
          correctAnswer: 'Examples should be based on the assignment content',
          hint: 'Think about the writing concepts covered in this assignment.'
        });
      } else if (subject.toLowerCase().includes('math')) {
        questions.push({
          id: `qmath${qNum}`,
          question: `What is 5 + 3?`,
          type: 'numeric',
          correctAnswer: '8',
          hint: 'Add the two numbers together.'
        });
      } else {
        questions.push({
          id: `q${qNum}`,
          question: `What did you learn from "${assignment.title}"?`,
          type: 'short_answer',
          correctAnswer: 'Answers will vary based on assignment content',
          hint: 'Think about the main concepts from this assignment.'
        });
      }
    }

    return {
      id: `quiz_${assignment.id}_${Date.now()}`,
      title: `Practice Quiz: ${assignment.title}`,
      subject: subject,
      assignmentId: assignment.id,
      questions: questions.slice(0, questionCount)
    };
  }


  /**
   * Generate intelligent fallback quiz using AI to analyze content
   */
  async generateIntelligentFallbackQuiz(assignment, questionCount = 5) {
    try {
      const subject = assignment.child_subjects?.subjects?.name || 'General';
      const grade = assignment.child_subjects?.children?.grade || 'Elementary';
      
      // Extract any available content
      const lessonData = typeof assignment.lesson_json === 'string' 
        ? JSON.parse(assignment.lesson_json) 
        : assignment.lesson_json;

      const allContent = [
        assignment.title,
        assignment.content,
        lessonData.content,
        lessonData.lesson_content,
        lessonData.full_text_content,
        JSON.stringify(lessonData.tasks_or_questions || []),
        assignment.assignment_metadata?.description
      ].filter(Boolean).join('\n');

      const prompt = `Create a ${questionCount}-question quiz based on this ${subject} assignment for ${grade} students.

ASSIGNMENT CONTENT:
${allContent}

Create questions that test understanding of the key concepts, skills, or content from this assignment. Make questions specific to the actual material provided, not generic questions.

FORMAT AS JSON:
{
  "title": "Practice Quiz: ${assignment.title}",
  "subject": "${subject}",
  "questions": [
    {
      "id": "q1",
      "question": "Specific question based on the content above",
      "type": "multiple_choice",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correctAnswer": "B",
      "hint": "Review the specific part of the assignment that covers this concept"
    }
  ]
}`;

      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: 'You are an educational quiz generator. Create specific questions based on the actual content provided, not generic questions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const aiResponse = response.choices[0].message.content;
      const quiz = this.parseQuizResponse(aiResponse, assignment);
      
      return quiz;

    } catch (error) {
      logger.error('Error generating intelligent fallback quiz:', error);
      return this.generateFallbackQuiz(assignment, questionCount);
    }
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

  /**
   * Get tool definitions for OpenAI function calling
   */
  getToolDefinitions(childId, learningContext) {
    const tools = [];
    
    // Only add quiz generation tool if child has assignments
    if (childId && learningContext?.nextAssignments?.length > 0) {
      tools.push({
        type: "function",
        function: {
          name: "generate_quiz",
          description: "Generate a practice quiz for the student based on their current assignments. Use this when the student asks to be quizzed, tested, or wants practice questions.",
          parameters: {
            type: "object",
            properties: {
              assignment_id: {
                type: "string",
                description: "The ID of the assignment to create a quiz for. If not specified, use the first available assignment."
              },
              question_count: {
                type: "number",
                description: "Number of questions to generate (default: 5, max: 10)",
                minimum: 1,
                maximum: 10
              }
            },
            required: []
          }
        }
      });
    }
    
    return tools;
  }

  /**
   * Handle tool call execution
   */
  async handleToolCall(toolCall, childId, learningContext) {
    logger.info(`🔧 Executing tool: ${toolCall.function.name}`);
    
    switch (toolCall.function.name) {
      case 'generate_quiz':
        return await this.handleGenerateQuizTool(toolCall.function.arguments, childId, learningContext);
      default:
        throw new Error(`Unknown tool: ${toolCall.function.name}`);
    }
  }

  /**
   * Handle quiz generation tool call
   */
  async handleGenerateQuizTool(argumentsStr, childId, learningContext) {
    try {
      const args = JSON.parse(argumentsStr);
      const questionCount = Math.min(args.question_count || 5, 10);
      
      // Get assignment - use specified ID or first available
      let assignment;
      if (args.assignment_id) {
        assignment = learningContext.nextAssignments.find(a => a.id === args.assignment_id);
      } else {
        assignment = learningContext.nextAssignments[0];
      }
      
      if (!assignment) {
        return {
          success: false,
          error: "No assignment found to create quiz for"
        };
      }
      
      logger.info(`🧪 Generating quiz for assignment: "${assignment.title}" (${questionCount} questions)`);
      
      // Generate the quiz
      const quiz = await this.generateQuiz(assignment, questionCount);
      
      return {
        success: true,
        quiz: quiz,
        assignment: {
          id: assignment.id,
          title: assignment.title,
          subject: assignment.child_subjects?.subjects?.name
        },
        message: `Created a ${questionCount}-question quiz for "${assignment.title}"`
      };
      
    } catch (error) {
      logger.error('Error in generateQuizTool:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new SimpleOpenAIService();