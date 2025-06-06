Workspace Function Calling Implementation Plan
Overview
Replace the current inconsistent structured JSON workspace system with OpenAI Function Calling to give the LLM explicit tools for workspace management while maintaining backend control over state.
Current Problems to Solve

❌ LLM inconsistently creates workspace content
❌ Workspace gets reset accidentally
❌ No reliable progress tracking
❌ Structured JSON responses are unpredictable

Solution: Function Calling Architecture

✅ LLM uses explicit workspace tools
✅ Backend controls all workspace state
✅ Incremental updates without resets
✅ Reliable progress tracking

Phase 1: Backend Function Calling Setup
1.1 Define Workspace Tools Schema
File: backend/src/utils/workspaceTools.js
javascriptconst WORKSPACE_TOOLS = [
  {
    type: "function",
    function: {
      name: "create_math_workspace",
      description: "Create a new math practice workspace with problems",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Title for the workspace (e.g., 'Fraction Multiplication Practice')"
          },
          problems: {
            type: "array",
            description: "Array of math problems to practice",
            items: {
              type: "object",
              properties: {
                text: {
                  type: "string", 
                  description: "The math problem text (e.g., '4 × 2/3')"
                },
                type: {
                  type: "string",
                  enum: ["addition", "subtraction", "multiplication", "division", "fractions", "decimals", "word_problem"],
                  description: "Type of math problem"
                },
                hint: {
                  type: "string",
                  description: "Helpful hint for solving this problem"
                },
                difficulty: {
                  type: "string", 
                  enum: ["easy", "medium", "hard"],
                  description: "Difficulty level"
                }
              },
              required: ["text", "type", "hint"]
            }
          },
          explanation: {
            type: "string",
            description: "Brief explanation of the concept being practiced"
          }
        },
        required: ["title", "problems"]
      }
    }
  },
  {
    type: "function", 
    function: {
      name: "add_problems_to_workspace",
      description: "Add more problems to the existing workspace without resetting progress",
      parameters: {
        type: "object",
        properties: {
          problems: {
            type: "array",
            description: "Additional problems to add",
            items: {
              type: "object",
              properties: {
                text: { type: "string" },
                type: { 
                  type: "string",
                  enum: ["addition", "subtraction", "multiplication", "division", "fractions", "decimals", "word_problem"]
                },
                hint: { type: "string" },
                difficulty: {
                  type: "string",
                  enum: ["easy", "medium", "hard"] 
                }
              },
              required: ["text", "type", "hint"]
            }
          }
        },
        required: ["problems"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "mark_problem_correct",
      description: "Mark a specific problem as correct when student shows right work",
      parameters: {
        type: "object",
        properties: {
          problem_index: {
            type: "integer",
            description: "Index of the problem to mark correct (0-based)"
          },
          feedback: {
            type: "string", 
            description: "Positive feedback message for the student"
          }
        },
        required: ["problem_index"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "mark_problem_incorrect", 
      description: "Mark a problem as incorrect and provide guidance",
      parameters: {
        type: "object",
        properties: {
          problem_index: {
            type: "integer",
            description: "Index of the problem to mark incorrect (0-based)"
          },
          guidance: {
            type: "string",
            description: "Helpful guidance for the student to try again"
          }
        },
        required: ["problem_index"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "clear_workspace",
      description: "Clear the current workspace (use sparingly, only when starting completely new topic)",
      parameters: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            description: "Reason for clearing workspace"
          }
        }
      }
    }
  }
];

module.exports = { WORKSPACE_TOOLS };
1.2 Create Function Call Handlers
File: backend/src/utils/workspaceFunctionHandlers.js
javascriptconst { progressService } = require('../services/progressService');

class WorkspaceFunctionHandlers {
  constructor() {
    this.currentWorkspace = null;
    this.sessionId = null;
  }

  async handleCreateMathWorkspace(args, childId) {
    console.log('🎯 Creating new math workspace:', args.title);
    
    // Start new practice session
    try {
      const sessionResponse = await progressService.startSession('practice', args.problems.length);
      this.sessionId = sessionResponse.session.id;
    } catch (error) {
      console.warn('Failed to start practice session, using local tracking');
      this.sessionId = `local-${Date.now()}`;
    }

    // Create workspace structure
    const workspace = {
      type: 'math_problems',
      title: args.title,
      explanation: args.explanation || null,
      sessionId: this.sessionId,
      problems: args.problems.map((problem, index) => ({
        id: `problem-${Date.now()}-${index}`,
        index: index,
        text: problem.text,
        type: problem.type,
        hint: problem.hint,
        difficulty: problem.difficulty || 'medium',
        status: 'pending', // pending, checking, correct, incorrect, helped
        studentWork: null,
        feedback: null
      })),
      stats: {
        totalProblems: args.problems.length,
        completed: 0,
        correct: 0,
        streak: 0,
        bestStreak: 0
      },
      createdAt: new Date().toISOString()
    };

    this.currentWorkspace = workspace;
    
    return {
      action: 'create_workspace',
      workspace: workspace,
      message: `Created "${args.title}" with ${args.problems.length} problems`
    };
  }

  async handleAddProblemsToWorkspace(args, childId) {
    if (!this.currentWorkspace) {
      return {
        action: 'error',
        message: 'No active workspace to add problems to'
      };
    }

    console.log(`➕ Adding ${args.problems.length} problems to workspace`);

    const newProblems = args.problems.map((problem, index) => ({
      id: `problem-${Date.now()}-${index}`,
      index: this.currentWorkspace.problems.length + index,
      text: problem.text,
      type: problem.type, 
      hint: problem.hint,
      difficulty: problem.difficulty || 'medium',
      status: 'pending',
      studentWork: null,
      feedback: null
    }));

    this.currentWorkspace.problems.push(...newProblems);
    this.currentWorkspace.stats.totalProblems += args.problems.length;

    return {
      action: 'add_problems',
      newProblems: newProblems,
      workspace: this.currentWorkspace,
      message: `Added ${args.problems.length} more problems to practice`
    };
  }

  async handleMarkProblemCorrect(args, childId) {
    if (!this.currentWorkspace) {
      return { action: 'error', message: 'No active workspace' };
    }

    const problem = this.currentWorkspace.problems[args.problem_index];
    if (!problem) {
      return { action: 'error', message: 'Problem not found' };
    }

    console.log(`✅ Marking problem ${args.problem_index} correct`);

    // Update problem status
    problem.status = 'correct';
    problem.feedback = args.feedback || 'Correct! Great work! 🎉';

    // Update stats
    if (problem.status !== 'correct') { // Only count if wasn't already correct
      this.currentWorkspace.stats.completed++;
      this.currentWorkspace.stats.correct++;
      this.currentWorkspace.stats.streak++;
      this.currentWorkspace.stats.bestStreak = Math.max(
        this.currentWorkspace.stats.bestStreak,
        this.currentWorkspace.stats.streak
      );
    }

    // Record in progress service
    if (this.sessionId && this.sessionId.startsWith('practice-')) {
      try {
        await progressService.recordAttempt(
          this.sessionId,
          problem.text,
          true, // is_correct
          problem.studentWork || '',
          problem.type
        );
      } catch (error) {
        console.warn('Failed to record correct attempt:', error);
      }
    }

    return {
      action: 'mark_correct',
      problemIndex: args.problem_index,
      problem: problem,
      workspace: this.currentWorkspace,
      message: `Problem ${args.problem_index + 1} marked correct!`
    };
  }

  async handleMarkProblemIncorrect(args, childId) {
    if (!this.currentWorkspace) {
      return { action: 'error', message: 'No active workspace' };
    }

    const problem = this.currentWorkspace.problems[args.problem_index];
    if (!problem) {
      return { action: 'error', message: 'Problem not found' };
    }

    console.log(`❌ Marking problem ${args.problem_index} incorrect`);

    // Update problem status
    problem.status = 'incorrect';
    problem.feedback = args.guidance || 'Not quite right. Try again! 💪';

    // Reset streak on incorrect answer
    this.currentWorkspace.stats.streak = 0;

    // Record in progress service
    if (this.sessionId && this.sessionId.startsWith('practice-')) {
      try {
        await progressService.recordAttempt(
          this.sessionId,
          problem.text,
          false, // is_correct
          problem.studentWork || '',
          problem.type
        );
      } catch (error) {
        console.warn('Failed to record incorrect attempt:', error);
      }
    }

    return {
      action: 'mark_incorrect',
      problemIndex: args.problem_index,
      problem: problem,
      workspace: this.currentWorkspace,
      message: `Problem ${args.problem_index + 1} needs more work`
    };
  }

  async handleClearWorkspace(args, childId) {
    console.log('🗑️ Clearing workspace:', args.reason);
    
    const oldWorkspace = this.currentWorkspace;
    this.currentWorkspace = null;
    this.sessionId = null;

    return {
      action: 'clear_workspace',
      reason: args.reason,
      message: 'Workspace cleared',
      previousWorkspace: oldWorkspace
    };
  }

  getCurrentWorkspace() {
    return this.currentWorkspace;
  }

  updateStudentWork(problemIndex, work) {
    if (this.currentWorkspace && this.currentWorkspace.problems[problemIndex]) {
      this.currentWorkspace.problems[problemIndex].studentWork = work;
      this.currentWorkspace.problems[problemIndex].status = 'checking';
    }
  }
}

// Singleton instance per session (you might want to make this per-child)
const workspaceHandlers = new Map(); // childId -> WorkspaceFunctionHandlers

function getWorkspaceHandler(childId) {
  if (!workspaceHandlers.has(childId)) {
    workspaceHandlers.set(childId, new WorkspaceFunctionHandlers());
  }
  return workspaceHandlers.get(childId);
}

module.exports = { WorkspaceFunctionHandlers, getWorkspaceHandler };
1.3 Update Chat Controller with Function Calling
File: backend/src/controllers/chatController.js (Major changes)
javascript// Add imports
const { WORKSPACE_TOOLS } = require('../utils/workspaceTools');
const { getWorkspaceHandler } = require('../utils/workspaceFunctionHandlers');

// Update the main chat handler
exports.chat = async (req, res) => {
  const childId = req.child?.child_id;
  const { message, sessionHistory = [], lessonContext = null } = req.body;
  const mcpContext = req.mcpContext;

  console.log('\n🤖 === FUNCTION CALLING CHAT SESSION START ===');
  console.log(`Child ID: ${childId}`);
  console.log(`Message: "${message}"`);

  if (!childId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const { currentDate, currentTime, today } = getCurrentDateInfo();

    // Get child info and learning context (same as before)
    const { data: child } = await supabase
      .from('children')
      .select('name, grade')
      .eq('id', childId)
      .single();

    // Get workspace handler for this child
    const workspaceHandler = getWorkspaceHandler(childId);
    const currentWorkspace = workspaceHandler.getCurrentWorkspace();

    // Enhanced context for function calling
    let workspaceContext = '';
    if (currentWorkspace) {
      workspaceContext = `\n\n**CURRENT WORKSPACE CONTEXT:**
      - Active workspace: "${currentWorkspace.title}"
      - Total problems: ${currentWorkspace.stats.totalProblems}
      - Completed: ${currentWorkspace.stats.completed}
      - Current streak: ${currentWorkspace.stats.streak}
      - Best streak: ${currentWorkspace.stats.bestStreak}
      
      **IMPORTANT WORKSPACE RULES:**
      - Use "add_problems_to_workspace" to add more problems to existing workspace
      - Use "mark_problem_correct" when student shows correct work
      - Use "mark_problem_incorrect" when student makes mistakes  
      - Only use "create_math_workspace" when starting completely new topic
      - Only use "clear_workspace" when student explicitly wants to start over`;
    }

    // Build enhanced system prompt with function calling guidance
    const systemPrompt = ENHANCED_SYSTEM_PROMPT
      .replace(/{currentDate}/g, currentDate)
      .replace(/{currentTime}/g, currentTime)
      .replace('{childName}', child?.name || 'Friend')
      .replace('{childGrade}', child?.grade || 'Elementary')
      .replace('{subjects}', subjects)
      .replace('{learningContext}', formattedLearningContext) + 
      `\n\n**FUNCTION CALLING INSTRUCTIONS:**
      
      You have access to workspace tools for creating interactive math practice:
      
      **When to create NEW workspace:**
      - Student asks for practice problems on a new topic
      - Student says "let's practice [topic]"
      - You want to give them structured problems to work on
      
      **When to ADD to existing workspace:**
      - Student wants more problems on same topic
      - Student says "give me more" or "another one"
      - Current workspace has related problems
      
      **When to mark problems correct/incorrect:**
      - Student shows their work and asks you to check it
      - You can see their answer is right/wrong
      - Student asks "is this correct?"
      
      **Function calling examples:**
      - create_math_workspace: When starting fraction practice
      - add_problems_to_workspace: When they want more fraction problems  
      - mark_problem_correct: When they solve 4×2/3 correctly
      - mark_problem_incorrect: When they make calculation errors
      
      Always use functions when appropriate - they create better learning experiences!
      ${workspaceContext}`;

    // Prepare conversation with function calling
    const recentHistory = sessionHistory.slice(-8);
    const openaiMessages = [
      {
        role: "system",
        content: systemPrompt
      },
      ...recentHistory.map(msg => ({
        role: msg.role === 'klio' ? 'assistant' : 'user',
        content: msg.content
      })),
      {
        role: "user", 
        content: message
      }
    ];

    // Call OpenAI with function calling
    console.log('🎯 Requesting response with function calling...');
    
    let response;
    try {
      response = await openai.chat.completions.create({
        model: "gpt-4o", // Function calling works better on gpt-4o
        messages: openaiMessages,
        temperature: 0.7,
        max_tokens: 1024,
        tools: WORKSPACE_TOOLS,
        tool_choice: "auto" // Let LLM decide when to use tools
      });
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError);
      return res.status(503).json({
        error: "Oops! Klio is taking a quick nap. Please try again in a moment! 😴",
        code: 'AI_UNAVAILABLE'
      });
    }

    const responseMessage = response.choices[0].message;
    const toolCalls = responseMessage.tool_calls;
    
    console.log(`📨 Received response with ${toolCalls?.length || 0} function calls`);

    // Process function calls
    let workspaceActions = [];
    if (toolCalls && toolCalls.length > 0) {
      console.log('🔧 Processing function calls...');
      
      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        
        console.log(`📞 Calling function: ${functionName}`, functionArgs);
        
        let result;
        switch (functionName) {
          case 'create_math_workspace':
            result = await workspaceHandler.handleCreateMathWorkspace(functionArgs, childId);
            break;
          case 'add_problems_to_workspace':
            result = await workspaceHandler.handleAddProblemsToWorkspace(functionArgs, childId);
            break;
          case 'mark_problem_correct':
            result = await workspaceHandler.handleMarkProblemCorrect(functionArgs, childId);
            break;
          case 'mark_problem_incorrect':
            result = await workspaceHandler.handleMarkProblemIncorrect(functionArgs, childId);
            break;
          case 'clear_workspace':
            result = await workspaceHandler.handleClearWorkspace(functionArgs, childId);
            break;
          default:
            console.warn(`Unknown function: ${functionName}`);
            result = { action: 'error', message: `Unknown function: ${functionName}` };
        }
        
        workspaceActions.push(result);
        console.log(`✅ Function result:`, result.action);
      }
    }

    // Update learning memories (same as before)
    await updateLearningMemories(childId, message, responseMessage.content, mcpContext, learningProfile);

    // Log interaction with function calling info
    try {
      await supabase
        .from('chat_interactions')
        .insert([{
          child_id: childId,
          message_count: 1,
          ai_provider: 'openai',
          interaction_at: new Date().toISOString(),
          has_lesson_context: !!(mcpContext?.currentFocus || mcpContext?.allMaterials?.length > 0),
          has_overdue_assignments: mcpContext?.overdue?.length > 0,
          has_memory_context: recentMemories.length > 0,
          has_workspace_content: workspaceActions.length > 0,
          response_type: 'function_calling',
          function_calls_count: toolCalls?.length || 0,
          workspace_actions: workspaceActions.length > 0 ? workspaceActions.map(a => a.action) : null
        }]);
    } catch (logError) {
      console.error('Failed to log interaction:', logError);
    }

    console.log('\n✅ === FUNCTION CALLING CHAT SESSION COMPLETE ===');
    console.log(`Response Length: ${responseMessage.content?.length || 0} characters`);
    console.log(`Function Calls: ${toolCalls?.length || 0}`);
    console.log(`Workspace Actions: ${workspaceActions.length}`);

    // Return enhanced response with workspace actions
    res.json({
      success: true,
      message: responseMessage.content,
      timestamp: new Date().toISOString(),
      provider: 'openai',
      workspaceActions: workspaceActions, // New: Function call results
      currentWorkspace: workspaceHandler.getCurrentWorkspace(), // New: Current workspace state
      debugInfo: {
        currentDate,
        hasOverdueAssignments: mcpContext?.overdue?.length > 0,
        totalMaterials: mcpContext?.allMaterials?.length || 0,
        contextLength: formattedLearningContext.length,
        functionCallsCount: toolCalls?.length || 0,
        workspaceActionsCount: workspaceActions.length,
        hadExistingWorkspace: !!currentWorkspace
      }
    });

  } catch (error) {
    console.error('💥 === FUNCTION CALLING CHAT SESSION ERROR ===');
    console.error('Error:', error);
    res.status(500).json({
      error: "Sorry! Klio got a bit confused. Can you try asking again? 🤔",
      code: 'CHAT_ERROR'
    });
  }
};

