const logger = require('../utils/logger')('simpleTutorController');
const simpleOpenAIService = require('../services/simpleOpenAIService');
const learningContextService = require('../services/learningContextService');
const supabase = require('../utils/supabaseClient');


class SimpleTutorController {
  constructor() {
    logger.info('Simple Tutor Controller initialized');
    
    // Cleanup old sessions every hour
    setInterval(() => {
      simpleOpenAIService.cleanup();
    }, 60 * 60 * 1000);
  }

  /**
   * Start a new chat session with Responses API support
   */
  startSession = async (req, res) => {
    try {
      const { childId } = req.body;
      
      if (!childId) {
        return res.status(400).json({
          success: false,
          error: 'Child ID is required'
        });
      }

      // Get child info from request (set by auth middleware)
      const childName = req.child?.name || 'Student';
      const childGrade = req.child?.grade || null;
      
      // Create new session with child information (now async)
      const sessionId = await simpleOpenAIService.createSession(childId, childName, childGrade);

      logger.info(`Started session ${sessionId} for child ${childId}`);

      res.json({
        success: true,
        session_id: sessionId,
        welcome_message: `Hi ${childName}! 👋 I'm Klio, your AI study assistant. I'm here to help you with any questions about your schoolwork. What would you like to study today?`
      });

    } catch (error) {
      logger.error('Error starting session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start chat session'
      });
    }
  }

  /**
   * End a chat session
   */
  endSession = async (req, res) => {
    try {
      const { sessionId, reason } = req.body;
      
      console.log(`🔚 Ending session: ${sessionId} (reason: ${reason || 'unknown'})`);
      logger.info(`Ending session ${sessionId} - reason: ${reason || 'unknown'}`);

      if (sessionId) {
        // Update session in database to mark as ended
        try {
          const supabase = require('../utils/supabaseClient');
          const { error } = await supabase
            .from('conversation_sessions')
            .update({ 
              ended_at: new Date().toISOString(),
              status: 'ended'
            })
            .eq('session_id', sessionId);

          if (error) {
            logger.warn(`Could not mark session ${sessionId} as ended:`, error.message);
          } else {
            console.log(`✅ Session ${sessionId.slice(-10)} marked as ended in database`);
          }
        } catch (dbError) {
          logger.warn('Database not available for session cleanup:', dbError.message);
        }
      }

      res.json({
        success: true,
        message: 'Session ended successfully'
      });

    } catch (error) {
      logger.error('Error ending session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to end session'
      });
    }
  }

  /**
   * Handle chat message
   */
  handleMessage = async (req, res) => {
    try {
      const { sessionId, message, childId, quizContext } = req.body;

      if (!sessionId || !message || !childId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID, message, and child ID are required'
        });
      }

      if (!message.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Message cannot be empty'
        });
      }

      // Get child name for personalization
      const childName = req.child?.name || 'Student';

      logger.info(`Processing message for session ${sessionId}: ${message.substring(0, 50)}...`);

      // Log quiz context if provided
      if (quizContext?.isQuizActive) {
        logger.info(`🧪 Quiz context detected: "${quizContext.quizTitle}" - Question: ${quizContext.currentQuestion?.question?.substring(0, 50)}...`);
      }

      // Send to OpenAI with response chaining and quiz context
      const result = await simpleOpenAIService.sendMessage(sessionId, message.trim(), childName, quizContext);

      if (result.success) {
        logger.info(`Response generated for session ${sessionId} with ID ${result.responseId}`);
        
        res.json({
          success: true,
          response: result.response,
          session_id: sessionId,
          response_id: result.responseId,
          conversation_id: result.conversationId,
          usage: result.usage
        });
      } else {
        logger.error('OpenAI service error:', result.error);
        
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to process message',
          details: result.details
        });
      }

    } catch (error) {
      logger.error('Error handling message:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process your message'
      });
    }
  }

  /**
   * Get conversation history
   */
  getHistory = async (req, res) => {
    try {
      const { sessionId } = req.params;

      console.log('🔍 getHistory called for session:', sessionId);
      logger.info(`Getting conversation history for session ${sessionId}`);

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID is required'
        });
      }

      const conversation = await simpleOpenAIService.getConversation(sessionId);
      console.log('📊 Retrieved conversation data:', { messageCount: conversation.messageCount, hasMessages: !!conversation.messages });

      res.json({
        success: true,
        session_id: sessionId,
        conversation: conversation
      });

    } catch (error) {
      logger.error('Error getting history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get conversation history'
      });
    }
  }

  /**
   * Health check with enhanced Responses API status
   */
  getHealth = async (req, res) => {
    try {
      const health = await simpleOpenAIService.getHealthStatus();
      
      res.json({
        status: health.status,
        service: 'Enhanced AI Tutor (Responses API)',
        timestamp: new Date().toISOString(),
        openai_status: health,
        features: {
          chat: true,
          markdown_support: true,
          math_rendering: true,
          conversation_storage: true,
          response_chaining: true,
          persistent_sessions: true
        }
      });
    } catch (error) {
      logger.error('Health check error:', error);
      res.status(500).json({
        status: 'unhealthy',
        error: error.message
      });
    }
  }

  /**
   * Get conversation list for a child
   */
  getConversations = async (req, res) => {
    try {
      const { childId } = req.params;
      const requestingChildId = req.child?.child_id;
      
      // Ensure child can only access their own conversations
      if (childId !== requestingChildId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
      
      // Get conversations from database
      const supabase = require('../utils/supabaseClient');
      const { data, error } = await supabase
        .from('conversation_sessions')
        .select('*')
        .eq('child_id', childId)
        .order('last_active', { ascending: false })
        .limit(20);
        
      if (error) {
        throw error;
      }
      
      res.json({
        success: true,
        conversations: data || []
      });
      
    } catch (error) {
      logger.error('Error getting conversations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get conversation list'
      });
    }
  }

  /**
   * Get recent conversations for sidebar (last 7 days)
   */
  getRecentConversations = async (req, res) => {
    try {
      const { childId } = req.params;
      const requestingChildId = req.child?.child_id;
      
      // Ensure child can only access their own conversations
      if (childId !== requestingChildId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
      
      console.log(`📚 Loading recent conversations for child: ${childId}`);
      
      // Get conversations from last 7 days with first message for preview
      const supabase = require('../utils/supabaseClient');
      const sevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)).toISOString();
      
      const { data: sessions, error: sessionError } = await supabase
        .from('conversation_sessions')
        .select(`
          id,
          session_id,
          topic,
          message_count,
          created_at,
          last_active,
          metadata
        `)
        .eq('child_id', childId)
        .gte('last_active', sevenDaysAgo)
        .order('last_active', { ascending: false })
        .limit(20);
      
      if (sessionError) {
        logger.warn('Error fetching conversation sessions:', sessionError.message);
        return res.json({
          success: true,
          conversations: []
        });
      }
      
      if (!sessions || sessions.length === 0) {
        console.log(`📭 No recent conversations found for child: ${childId}`);
        return res.json({
          success: true,
          conversations: []
        });
      }
      
      // Get first message for each session to use as title/preview
      const conversationsWithPreviews = await Promise.all(
        sessions.map(async (session) => {
          try {
            const { data: firstMessage, error: messageError } = await supabase
              .from('conversation_messages')
              .select('content')
              .eq('session_id', session.session_id)
              .eq('role', 'user')
              .order('created_at', { ascending: true })
              .limit(1);
            
            let title = 'Study Session';
            if (firstMessage && firstMessage.length > 0 && firstMessage[0].content) {
              // Use first 40 characters of first message as title
              title = firstMessage[0].content.substring(0, 40).trim();
              if (firstMessage[0].content.length > 40) {
                title += '...';
              }
            } else if (session.topic && session.topic !== 'Study Session') {
              title = session.topic;
            }
            
            console.log(`💬 Session ${session.session_id.slice(-10)}: title="${title}", hasMessage=${!!firstMessage?.[0]?.content}`);
            
            return {
              session_id: session.session_id,
              title,
              message_count: session.message_count || 0,
              created_at: session.created_at,
              last_active: session.last_active,
              preview: firstMessage?.[0]?.content?.substring(0, 60) || 'No messages'
            };
          } catch (error) {
            logger.warn(`Error getting preview for session ${session.session_id}:`, error.message);
            return {
              session_id: session.session_id,
              title: session.topic || 'Chat',
              message_count: session.message_count || 0,
              created_at: session.created_at,
              last_active: session.last_active,
              preview: 'Chat conversation'
            };
          }
        })
      );
      
      // Filter out conversations with no actual user messages
      const conversationsWithMessages = conversationsWithPreviews.filter(conversation => {
        // Keep conversations that have actual content (not just "No messages" or default titles)
        const hasRealMessages = conversation.preview && 
                              conversation.preview !== 'No messages' && 
                              conversation.preview !== 'Chat conversation' &&
                              conversation.preview.length > 0;
        
        console.log(`🔍 Session ${conversation.session_id.slice(-10)}: hasRealMessages=${hasRealMessages}, preview="${conversation.preview}"`);
        return hasRealMessages;
      });
      
      console.log(`📚 Retrieved ${conversationsWithPreviews.length} conversations, filtered to ${conversationsWithMessages.length} with actual messages`);
      
      res.json({
        success: true,
        conversations: conversationsWithMessages
      });
      
    } catch (error) {
      logger.error('Error getting recent conversations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get conversation list'
      });
    }
  }

  /**
   * Delete a specific conversation
   */
  deleteConversation = async (req, res) => {
    try {
      const { sessionId } = req.params;
      const requestingChildId = req.child?.child_id;
      
      console.log(`🗑️ Deleting conversation: ${sessionId}`);
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID is required'
        });
      }
      
      // Verify the conversation belongs to the requesting child
      const supabase = require('../utils/supabaseClient');
      const { data: session, error: sessionError } = await supabase
        .from('conversation_sessions')
        .select('child_id')
        .eq('session_id', sessionId)
        .single();
      
      if (sessionError || !session) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found'
        });
      }
      
      if (session.child_id !== requestingChildId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
      
      // Delete messages first (if table exists)
      try {
        const { error: messagesError } = await supabase
          .from('conversation_messages')
          .delete()
          .eq('session_id', sessionId);
          
        if (messagesError) {
          console.log(`⚠️ Could not delete messages for session ${sessionId}:`, messagesError.message);
        } else {
          console.log(`🗑️ Deleted messages for session ${sessionId.slice(-10)}`);
        }
      } catch (messagesErr) {
        console.log(`⚠️ Messages table may not exist:`, messagesErr.message);
      }
      
      // Delete session record
      const { error: deleteError } = await supabase
        .from('conversation_sessions')
        .delete()
        .eq('session_id', sessionId);
        
      if (deleteError) {
        logger.error(`Error deleting conversation session ${sessionId}:`, deleteError.message);
        return res.status(500).json({
          success: false,
          error: 'Failed to delete conversation'
        });
      }
      
      console.log(`✅ Successfully deleted conversation ${sessionId.slice(-10)}`);
      
      res.json({
        success: true,
        message: 'Conversation deleted successfully'
      });
      
    } catch (error) {
      logger.error('Error deleting conversation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete conversation'
      });
    }
  }

  /**
   * Get service statistics
   */
  getStats = async (req, res) => {
    try {
      const health = await simpleOpenAIService.getHealthStatus();
      
      res.json({
        success: true,
        stats: {
          active_sessions: health.activeSessions,
          model: health.model,
          features: health.features,
          uptime: process.uptime(),
          memory_usage: process.memoryUsage(),
          last_updated: health.timestamp
        }
      });
    } catch (error) {
      logger.error('Error getting stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get statistics'
      });
    }
  }

  /**
   * Trigger cleanup of empty conversations
   */
  cleanupEmptyConversations = async (req, res) => {
    try {
      console.log('🧹 Manual cleanup triggered for empty conversations');
      await simpleOpenAIService.cleanupEmptyConversations();
      
      res.json({
        success: true,
        message: 'Empty conversations cleanup completed'
      });
    } catch (error) {
      logger.error('Error during manual cleanup:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cleanup empty conversations'
      });
    }
  }

  /**
   * Get learning context for a child - includes incomplete assignments, recent progress
   */
  getLearningContext = async (req, res) => {
    try {
      const { childId } = req.params;
      const requestingChildId = req.child?.child_id;
      
      // Ensure child can only access their own learning context
      if (childId !== requestingChildId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
      
      logger.info(`Fetching learning context for child: ${childId}`);
      
      const context = await learningContextService.getLearningContextSummary(childId);
      
      res.json({
        success: true,
        context: {
          // New status-based categories
          currentWork: context.currentWork,
          upcoming: context.upcoming,
          needsReview: context.needsReview,
          
          // Legacy fields for backward compatibility
          nextAssignments: context.nextAssignments,
          recentProgress: context.recentProgress,
          needingGrades: context.needingGrades,
          hasActiveWork: context.hasActiveWork,
          hasRecentSuccess: context.hasRecentSuccess
        }
      });
      
    } catch (error) {
      logger.error('Error getting learning context:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get learning context'
      });
    }
  }

  /**
   * Get detailed context for a specific material
   */
  getMaterialContext = async (req, res) => {
    try {
      const { materialId } = req.params;
      const requestingChildId = req.child?.child_id;
      
      logger.info(`Fetching material context for: ${materialId}`);
      
      const materialContext = await learningContextService.getMaterialContext(materialId);
      
      // Verify the material belongs to the requesting child
      const materialChildId = materialContext?.child_subjects?.children?.id;
      if (materialChildId !== requestingChildId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this material'
        });
      }
      
      res.json({
        success: true,
        material: materialContext
      });
      
    } catch (error) {
      logger.error('Error getting material context:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get material context'
      });
    }
  }

  /**
   * Record a problem attempt for tracking student progress
   */
  recordProblemAttempt = async (req, res) => {
    try {
      const { materialId, problemNumber, isCorrect, timeSpent, studentWork } = req.body;
      const childId = req.child?.child_id;
      
      if (!materialId || problemNumber === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Material ID and problem number are required'
        });
      }
      
      logger.info(`Recording problem attempt: child ${childId}, material ${materialId}, problem ${problemNumber}`);
      
      // Store in problem_attempts table
      const supabase = require('../utils/supabaseClient');
      const { data, error } = await supabase
        .from('problem_attempts')
        .insert([{
          child_id: childId,
          material_id: materialId,
          problem_data: {
            problemNumber,
            timeSpent,
            studentWork
          },
          is_correct: isCorrect,
          time_spent_seconds: timeSpent,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) {
        logger.error('Error recording problem attempt:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to record problem attempt'
        });
      }
      
      res.json({
        success: true,
        attempt: data
      });
      
    } catch (error) {
      logger.error('Error recording problem attempt:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to record problem attempt'
      });
    }
  }

  /**
   * Generate quiz from assignment
   */
  generateQuiz = async (req, res) => {
    try {
      const { assignmentId, questionCount } = req.body;
      const childId = req.child.child_id;

      if (!assignmentId) {
        return res.status(400).json({
          success: false,
          error: 'Assignment ID is required'
        });
      }

      logger.info(`🧪 Generating quiz for assignment ${assignmentId}, child ${childId}`);

      // Get assignment with learning context
      const assignment = await learningContextService.getMaterialContext(assignmentId);
      
      if (!assignment) {
        return res.status(404).json({
          success: false,
          error: 'Assignment not found'
        });
      }

      // Verify child has access to this assignment
      if (assignment.child_subjects?.child_id !== childId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this assignment'
        });
      }

      // Generate quiz using AI service
      const quiz = await simpleOpenAIService.generateQuiz(assignment, questionCount);

      logger.info(`✅ Quiz generated successfully for assignment: ${assignment.title}`);

      res.json({
        success: true,
        quiz
      });

    } catch (error) {
      logger.error('Error generating quiz:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate quiz. Please try again.'
      });
    }
  }

  /**
   * Generate flashcards from assignment content
   */
  generateFlashcards = async (req, res) => {
    try {
      const { assignmentId, questionCount } = req.body;
      const childId = req.child.child_id;

      if (!assignmentId) {
        return res.status(400).json({
          success: false,
          error: 'Assignment ID is required'
        });
      }

      // Get assignment from database
      const { data: assignment, error: dbError } = await supabase
        .from('materials')
        .select(`
          *,
          child_subjects!inner(*, subjects(name))
        `)
        .eq('id', assignmentId)
        .eq('child_subjects.child_id', childId)
        .single();

      if (dbError || !assignment) {
        logger.error('Error fetching assignment for flashcards:', dbError);
        return res.status(404).json({
          success: false,
          error: 'Assignment not found or access denied'
        });
      }

      // Generate flashcards using OpenAI service
      const flashcards = await simpleOpenAIService.generateFlashcards(assignment, questionCount || 10);

      res.json({
        success: true,
        flashcards: flashcards.cards || [],
        title: flashcards.title,
        subject: flashcards.subject,
        assignmentId: assignmentId,
        assignmentTitle: assignment.title
      });

    } catch (error) {
      logger.error('Error generating flashcards:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate flashcards. Please try again.'
      });
    }
  }

  /**
   * Submit quiz attempt and record results
   */
  submitQuizAttempt = async (req, res) => {
    try {
      const { quizId, assignmentId, answers, score, totalQuestions, timeSpent } = req.body;
      const childId = req.child.child_id;

      if (!quizId || !assignmentId || !answers || score === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Quiz ID, assignment ID, answers, and score are required'
        });
      }

      logger.info(`📊 Recording quiz attempt: child ${childId}, assignment ${assignmentId}, score ${score}/${totalQuestions}`);

      // Store quiz attempt in database
      const attemptData = {
        child_id: childId,
        quiz_id: quizId,
        material_id: assignmentId,
        answers: JSON.stringify(answers), // Ensure answers are stored as JSON string
        score: score,
        total_questions: totalQuestions,
        time_spent_seconds: timeSpent || 0,
        completed_at: new Date().toISOString()
        // percentage is auto-calculated by database as GENERATED column
      };
      
      logger.info('📊 Attempting to save quiz data:', attemptData);
      
      const { data, error } = await supabase
        .from('quiz_attempts')
        .insert([attemptData])
        .select();

      if (error) {
        logger.error('Error saving quiz attempt:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to save quiz results'
        });
      }

      logger.info(`✅ Quiz attempt saved with ID: ${data[0].id}`);

      // Return success with attempt details
      res.json({
        success: true,
        attemptId: data[0].id,
        score,
        totalQuestions,
        percentage: Math.round((score / totalQuestions) * 100),
        timeSpent
      });

    } catch (error) {
      logger.error('Error submitting quiz attempt:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit quiz attempt'
      });
    }
  }

  /**
   * Get quiz history for a child
   */
  getQuizHistory = async (req, res) => {
    try {
      const { childId } = req.params;
      const requestingChildId = req.child.child_id;

      // Ensure child can only access their own quiz history
      if (childId !== requestingChildId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      logger.info(`📋 Fetching quiz history for child: ${childId}`);

      // Get quiz attempts with material details
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select(`
          *,
          materials!material_id(
            id,
            title,
            child_subjects!materials_child_subject_id_fkey(
              subjects!child_subjects_subject_id_fkey(name)
            )
          )
        `)
        .eq('child_id', childId)
        .order('completed_at', { ascending: false })
        .limit(50);

      if (error) {
        logger.error('Error fetching quiz history:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch quiz history'
        });
      }

      // Format response
      const quizHistory = data.map(attempt => ({
        id: attempt.id,
        quizId: attempt.quiz_id,
        assignmentTitle: attempt.materials?.title || 'Unknown Assignment',
        subject: attempt.materials?.child_subjects?.subjects?.name || 'General',
        score: attempt.score,
        totalQuestions: attempt.total_questions,
        percentage: attempt.percentage,
        timeSpent: attempt.time_spent_seconds,
        completedAt: attempt.completed_at
      }));

      logger.info(`📊 Found ${quizHistory.length} quiz attempts for child ${childId}`);

      res.json({
        success: true,
        quizHistory,
        totalAttempts: quizHistory.length
      });

    } catch (error) {
      logger.error('Error getting quiz history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get quiz history'
      });
    }
  }
}

module.exports = new SimpleTutorController();