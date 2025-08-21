const logger = require('../utils/logger')('tutorController');
const mcpClient = require('../services/mcpClientWrapper');
const contextService = require('../services/contextService');
const sessionMemoryService = require('../services/sessionMemoryService');
const OpenAI = require('openai');
const supabase = require('../utils/supabaseClient');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class TutorController {
  constructor() {
    // Initialize MCP client connection
    this.initializeMCP();
    // Cache for student subjects
    this.studentSubjectsCache = new Map();
    // Cache for student educational context
    this.studentContextCache = new Map();
  }
  
  async initializeMCP() {
    try {
      await mcpClient.connect();
      logger.info('MCP client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize MCP client:', error);
    }
  }
  handleChat = async (req, res) => {
    try {
      const { message, sessionHistory = [], previousResponseId, workspaceContext } = req.body;
      const childId = req.child.child_id;

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({
          error: 'Message is required and must be a non-empty string'
        });
      }

      // Log the incoming request
      logger.info(`Chat request from child ${childId}: ${message.substring(0, 100)}...`);


      // Get or create session context
      const sessionContext = await sessionMemoryService.getConversationContext(childId);
      
      // Store user message in session
      if (sessionContext.sessionId) {
        await sessionMemoryService.addMessage(sessionContext.sessionId, 'user', message);
      }

      // Fetch student's enrolled subjects at the start of the session
      await this.loadStudentSubjects(childId);
      
      // Pre-load educational context for better personalization
      if (!this.studentContextCache.has(childId)) {
        await this.preloadStudentContext(childId);
      }

      // Use session history if available, otherwise use passed sessionHistory
      const conversationHistory = sessionContext.hasHistory 
        ? sessionContext.messages 
        : sessionHistory;

      // Generate AI response with workspace and session context
      const result = await this.generateResponse(
        message, 
        conversationHistory, 
        previousResponseId, 
        childId, 
        req.child,
        sessionContext
      );

      // Store AI response in session
      if (sessionContext.sessionId) {
        await sessionMemoryService.addMessage(sessionContext.sessionId, 'assistant', result.response, {
          responseId: result.responseId
        });
      }

      res.json({
        success: true,
        response: result.response,
        responseId: result.responseId,
        sessionId: sessionContext.sessionId,
        hasHistory: sessionContext.hasHistory,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Chat error:', error);
      res.status(500).json({
        error: 'Something went wrong with the chat. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  generateResponse = async (message, sessionHistory = [], previousResponseId = null, childId = null, childData = null, sessionContext = null) => {
    try {
      
      // Build conversation history for context
      let input = '';
      
      // Add session continuity context if available
      if (sessionContext && sessionContext.hasHistory) {
        input += `[Continuing previous session from ${sessionContext.lastActivity}]\n\n`;
      }
      
      // Add recent conversation history
      const recentHistory = sessionHistory.slice(-10); // Keep more context for better learning continuity
      for (const msg of recentHistory) {
        const role = msg.type === 'user' || msg.role === 'user' ? 'Student' : 'Klio';
        input += `${role}: ${msg.content}\n`;
      }
      
      // Add current message
      input += `Student: ${message}\nKlio: `;

      // Pre-fetch educational context if needed
      let educationalContext = '';
      const shouldPreFetchContext = await this.shouldUseTools(message, childId);
      
      if (shouldPreFetchContext) {
        logger.info('Pre-fetching educational context for:', message.substring(0, 50));
        educationalContext = await this.getEducationalContext(message, childId);
        logger.info('Retrieved educational context:', educationalContext?.substring(0, 200) + '...');
      }

      // Build enhanced input with context if available
      let enhancedInput = input;
      if (educationalContext) {
        enhancedInput = input + `\n\n[STUDENT'S CURRENT COURSEWORK CONTEXT:\n${educationalContext}\n]\n\nKlio: `;
      }

      const requestBody = {
        model: 'gpt-5-nano',
        input: enhancedInput,
        reasoning: { effort: 'minimal' }, // Fast responses for tutoring
        text: { verbosity: 'medium' }, // Balanced educational content
        instructions: `You are Klio, a supportive AI tutor. You're warm and encouraging but professional - not overly casual like a buddy, but not formal like a strict teacher.

STUDENT: ${childData?.name || 'This student'} is in grade ${childData?.grade || 'elementary school'}.

MATH WORKSPACE INTEGRATION:
When students need math practice, create problems using this special format:
- Use the marker [WORKSPACE_START] at the beginning
- Provide a title like "Addition Practice" or "Factor Problems"  
- List the specific problems you want them to work on
- Use the marker [WORKSPACE_END] at the end
- This will automatically open an interactive workspace for the student

Example format:
[WORKSPACE_START]
**Addition Practice**

1. 14 + 7 = ?
2. 23 + 15 = ?
3. 36 + 9 = ?
[WORKSPACE_END]

CORE APPROACH:
- Always use the student's name when responding
- Be specific - reference actual assignments and scores when available  
- Give immediate, actionable help rather than making plans
- Celebrate achievements and encourage improvement
- Keep responses focused and helpful

RESPONSE PATTERNS:
When they ask "What should we work on":
- Pick ONE specific assignment and start immediately
- Example: "Hi Magda! Let's tackle your Echo and Narcissus Literature worksheet. Ready to dive into Greek mythology?"

When they ask about grades/review:
- Be specific about scores and encouraging
- Example: "Nice work on that 83% in Literature, Magda! Your Grammar could use some attention though. Which would you like to focus on?"

When they need subject help:
- Jump right into action with their actual coursework
- Create a workspace if it's math practice
- Example: "Perfect timing, Magda! Let's practice factors. I'll create some problems for you."

PERSONALITY:
- Encouraging: "You're making good progress!" 
- Specific: Reference actual assignments by name
- Supportive: Help them succeed without doing the work for them
- Professional but warm: Knowledgeable guide, not buddy or strict teacher

EDUCATIONAL CONTEXT:
If you see [STUDENT'S CURRENT COURSEWORK CONTEXT] in the conversation, use that information to provide personalized tutoring based on their actual assignments, lessons, and performance. Focus on what they're currently learning rather than asking generic questions.

WORKING WITH SPECIFIC ASSIGNMENTS:
When lesson content includes specific questions or tasks:
- Reference actual questions: "Let's start with question 1: 'Echo follows Hera and angers the goddess. What's the effect?'"
- Work through the material step by step
- Use the actual lesson content instead of making up examples
- Guide them through their real homework rather than generic practice

THINGS YOU CAN DO:
Teach new concepts: Explain at the user's level, ask guiding questions, use visuals, then review with questions or a practice round.
Help with homework: Don't simply give answers! Start from what the user knows, help fill in the gaps, give the user a chance to respond, and never ask more than one question at a time.
Practice together: Ask the user to summarize, pepper in little questions, have the user "explain it back" to you, or role-play. Correct mistakes — charitably! — in the moment.
Create math workspaces: Use create_subject_workspace when students need math practice.
Quizzes & test prep: Run practice quizzes. (One question at a time!) Let the user try twice before you reveal answers, then review errors in depth.

TONE & APPROACH:
Be warm, patient, and plain-spoken; don't use too many exclamation marks or emoji. Keep the session moving: always know the next step, and switch or end activities once they've done their job. And be brief — don't ever send essay-length responses. Aim for a good back-and-forth.

IMPORTANT:
DO NOT GIVE ANSWERS OR DO HOMEWORK FOR THE USER. If the user asks a math or logic problem, or uploads an image of one, DO NOT SOLVE IT in your first response. Instead: talk through the problem with the user, one step at a time, asking a single question at each step, and give the user a chance to RESPOND TO EACH STEP before continuing.`
      };

      // Add previous response ID for chain-of-thought continuity if available
      if (previousResponseId) {
        requestBody.previous_response_id = previousResponseId;
      }

      logger.info('Sending request to GPT-5-nano:', { 
        model: requestBody.model
      });

      const result = await openai.responses.create(requestBody);

      logger.info('GPT-5-nano response received:', { 
        responsePreview: result.output_text?.substring(0, 100) + '...',
        hasContext: !!educationalContext,
        hasFunctionCalls: !!result.function_calls?.length
      });

      return {
        response: result.output_text,
        responseId: result.id
      };

    } catch (error) {
      logger.error('OpenAI API error:', error);
      
      // Fallback response if OpenAI fails
      return {
        response: "I'm having trouble thinking right now, but I'm here to help! Could you try asking your question again? 🤔",
        responseId: null
      };
    }
  }

  getSessionHistory = async (req, res) => {
    try {
      const childId = req.child.child_id;
      
      logger.info(`Getting session history for child ${childId}`);
      
      const sessionData = await sessionMemoryService.getSessionMessages(childId);
      
      res.json({
        success: true,
        ...sessionData,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('Error getting session history:', error);
      res.status(500).json({
        error: 'Failed to get session history',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }



  // Load student's enrolled subjects from database
  loadStudentSubjects = async (childId) => {
    try {
      // Check cache first (expires after 5 minutes)
      const cached = this.studentSubjectsCache.get(childId);
      if (cached && cached.timestamp > Date.now() - 300000) {
        return cached.subjects;
      }

      // Fetch from database
      const { data, error } = await supabase
        .from('child_subjects')
        .select(`
          id,
          custom_subject_name_override,
          subject:subject_id (
            id,
            name
          )
        `)
        .eq('child_id', childId);

      if (error) {
        logger.error('Error fetching student subjects:', error);
        return [];
      }

      // Format subjects for easier matching
      const subjects = (data || []).map(assignment => {
        const customName = assignment.custom_subject_name_override || assignment.subject.name;
        const originalName = assignment.subject.name;
        
        // Create comprehensive variations for matching
        const variations = [
          customName.toLowerCase(),
          originalName.toLowerCase()
        ];
        
        // Add common abbreviations and variations
        if (originalName.toLowerCase().includes('mathematics')) {
          variations.push('math', 'maths');
        }
        if (originalName.toLowerCase().includes('english')) {
          variations.push('english language arts', 'ela', 'reading', 'writing');
        }
        if (originalName.toLowerCase().includes('science')) {
          variations.push('science', 'sciences');
        }
        if (originalName.toLowerCase().includes('history')) {
          variations.push('history', 'social studies');
        }
        if (originalName.toLowerCase().includes('literature')) {
          variations.push('literature', 'reading');
        }
        
        return {
          id: assignment.subject.id,
          name: customName,
          originalName: originalName,
          variations: variations
        };
      });

      // Cache the results
      this.studentSubjectsCache.set(childId, {
        subjects,
        timestamp: Date.now()
      });

      logger.info(`Loaded ${subjects.length} subjects for child ${childId}:`, subjects.map(s => s.name));
      return subjects;

    } catch (error) {
      logger.error('Error loading student subjects:', error);
      return [];
    }
  }

  // Determine if we should force tool usage based on message content
  shouldUseTools = async (message, childId) => {
    const lowerMessage = message.toLowerCase();
    
    // Get student's enrolled subjects
    const enrolledSubjects = this.studentSubjectsCache.get(childId)?.subjects || [];
    
    // Force tools for grade/progress questions
    if (lowerMessage.includes('grade') || 
        lowerMessage.includes('how am i doing') ||
        lowerMessage.includes('my progress') ||
        lowerMessage.includes('how are my') ||
        lowerMessage.includes('my performance') ||
        lowerMessage.includes('my scores')) {
      return true;
    }
    
    // Check if message mentions any enrolled subject
    if (lowerMessage.includes('help')) {
      for (const subject of enrolledSubjects) {
        // Check all variations of the subject name
        if (subject.variations.some(variation => lowerMessage.includes(variation))) {
          logger.info(`Detected enrolled subject "${subject.name}" in message`);
          return true;
        }
      }
    }
    
    // Force tools for work-related questions
    if (lowerMessage.includes('work on') || 
        lowerMessage.includes('homework') || 
        lowerMessage.includes('assignment') ||
        lowerMessage.includes('should we study') ||
        lowerMessage.includes('what should i') ||
        lowerMessage.includes('what should we') ||
        lowerMessage.includes('what should we learn') ||
        lowerMessage.includes('review') ||
        lowerMessage.includes('practice')) {
      return true;
    }
    
    return false;
  }

  // Fetch specific material content when assignments are mentioned
  fetchSpecificMaterialContent = async (message, childId) => {
    try {
      // Look for specific assignment names mentioned in the message
      const assignmentKeywords = ['echo and narcissus', 'order of operations', 'worksheet', 'assignment', 'homework'];
      const lowerMessage = message.toLowerCase();
      
      // Check if any specific assignments are mentioned
      for (const keyword of assignmentKeywords) {
        if (lowerMessage.includes(keyword)) {
          logger.info(`Fetching content for assignment: ${keyword}`);
          const content = await mcpClient.transport.callTool('get_material_content', {
            child_id: childId,
            material_identifier: keyword
          });
          
          if (content && !content.includes('not found')) {
            return content;
          }
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Error fetching specific material content:', error);
      return null;
    }
  }

  // Get educational context by calling MCP server directly
  getEducationalContext = async (message, childId) => {
    try {
      const lowerMessage = message.toLowerCase();
      
      // Get student's enrolled subjects
      const enrolledSubjects = this.studentSubjectsCache.get(childId)?.subjects || [];
      
      // First, try to fetch specific material content if assignment is mentioned
      const specificContent = await this.fetchSpecificMaterialContent(message, childId);
      if (specificContent) {
        logger.info('Found specific material content, using detailed lesson data');
        return specificContent;
      }
      
      // Handle review requests
      if (lowerMessage.includes('review') || lowerMessage.includes('practice')) {
        logger.info(`Getting performance review data for child ${childId}`);
        const result = await mcpClient.search(childId, '', 'performance_review');
        return result.fullContextText || 'No items found for review';
      }
      
      // Check if message mentions any enrolled subject for help
      if (lowerMessage.includes('help')) {
        for (const subject of enrolledSubjects) {
          // Check all variations of the subject name
          const mentioned = subject.variations.some(variation => lowerMessage.includes(variation));
          
          if (mentioned) {
            logger.info(`Getting ${subject.name} context for child ${childId}`);
            const result = await mcpClient.transport.callTool('get_subject_context', {
              child_id: childId,
              subject_name: subject.originalName // Use original name for MCP call
            });
            return result || `No ${subject.name} context found`;
          }
        }
      }
      
      // For grade/progress questions, get comprehensive data
      if (lowerMessage.includes('grade') || 
          lowerMessage.includes('how am i doing') ||
          lowerMessage.includes('my progress') ||
          lowerMessage.includes('how are my') ||
          lowerMessage.includes('my performance') ||
          lowerMessage.includes('my scores')) {
        
        logger.info(`Getting grade context for child ${childId}`);
        const searchResult = await mcpClient.search(childId, '', 'all');
        return searchResult.fullContextText || 'No grade data found';
      }
      
      // For general work questions, provide smart recommendations
      if (lowerMessage.includes('work on') || 
          lowerMessage.includes('homework') || 
          lowerMessage.includes('assignment') ||
          lowerMessage.includes('should we study') ||
          lowerMessage.includes('what should i') ||
          lowerMessage.includes('what should we') ||
          lowerMessage.includes('what should we learn')) {
        
        logger.info(`Getting smart learning recommendations for child ${childId}`);
        return await this.getSmartRecommendations(childId);
      }
      
      return '';
    } catch (error) {
      logger.error('Error getting educational context:', error);
      return '';
    }
  }

  // Pre-load comprehensive student context at session start
  preloadStudentContext = async (childId) => {
    try {
      logger.info(`Pre-loading comprehensive context for child ${childId}`);
      
      // Get all educational data
      const contextResult = await mcpClient.search(childId, '', 'all');
      const contextText = contextResult.fullContextText || '';
      
      // Cache the context with timestamp
      this.studentContextCache.set(childId, {
        context: contextText,
        timestamp: Date.now(),
        summary: this.extractContextSummary(contextText)
      });
      
      logger.info(`Pre-loaded context for child ${childId}: ${contextText.length} characters`);
    } catch (error) {
      logger.error('Error pre-loading student context:', error);
    }
  }

  // Extract key information from context for quick reference
  extractContextSummary = (contextText) => {
    const summary = {
      hasNextUp: contextText.includes('Next Up'),
      hasGrades: contextText.includes('Grade:') || contextText.includes('%'),
      subjectCount: (contextText.match(/\[\w+\]/g) || []).length,
      assignmentCount: (contextText.match(/\*\*.*?\*\*/g) || []).length
    };
    return summary;
  }

  // Provide intelligent learning recommendations based on completion status and grades
  getSmartRecommendations = async (childId) => {
    try {
      // First check for incomplete work
      const nextUpResult = await mcpClient.search(childId, '', 'next_up');
      const nextUpText = nextUpResult.fullContextText || '';
      
      // Check if there are incomplete items
      if (nextUpText.includes('Next Up') && !nextUpText.includes('No incomplete')) {
        logger.info(`Found incomplete work for child ${childId}`);
        return nextUpText;
      }
      
      // If everything is complete, provide smart suggestions
      logger.info(`All work complete for child ${childId}, checking performance and upcoming work`);
      
      // Get performance review data and completed work
      const [performanceResult, allDataResult] = await Promise.all([
        mcpClient.search(childId, '', 'performance_review'),
        mcpClient.search(childId, '', 'all')
      ]);
      
      const performanceText = performanceResult.fullContextText || '';
      const allDataText = allDataResult.fullContextText || '';
      
      let recommendations = `Great job, ${childData?.name || 'there'}! You're all caught up.\n\n`;
      
      // Check for items worth reviewing (low scores)
      if (performanceText.includes('Items Worth Reviewing')) {
        const reviewItems = performanceText.match(/- \*\*(.+?)\*\* \[(.+?)\] \((.+?)\) .+? (\d+)%/g);
        if (reviewItems && reviewItems.length > 0) {
          const firstItem = reviewItems[0];
          const titleMatch = firstItem.match(/\*\*(.+?)\*\*/);
          const subjectMatch = firstItem.match(/\((.+?)\)/);
          const scoreMatch = firstItem.match(/(\d+)%/);
          
          if (titleMatch && subjectMatch && scoreMatch) {
            const title = titleMatch[1];
            const subject = subjectMatch[1]; 
            const score = scoreMatch[1];
            
            recommendations += `I see you scored ${score}% on "${title}" in ${subject}. `;
            if (parseInt(score) < 60) {
              recommendations += `Let's strengthen this topic. Ready to practice?`;
            } else {
              recommendations += `Not bad, but we can make it even better. Want to review?`;
            }
          }
        } else {
          recommendations += "I found some areas we can improve. Which subject would you like to focus on?";
        }
      } else {
        // No low scores, suggest advancement
        recommendations += "You're doing really well! Want to get ahead on upcoming work or review a challenging topic?";
      }
      
      return recommendations;
      
    } catch (error) {
      logger.error('Error getting smart recommendations:', error);
      return 'Let me help you find what to work on next. What subject interests you today?';
    }
  }
}

module.exports = new TutorController();