Phase 2: Frontend Function Call Handling
2.1 Update Chat Service
File: klioai-frontend/src/utils/chatService.js
javascriptclass ChatService {
  // ... existing code ...

  async sendMessage(message, sessionHistory = [], lessonContext = null) {
    try {
      console.log('📤 Sending message to function calling endpoint...');
      
      const response = await this.api.post('/message', {
        message,
        sessionHistory: sessionHistory.slice(-10),
        lessonContext
      });

      console.log('📥 Received function calling response:', {
        hasMessage: !!response.data.message,
        workspaceActionsCount: response.data.workspaceActions?.length || 0,
        currentWorkspace: !!response.data.currentWorkspace
      });

      // Enhanced response structure for function calling
      return {
        message: response.data.message,
        timestamp: response.data.timestamp,
        lessonContext: response.data.lessonContext,
        // NEW: Function calling results
        workspaceActions: response.data.workspaceActions || [],
        currentWorkspace: response.data.currentWorkspace || null,
        // Debug info
        debugInfo: response.data.debugInfo,
      };
    } catch (error) {
      console.error('❌ Function calling chat service error:', error);
      
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error('Failed to send message. Please try again!');
    }
  }
}
2.2 Create Workspace Action Processor
File: klioai-frontend/src/utils/workspaceActionProcessor.js
javascript// Process workspace actions from function calls
export class WorkspaceActionProcessor {
  constructor(setWorkspaceContent, workspaceRef) {
    this.setWorkspaceContent = setWorkspaceContent;
    this.workspaceRef = workspaceRef;
  }

  processWorkspaceActions(actions, currentWorkspace) {
    if (!actions || actions.length === 0) {
      return null;
    }

    console.log(`🔄 Processing ${actions.length} workspace actions`);

    let updatedWorkspace = currentWorkspace;

    actions.forEach((action, index) => {
      console.log(`Processing action ${index + 1}:`, action.action);

      switch (action.action) {
        case 'create_workspace':
          updatedWorkspace = this.handleCreateWorkspace(action);
          break;
        
        case 'add_problems':
          updatedWorkspace = this.handleAddProblems(action, updatedWorkspace);
          break;
          
        case 'mark_correct':
          this.handleMarkCorrect(action);
          break;
          
        case 'mark_incorrect':
          this.handleMarkIncorrect(action);
          break;
          
        case 'clear_workspace':
          updatedWorkspace = null;
          break;
          
        case 'error':
          console.error('Workspace action error:', action.message);
          break;
          
        default:
          console.warn('Unknown workspace action:', action.action);
      }
    });

    return updatedWorkspace;
  }

  handleCreateWorkspace(action) {
    console.log('✨ Creating new workspace:', action.workspace.title);
    
    const workspaceContent = {
      type: 'function_calling_workspace',
      title: action.workspace.title,
      explanation: action.workspace.explanation,
      sessionId: action.workspace.sessionId,
      problems: action.workspace.problems.map((problem, index) => ({
        id: problem.id,
        index: problem.index,
        text: problem.text,
        type: problem.type,
        hint: problem.hint,
        difficulty: problem.difficulty,
        status: problem.status,
        feedback: problem.feedback,
        isFunctionControlled: true // Mark as function-controlled
      })),
      stats: action.workspace.stats,
      createdAt: action.workspace.createdAt
    };

    this.setWorkspaceContent(workspaceContent);
    return action.workspace;
  }

  handleAddProblems(action, currentWorkspace) {
    console.log(`➕ Adding ${action.newProblems.length} problems to workspace`);
    
    // Update the existing workspace content
    this.setWorkspaceContent(prevContent => {
      if (!prevContent) return prevContent;
      
      const newProblems = action.newProblems.map(problem => ({
        id: problem.id,
        index: problem.index,
        text: problem.text,
        type: problem.type,
        hint: problem.hint,
        difficulty: problem.difficulty,
        status: problem.status,
        feedback: problem.feedback,
        isFunctionControlled: true
      }));

      return {
        ...prevContent,
        problems: [...prevContent.problems, ...newProblems],
        stats: action.workspace.stats
      };
    });

    return action.workspace;
  }

  handleMarkCorrect(action) {
    console.log(`✅ Marking problem ${action.problemIndex} as correct`);
    
    // Update workspace content
    this.setWorkspaceContent(prevContent => {
      if (!prevContent) return prevContent;
      
      const updatedProblems = [...prevContent.problems];
      if (updatedProblems[action.problemIndex]) {
        updatedProblems[action.problemIndex] = {
          ...updatedProblems[action.problemIndex],
          status: 'correct',
          feedback: action.problem.feedback
        };
      }

      return {
        ...prevContent,
        problems: updatedProblems,
        stats: action.workspace.stats
      };
    });

    // Also update via workspace ref if available
    if (this.workspaceRef?.current?.markProblemCorrect) {
      this.workspaceRef.current.markProblemCorrect(action.problem.id);
    }
  }

  handleMarkIncorrect(action) {
    console.log(`❌ Marking problem ${action.problemIndex} as incorrect`);
    
    // Update workspace content
    this.setWorkspaceContent(prevContent => {
      if (!prevContent) return prevContent;
      
      const updatedProblems = [...prevContent.problems];
      if (updatedProblems[action.problemIndex]) {
        updatedProblems[action.problemIndex] = {
          ...updatedProblems[action.problemIndex],
          status: 'incorrect',
          feedback: action.problem.feedback
        };
      }

      return {
        ...prevContent,
        problems: updatedProblems,
        stats: action.workspace.stats
      };
    });

    // Also update via workspace ref if available
    if (this.workspaceRef?.current?.markProblemIncorrect) {
      this.workspaceRef.current.markProblemIncorrect(action.problem.id);
    }
  }
}
2.3 Update Chat Page with Function Calling
File: klioai-frontend/src/app/chat/page.js (Updated sections)
javascript// Add import
import { WorkspaceActionProcessor } from '../../utils/workspaceActionProcessor';

export default function ChatPage() {
  // ... existing state ...
  
  // Add workspace action processor
  const workspaceActionProcessorRef = useRef(null);
  
  useEffect(() => {
    // Initialize workspace action processor
    workspaceActionProcessorRef.current = new WorkspaceActionProcessor(
      setWorkspaceContent,
      workspaceRef
    );
  }, []);

  const handleSendMessage = async (messageText) => {
    if (!messageText.trim() || isLoading) return;
    
    setShowSuggestions(false);
    
    const userMessage = {
      id: `msg-${Date.now()}-child`,
      role: 'child',
      content: messageText,
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsKlioTyping(true);
    setIsLoading(true);

    try {
      // ENHANCED: Use function calling chat service
      const response = await chatService.sendMessage(messageText, messages.slice(-10), currentLessonContext);

      console.log('📨 Received function calling response:', {
        workspaceActionsCount: response.workspaceActions?.length || 0,
        hasCurrentWorkspace: !!response.currentWorkspace
      });

      const klioMessage = {
        id: `msg-${Date.now()}-klio`,
        role: 'klio',
        content: response.message,
        timestamp: response.timestamp || new Date().toISOString(),
        lessonContext: response.lessonContext || null,
        // NEW: Store function calling results
        workspaceActions: response.workspaceActions || [],
        currentWorkspace: response.currentWorkspace || null,
      };
      
      setMessages(prev => [...prev, klioMessage]);

      // Handle lesson context
      if (response.lessonContext) {
        setCurrentLessonContext(response.lessonContext);
      }

      // ENHANCED: Process function calling workspace actions
      if (response.workspaceActions && response.workspaceActions.length > 0) {
        console.log('🎯 Processing workspace actions from function calls');
        
        const processor = workspaceActionProcessorRef.current;
        if (processor) {
          const updatedWorkspace = processor.processWorkspaceActions(
            response.workspaceActions,
            response.currentWorkspace
          );
          
          console.log('✅ Workspace updated via function calls');
        }
      } else {
        console.log('📝 No workspace actions in response');
      }

      // REMOVED: Auto-progress detection (now handled by function calls)
      // The LLM now explicitly calls mark_problem_correct/incorrect functions

   } catch (error) {
     console.error('Chat error:', error);
     setMessages(prev => [...prev, {
       id: `msg-${Date.now()}-error`,
       role: 'klio',
       content: error.message || "I'm having a little trouble. Please try again. 🛠️",
       timestamp: new Date().toISOString(),
       isError: true,
     }]);
   } finally {
     setIsKlioTyping(false);
     setIsLoading(false);
   }
 };

 // Rest of component remains the same...
2.4 Update Workspace Panel for Function Calling
File: klioai-frontend/src/components/WorkspacePanel.js (Key updates)
javascriptconst WorkspacePanel = forwardRef(({ workspaceContent, onToggleSize, isExpanded, onClose, onSendToChat }, ref) => {
  // ... existing state ...
  
  // NEW: Detect function-controlled workspace
  const isFunctionControlled = workspaceContent?.type === 'function_calling_workspace';
  
  // Initialize session state differently for function-controlled workspaces
  useEffect(() => {
    if (workspaceContent && workspaceContent.problems?.length > 0) {
      if (isFunctionControlled) {
        console.log('🎯 Initializing function-controlled workspace session...');
        
        // Use existing session data from function calls
        setSessionState({
          sessionId: workspaceContent.sessionId,
          problems: workspaceContent.problems,
          completedProblems: new Set(
            workspaceContent.problems
              .filter(p => p.status === 'correct')
              .map(p => p.id)
          ),
          currentProblemIndex: workspaceContent.problems.findIndex(p => p.status === 'pending') || 0,
          sessionStartTime: new Date(workspaceContent.createdAt).getTime(),
          totalCorrect: workspaceContent.stats.correct,
          totalAttempts: workspaceContent.stats.completed,
          streak: workspaceContent.stats.streak,
          bestStreak: workspaceContent.stats.bestStreak
        });
        
        // Set problem states from function call data
        const initialStates = {};
        workspaceContent.problems.forEach(problem => {
          initialStates[problem.id] = problem.status;
        });
        setProblemStates(initialStates);
        
      } else {
        // Legacy workspace initialization (existing code)
        const startNewSession = async () => {
          // ... existing session start code ...
        };
        startNewSession();
      }
    }
  }, [workspaceContent, isFunctionControlled]);

  // Enhanced problem rendering with function call feedback
  const renderMathProblem = (problem, index) => {
    const isCompleted = problem.status === 'correct';
    const isCurrent = index === sessionState.currentProblemIndex;
    const status = problem.status;
    
    return (
      <motion.div
        key={problem.id}
        id={`problem-${problem.id}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className={`bg-white border-2 rounded-xl p-6 mb-4 shadow-lg transition-all duration-300 ${
          isCurrent ? 'ring-2 ring-blue-400 border-blue-400' : 
          isCompleted ? 'border-green-400 bg-green-50' : 'border-gray-200'
        }`}
      >
        {/* Problem Header with Function Call Status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {getStatusIndicator(problem.id)}
              <span className={`text-lg font-bold ${isCompleted ? 'text-green-600' : 'text-gray-800'}`}>
                Problem {index + 1}
              </span>
              {isFunctionControlled && (
                <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                  AI Managed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Problem Statement */}
        <div className="mb-6">
          <div className={`p-6 rounded-xl border-2 text-center ${
            isCompleted ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="text-4xl font-bold text-gray-800">
              {problem.text}
            </div>
          </div>
        </div>

        {/* Work Area - enhanced for function calling */}
        {!isCompleted && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-600 flex items-center">
                <FiEdit3 size={14} className="mr-2" />
                Your Work:
              </h4>
              <div className="flex items-center space-x-2">
                {workNotes[problem.id]?.trim() && status !== 'checking' && (
                  <button
                    onClick={() => sendWorkToChat(index, problem.text, workNotes[problem.id])}
                    className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full hover:bg-green-200 transition-colors flex items-center space-x-1 border border-green-300"
                    title="Send your work to Klio for checking"
                  >
                    <FiSend size={12} />
                    <span>Check My Work</span>
                  </button>
                )}
              </div>
            </div>

            <textarea
              value={workNotes[problem.id] || ''}
              onChange={(e) => {
                setWorkNotes(prev => ({ ...prev, [problem.id]: e.target.value }));
                // Update student work in function calling system
                if (isFunctionControlled) {
                  // This could trigger a backend update if needed
                }
              }}
              placeholder="Show your work here..."
              disabled={status === 'checking'}
              className={`w-full h-32 p-4 border-2 rounded-lg bg-white font-mono text-gray-800 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                status === 'checking' ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            />
          </div>
        )}

        {/* Enhanced Feedback Area with Function Call Results */}
        {status === 'correct' && problem.feedback && (
          <div className="p-4 bg-green-100 border border-green-300 rounded-lg text-green-800">
            <FiCheckCircle className="inline-block mr-2" />
            <strong>{problem.feedback}</strong>
          </div>
        )}
        
        {status === 'incorrect' && problem.feedback && (
          <div className="p-4 bg-red-100 border border-red-300 rounded-lg text-red-800">
            <FiX className="inline-block mr-2" />
            <strong>{problem.feedback}</strong>
          </div>
        )}

        {/* Hint */}
        {problem.hint && !isCompleted && (
          <div className="text-sm p-4 bg-blue-50 border-l-4 border-blue-400 rounded-lg mt-4">
            <strong className="text-blue-600">💡 Hint:</strong> {problem.hint}
          </div>
        )}
      </motion.div>
    );
  };

  // Enhanced send work to chat for function calling
  const sendWorkToChat = (problemIndex, problemText, workNote) => {
    if (!workNote.trim()) return;
    
    const problem = sessionState.problems[problemIndex];
    
    // Enhanced message for function calling system
    const message = isFunctionControlled 
      ? `Can you check my work on Problem ${problemIndex + 1}?\n\nProblem: ${problemText}\nMy work: ${workNote}\n\n[Problem Index: ${problemIndex}]`
      : `Can you check my work on Problem ${problemIndex + 1} from this session?\n\nProblem: ${problemText}\nMy work: ${workNote}`;
    
    // Update state to show we're checking
    setProblemStates(prev => ({
      ...prev,
      [problem.id]: 'checking'
    }));
    
    if (onSendToChat) {
      onSendToChat(message, {
        type: 'check_work',
        sessionId: sessionState.sessionId,
        problemId: problem.id,
        problemIndex: problemIndex,
        studentWork: workNote,
        problemText: problemText,
        isFunctionControlled: isFunctionControlled
      });
    }
  };

  // ... rest of component remains similar but uses function call data ...
});

Phase 3: Enhanced System Prompt for Function Calling
3.1 Update System Prompt
File: backend/src/utils/klioSystemPrompt.js (Add function calling section)
javascriptconst FUNCTION_CALLING_GUIDANCE = `
# 🔧 FUNCTION CALLING FOR WORKSPACE MANAGEMENT

You have access to powerful workspace tools that create interactive learning experiences. Use them strategically:

## When to CREATE NEW workspace (create_math_workspace):
- Student asks for practice problems: "Can you give me some fraction problems?"
- Starting a new topic: "Let's practice multiplication"
- Student says "I want to work on [topic]"
- You want to provide structured practice

**Example:** Student says "Help me practice adding fractions"
→ Use create_math_workspace with 3-5 addition problems

## When to ADD to existing workspace (add_problems_to_workspace):
- Student wants more: "Give me another one" or "More problems please"
- Student is doing well: "That was easy, can I have harder ones?"
- Continuing same topic: Student solving fractions, wants more fractions

**Example:** Student completes 3 problems and says "These are fun, more please!"
→ Use add_problems_to_workspace with 2-3 more similar problems

## When to MARK problems (mark_problem_correct/incorrect):
- Student shows their work and asks you to check it
- Student gives an answer: "I got 8/12, is that right?"
- You can clearly see if their work is correct or incorrect
- Student asks "How did I do?" after showing work

**CRITICAL:** Only mark problems when you can verify the student's work!

## Function Calling Examples:

**Creating workspace:**
Student: "I need to practice multiplying fractions"
→ create_math_workspace({
title: "Fraction Multiplication Practice",
problems: [
{text: "2/3 × 1/4", type: "fractions", hint: "Multiply numerators, then denominators"},
{text: "3/5 × 2/7", type: "fractions", hint: "Remember to simplify if possible"}
]
})

**Adding problems:**
Student: "Give me more fraction problems!"
→ add_problems_to_workspace({
problems: [
{text: "4/9 × 3/8", type: "fractions", hint: "Take your time with the multiplication"}
]
})

**Marking correct:**
Student: "For 2/3 × 1/4, I multiplied 2×1=2 and 3×4=12, so I got 2/12 = 1/6"
→ mark_problem_correct({
problem_index: 0,
feedback: "Perfect! You multiplied correctly and simplified beautifully! 🎉"
})

**Marking incorrect:**
Student: "I got 5/12 for the first problem"
→ mark_problem_incorrect({
problem_index: 0,
guidance: "Close, but let me help you check your multiplication. What's 2×1? And what's 3×4?"
})

## Function Calling Rules:
1. **Always use functions when appropriate** - they create better experiences
2. **Be specific with feedback** - make marking meaningful
3. **Don't overuse clear_workspace** - only when completely changing topics
4. **Add incrementally** - don't create huge workspaces at once
5. **Match difficulty to student** - observe their performance

Remember: Functions are tools to enhance learning, not replace good teaching!
`;

// Add to main system prompt
const ENHANCED_SYSTEM_PROMPT_WITH_FUNCTIONS = `${KLIO_SYSTEM_PROMPT}

${FUNCTION_CALLING_GUIDANCE}

# Current Context Information
- **Today's Date**: {currentDate}
- **Current Time**: {currentTime}
- **Child's Name**: {childName}
- **Child's Grade**: {childGrade}
- **Current Subjects**: {subjects}

# Learning Context
{learningContext}

# Memory Context  
{memoryContext}
`;

module.exports = {
  KLIO_SYSTEM_PROMPT,
  FUNCTION_CALLING_GUIDANCE,
  ENHANCED_SYSTEM_PROMPT_WITH_FUNCTIONS, // New export
  // ... existing exports
};
