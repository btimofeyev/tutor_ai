// backend/src/controllers/chatController.js - FUNCTION CALLING VERSION
const { OpenAI } = require('openai');
const supabase = require('../utils/supabaseClient');
const mcpClient = require('../services/mcpClient');
const memoryService = require('../services/learningMemoryService');
const { formatLearningContextForAI, isLessonQuery } = require('../middleware/mcpContext');
const { getCurrentDateInfo, getDueDateStatus } = require('../utils/dateUtils');
const { KLIO_SYSTEM_PROMPT } = require('../utils/klioSystemPrompt');
const { WORKSPACE_TOOLS } = require('../utils/workspaceTools');
const { getWorkspaceHandler } = require('../utils/workspaceFunctionHandlers');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


// Enhanced system prompt for function calling
const ENHANCED_SYSTEM_PROMPT = `${KLIO_SYSTEM_PROMPT}

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

Remember: Functions are tools to enhance learning, not replace good teaching!`;

// 🔧 FIXED: Parse specific question requests
function parseSpecificQuestionRequest(message) {
  // Look for patterns like "question 5", "number 5", "problem 5"
  const questionMatch = message.match(/(?:question|number|problem)\s*(\d+)/i);
  if (!questionMatch) return null;

  // Look for material references like "Chapter 12", "Assessment", etc.
  const materialPatterns = [
    /chapter\s*(\d+)(?:\s*(assessment|test|quiz|worksheet))?/i,
    /(assessment|test|quiz|worksheet).*chapter\s*(\d+)/i,
    /([a-zA-Z\s]+(?:assessment|test|quiz|worksheet))/i,
    /(lesson\s*\d+)/i
  ];

  let materialRef = null;
  for (const pattern of materialPatterns) {
    const match = message.match(pattern);
    if (match) {
      if (match[1] && match[2]) {
        materialRef = `Chapter ${match[1]} ${match[2]}`;
      } else if (match[2] && match[3]) {
        materialRef = `Chapter ${match[3]} ${match[1]}`;
      } else {
        materialRef = match[1] || match[0];
      }
      break;
    }
  }

  return {
    questionNumber: questionMatch[1],
    materialRef: materialRef ? materialRef.trim() : null,
    originalMessage: message
  };
}
async function findRecentMaterialWithQuestions(childId, questionNumber) {
  try {
    console.log(`🔍 Looking for recent materials with question ${questionNumber}...`);
    
    // Search for recent assignments
    const searchResult = await mcpClient.search(childId, '', 'assignments');
    const assignments = searchResult.results.assignments || [];
    
    if (assignments.length === 0) {
      console.log('❌ No assignments found');
      return null;
    }
    
    // Check each assignment for the question number
    for (const assignment of assignments.slice(0, 5)) { // Check up to 5 recent assignments
      console.log(`🔍 Checking "${assignment.title}" for question ${questionNumber}...`);
      
      const materialContent = await mcpClient.getMaterialContent(childId, assignment.title);
      if (materialContent && materialContent.questions) {
        const questionPattern = new RegExp(`^${questionNumber}\\.\\s*`);
        const hasQuestion = materialContent.questions.some(q => 
          questionPattern.test(q.toString().trim())
        );
        
        if (hasQuestion) {
          console.log(`✅ Found question ${questionNumber} in "${assignment.title}"`);
          return {
            materialData: materialContent,
            materialTitle: assignment.title
          };
        }
      }
    }
    
    console.log(`❌ Question ${questionNumber} not found in any recent materials`);
    return null;
  } catch (error) {
    console.error('❌ Error finding recent material:', error);
    return null;
  }
}
// 🔧 FIXED: Get material with content using MCP
async function getMaterialWithContent(childId, materialRef, questionNumber = null) {
  try {
    console.log(`🔍 Searching for material: "${materialRef}"`);

    // Strategy 1: Direct material lookup
    if (materialRef) {
      const materialContent = await mcpClient.getMaterialContent(childId, materialRef);
      if (materialContent) {
        console.log(`✅ Found material content: "${materialContent.material.title}"`);
        return materialContent;
      }

      // Strategy 2: Search for material by name
      const searchResult = await mcpClient.search(childId, materialRef, 'assignments');
      const assignments = searchResult.results.assignments || [];

      if (assignments.length > 0) {
        const bestMatch = assignments.find(a =>
          a.title.toLowerCase().includes(materialRef.toLowerCase())
        ) || assignments[0];

        console.log(`🔍 Found material via search: "${bestMatch.title}"`);
        const fullContent = await mcpClient.getMaterialContent(childId, bestMatch.title);
        return fullContent;
      }
    }

    // Strategy 3: If we have a question number but no material ref, search recent materials
    if (questionNumber && !materialRef) {
      console.log(`🔍 No material specified, searching recent materials for question ${questionNumber}...`);
      const recentMaterial = await findRecentMaterialWithQuestions(childId, questionNumber);
      if (recentMaterial) {
        return recentMaterial.materialData;
      }
    }

    console.log(`❌ Material not found: "${materialRef}"`);
    return null;
  } catch (error) {
    console.error('❌ Error getting material with content:', error);
    return null;
  }
}
// 🔧 FIXED: Format material content for AI
function formatMaterialContentForAI(materialData, questionNumber = null) {
  if (!materialData) return '';

  const { material, questions, learning_objectives } = materialData;

  let content = `\n📚 **ACTUAL MATERIAL CONTENT** - "${material.title}"\n`;
  content += `**Subject**: ${material.subject}\n`;
  content += `**Content Type**: ${material.content_type}\n`;

  if (learning_objectives && learning_objectives.length > 0) {
    content += `**Learning Objectives**: ${learning_objectives.join(', ')}\n`;
  }

  content += `**Total Questions**: ${questions.length}\n\n`;

  if (questionNumber) {
    // Find and highlight the specific question
    const questionPattern = new RegExp(`^${questionNumber}\\.\\s*`);
    const questionIndex = questions.findIndex(q =>
      questionPattern.test(q.toString().trim())
    );

    if (questionIndex !== -1) {
      const targetQuestion = questions[questionIndex];
      content += `🎯 **REQUESTED QUESTION ${questionNumber}**:\n`;
      content += `"${targetQuestion}"\n\n`;

      // Find the relevant instruction
      let relevantInstruction = null;
      for (let i = questionIndex - 1; i >= 0; i--) {
        const prevItem = questions[i];
        if (!/^\d+\./.test(prevItem) &&
            (prevItem.toLowerCase().includes('solve') ||
             prevItem.toLowerCase().includes('write') ||
             prevItem.toLowerCase().includes('shade') ||
             prevItem.toLowerCase().includes('round') ||
             prevItem.toLowerCase().includes('draw'))) {
          relevantInstruction = prevItem;
          break;
        }
      }

      if (relevantInstruction) {
        content += `**Instructions for this question**: "${relevantInstruction}"\n\n`;
      }

      // Show context (previous and next questions)
      content += `**Context Questions**:\n`;
      const contextStart = Math.max(0, questionIndex - 2);
      const contextEnd = Math.min(questions.length, questionIndex + 3);

      for (let i = contextStart; i < contextEnd; i++) {
        const marker = i === questionIndex ? '>>> ' : '    ';
        content += `${marker}${i + 1}. ${questions[i]}\n`;
      }
    } else {
      content += `❌ **ERROR**: Question ${questionNumber} not found in this material!\n`;
      content += `Available questions are numbered 1-${questions.length}\n`;
    }
  } else {
    // Show all questions (limit to first 10 for brevity)
    content += `**All Questions**:\n`;
    questions.slice(0, 10).forEach((question, index) => {
      content += `${index + 1}. ${question}\n`;
    });

    if (questions.length > 10) {
      content += `... and ${questions.length - 10} more questions\n`;
    }
  }

  return content;
}

// Enhanced helper function to build memory context for AI prompt
function buildMemoryContext(memories, profile) {
  if (!memories || memories.length === 0) {
    return "This is a new learning relationship - getting to know this student's learning style.";
  }

  let context = "";
  memories.forEach((memory, index) => {
    const memoryAge = Math.floor((Date.now() - new Date(memory.last_reinforced)) / (1000 * 60 * 60 * 24));
    context += `${index + 1}. ${memory.memory_type.toUpperCase()}${memory.subject ? ` (${memory.subject})` : ''}: ${memory.topic}`;
    
    if (memory.content.userMessage) {
      context += ` - Previously said: "${memory.content.userMessage.slice(0, 50)}..."`;
    }
    
    if (memory.content.helpfulApproach) {
      context += ` - What helped: "${memory.content.helpfulApproach.slice(0, 50)}..."`;
    }
    
    if (memory.session_count > 1) {
      context += ` (pattern seen ${memory.session_count} times)`;
    }
    
    if (memoryAge === 0) {
      context += ` (from today)`;
    } else if (memoryAge === 1) {
      context += ` (from yesterday)`;
    } else if (memoryAge < 7) {
      context += ` (${memoryAge} days ago)`;
    }
    
    context += `\n`;
  });

  return context;
}

// Enhanced helper function to extract topic from message
function extractTopic(message) {
  const commonTopics = [
    'multiplication', 'division', 'addition', 'subtraction', 'fractions', 'decimals',
    'algebra', 'geometry', 'measurement', 'word problems', 'place value'
  ];
  const messageLower = message.toLowerCase();
  
  for (const topic of commonTopics) {
    if (messageLower.includes(topic)) return topic;
  }
  
  return 'general';
}

// Enhanced function to update learning memories after interaction
async function updateLearningMemories(childId, userMessage, aiResponse, mcpContext, learningProfile) {
  console.log(`\n💾 === UPDATING LEARNING MEMORIES ===`);
  console.log(`🔄 Updating memories for child ${childId}...`);
  
  try {
    // Update interaction count and session date
    await supabase
      .from('child_learning_profiles')
      .update({ 
        total_interactions: learningProfile.total_interactions + 1,
        last_session_date: new Date().toISOString().split('T')[0],
        profile_updated_at: new Date().toISOString()
      })
      .eq('child_id', childId);

    console.log(`✅ Updated interaction count: ${learningProfile.total_interactions} → ${learningProfile.total_interactions + 1}`);

    // Detect and store learning moments
    const messageLower = userMessage.toLowerCase();
    const subject = mcpContext?.currentFocus?.lesson?.unit?.child_subject?.subject?.name || 
                   mcpContext?.currentFocus?.lesson?.unit?.child_subject?.custom_subject_name_override ||
                   'general';
    const topic = mcpContext?.currentFocus?.title || extractTopic(userMessage);

    let memoryUpdates = [];

    // Struggle patterns
    if (messageLower.includes("don't understand") || 
        messageLower.includes("confused") || 
        messageLower.includes("hard") ||
        messageLower.includes("difficult") ||
        messageLower.includes("stuck") ||
        messageLower.includes("help me")) {
      
      console.log(`🚨 STRUGGLE pattern detected`);
      const memoryId = await memoryService.addMemory(childId, 'struggle', subject, topic, {
        userMessage: userMessage.slice(0, 200),
        context: mcpContext?.currentFocus?.title,
        materialType: mcpContext?.currentFocus?.content_type,
        specificQuestion: userMessage.match(/(?:number|question|problem)\s*(\d+)/i)?.[1],
        timestamp: new Date().toISOString()
      }, 0.7);
      
      if (memoryId) {
        memoryUpdates.push(`STRUGGLE: ${subject} - ${topic}`);
        console.log(`   ✅ Stored struggle memory: ${memoryId}`);
      }
    }

    console.log(`Updated learning memories for child ${childId}: ${subject} - ${topic}`);

  } catch (error) {
    console.error('❌ Error updating learning memories:', error);
  }
}

// 🚀 MAIN CHAT HANDLER - FUNCTION CALLING VERSION
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

    // Get child info and workspace handler
    const { data: child } = await supabase
      .from('children')
      .select('name, grade')
      .eq('id', childId)
      .single();

    // Get workspace handler for this child
    const workspaceHandler = getWorkspaceHandler(childId);
    const currentWorkspace = workspaceHandler.getCurrentWorkspace();

    // 🔧 ENHANCED: Better specific question detection
    const specificQuestionRequest = parseSpecificQuestionRequest(message);
    let materialContentForAI = '';
    let foundMaterialTitle = '';

    if (specificQuestionRequest) {
      console.log('🎯 Specific question request detected:', specificQuestionRequest);
      
      let materialRef = specificQuestionRequest.materialRef;
      
      // Strategy 1: Use material ref from message
      if (materialRef) {
        console.log(`📖 Using material ref from message: "${materialRef}"`);
      }
      // Strategy 2: Use current focus as fallback
      else if (mcpContext?.currentFocus?.title) {
        materialRef = mcpContext.currentFocus.title;
        console.log(`📖 Using current focus as material ref: "${materialRef}"`);
      }
      // Strategy 3: Search recent materials for the question
      else {
        console.log(`🔍 No material ref found, will search recent materials for question ${specificQuestionRequest.questionNumber}`);
      }
      
      // Get material content using enhanced method
      console.log(`🔍 Getting material content for question ${specificQuestionRequest.questionNumber}...`);
      const materialData = await getMaterialWithContent(
        childId, 
        materialRef, 
        specificQuestionRequest.questionNumber
      );
      
      if (materialData) {
        foundMaterialTitle = materialData.material.title;
        materialContentForAI = formatMaterialContentForAI(
          materialData, 
          specificQuestionRequest.questionNumber
        );
        console.log(`✅ Added material content to AI context: "${foundMaterialTitle}"`);
        console.log(`📝 Question ${specificQuestionRequest.questionNumber} context prepared`);
      } else {
        console.log('❌ Could not retrieve material content');
        materialContentForAI = `\n⚠️ **MATERIAL ACCESS ISSUE**: Could not find a material containing question ${specificQuestionRequest.questionNumber}. 

**IMPORTANT**: When helping with specific numbered questions, you need to:
1. Ask the student which assignment they're working on (e.g., "Which assignment is question ${specificQuestionRequest.questionNumber} from?")
2. Or provide general guidance: "Without seeing the specific question, I can help you with general problem-solving strategies."

The student is asking about question ${specificQuestionRequest.questionNumber} but didn't specify which assignment.\n`;
      }
    }

    // 🔧 ENHANCED: Better material search for general requests
    if (!specificQuestionRequest && (message.toLowerCase().includes('review') || 
                                    message.toLowerCase().includes('work on') ||
                                    message.toLowerCase().includes('help with'))) {
      
      // Try to find material mentioned in the message
      const materialPatterns = [
        /chapter\s*(\d+)/i,
        /(assessment|test|quiz|worksheet)/i,
        /(lesson\s*\d+)/i
      ];

      for (const pattern of materialPatterns) {
        const match = message.match(pattern);
        if (match) {
          const potentialMaterial = match[0];
          console.log(`🔍 Searching for mentioned material: "${potentialMaterial}"`);
          
          const searchResult = await mcpClient.search(childId, potentialMaterial, 'assignments');
          if (searchResult.results.assignments?.length > 0) {
            const material = searchResult.results.assignments[0];
            const materialData = await mcpClient.getMaterialContent(childId, material.title);
            
            if (materialData) {
              foundMaterialTitle = materialData.material.title;
              materialContentForAI = formatMaterialContentForAI(materialData);
              console.log(`✅ Added found material content to AI context: "${foundMaterialTitle}"`);
              break;
            }
          }
        }
      }
    }

    // Rest of your existing chat handler code...
    // (memory context, system prompt building, OpenAI call, etc.)
    
    const [recentMemories, learningProfile] = await Promise.all([
      memoryService.getRelevantMemories(childId, message, mcpContext, 4).catch(e => {
        console.error('❌ Error getting memories:', e);
        return [];
      }),
      memoryService.getLearningProfile(childId).catch(e => {
        console.error('❌ Error getting profile:', e);
        return {
          days_together: 0,
          total_interactions: 0,
          preferred_explanation_style: 'step_by_step',
          common_difficulties: [],
          engagement_triggers: [],
          learning_pace: 'moderate',
          confidence_level: 'building'
        };
      })
    ]);

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

    // Build the enhanced system prompt
    const formattedLearningContext = formatLearningContextForAI(mcpContext, currentDate);
    const memoryContext = buildMemoryContext(recentMemories, learningProfile);
    
    const subjects = mcpContext?.childSubjects
      ?.map(cs => cs.subject?.name || cs.custom_subject_name_override)
      .filter(Boolean)
      .join(', ') || 'General Learning';

    const daysTogether = learningProfile.last_session_date ? 
      Math.max(1, Math.floor((today - new Date(learningProfile.created_at)) / (1000 * 60 * 60 * 24))) : 
      1;

    const systemPrompt = ENHANCED_SYSTEM_PROMPT
      .replace(/{currentDate}/g, currentDate)
      .replace(/{currentTime}/g, currentTime)
      .replace('{childName}', child?.name || 'Friend')
      .replace('{childGrade}', child?.grade || 'Elementary')
      .replace('{subjects}', subjects)
      .replace('{learningContext}', formattedLearningContext) + 
      `\n\n**LEARNING RELATIONSHIP CONTEXT:**
      You have been tutoring ${child?.name} for ${daysTogether} day${daysTogether !== 1 ? 's' : ''} with ${learningProfile.total_interactions} total interactions.
      
      **RELEVANT LEARNING MEMORIES:**
      ${memoryContext}
      
      ${materialContentForAI}
      ${workspaceContext}`;

    // Prepare conversation history
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
    console.log(`📊 Context includes: ${materialContentForAI ? `Material Content ✅ (${foundMaterialTitle})` : 'No Material Content ❌'}`);
    
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

    // Update learning memories
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
          workspace_actions: workspaceActions.length > 0 ? workspaceActions.map(a => a.action) : null,
          has_material_content: !!materialContentForAI,
          specific_question_request: !!specificQuestionRequest,
          material_found: !!foundMaterialTitle,
          question_number: specificQuestionRequest?.questionNumber || null
        }]);
    } catch (logError) {
      console.error('Failed to log interaction:', logError);
    }

    console.log('\n✅ === FUNCTION CALLING CHAT SESSION COMPLETE ===');
    console.log(`Response Length: ${responseMessage.content?.length || 0} characters`);
    console.log(`Function Calls: ${toolCalls?.length || 0}`);
    console.log(`Workspace Actions: ${workspaceActions.length}`);
    console.log(`Material Content Used: ${!!materialContentForAI}`);
    console.log(`Found Material: ${foundMaterialTitle || 'None'}`);

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
        hadExistingWorkspace: !!currentWorkspace,
        hasMaterialContent: !!materialContentForAI,
        specificQuestionDetected: !!specificQuestionRequest,
        foundMaterial: foundMaterialTitle,
        questionNumber: specificQuestionRequest?.questionNumber
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
// 🔧 FIXED: Get suggestions with MCP integration
exports.getSuggestions = async (req, res) => {
    const childId = req.child?.child_id;
    const mcpContext = req.mcpContext;

    if (!childId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      // Get memory-informed suggestions
      const [recentMemories, learningProfile] = await Promise.all([
        memoryService.getRelevantMemories(childId, '', mcpContext, 3).catch(e => {
          console.error('Error getting memories for suggestions:', e);
          return [];
        }),
        memoryService.getLearningProfile(childId).catch(e => {
          console.error('Error getting profile for suggestions:', e);
          return null;
        })
      ]);

      const suggestions = [];

      // 🔧 FIXED: Use MCP to get current materials for suggestions
      try {
        const currentMaterials = await mcpClient.getCurrentMaterials(childId);
        
        if (currentMaterials && currentMaterials.length > 0) {
          // Add specific material suggestions
          const urgentMaterial = currentMaterials.find(m => 
            m.due_date && new Date(m.due_date) <= new Date()
          );
          
          if (urgentMaterial) {
            suggestions.unshift(`Help me with "${urgentMaterial.title}" (overdue!) 🚨`);
          }
          
          const todayMaterial = currentMaterials.find(m => {
            if (!m.due_date) return false;
            const dueDate = new Date(m.due_date);
            const today = new Date();
            return dueDate.toDateString() === today.toDateString();
          });
          
          if (todayMaterial) {
            suggestions.push(`Help me with "${todayMaterial.title}" (due today!) ⚠️`);
          }
        }
      } catch (mcpError) {
        console.error('Error getting materials for suggestions:', mcpError);
      }

      // Memory-based suggestions
      if (recentMemories.length > 0) {
        const struggles = recentMemories.filter(m => m.memory_type === 'struggle');
        if (struggles.length > 0) {
          const recentStruggle = struggles[0];
          suggestions.push(`Let's work on ${recentStruggle.topic} again 💪`);
        }

        const topicInterests = recentMemories.filter(m => m.memory_type === 'topic_interest');
        if (topicInterests.length > 0) {
          const recentInterest = topicInterests[0];
          suggestions.push(`Tell me more about ${recentInterest.topic} 🎯`);
        }

        const masteries = recentMemories.filter(m => m.memory_type === 'mastery');
        if (masteries.length > 0) {
          const recentMastery = masteries[0];
          suggestions.push(`More practice with ${recentMastery.topic}? 🎯`);
        }
      }

      // Enhanced with context if available
      if (mcpContext && !mcpContext.error) {
        if (mcpContext.currentFocus?.title) {
          const focus = mcpContext.currentFocus;
          let suggestion = `Help me with "${focus.title}"`;

          if (focus.due_date) {
            const dueDate = new Date(focus.due_date);
            const today = new Date();
            const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

            if (daysUntil === 0) {
              suggestion += " (due today!) ⚠️";
            } else if (daysUntil === 1) {
              suggestion += " (due tomorrow) ⏰";
            }
          }

          suggestions.unshift(suggestion + " 📖");
        }

        if (mcpContext.upcomingAssignments?.length > 0) {
          const nextAssignment = mcpContext.upcomingAssignments[0];
          const dueDate = new Date(nextAssignment.due_date);
          const today = new Date();
          const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

          if (daysUntil <= 3) {
            suggestions.unshift(`What's due soon? 📅`);
          } else {
            suggestions.push(`What assignments are coming up? 📋`);
          }
        }

        if (mcpContext.childSubjects?.length > 0) {
          const subjects = mcpContext.childSubjects.map(cs => cs.subjects?.name || cs.subject?.name).filter(Boolean);
          if (subjects.length > 0) {
            const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
            suggestions.push(`Let's practice ${randomSubject}! 🎯`);
          }
        }

        if (mcpContext.progress?.summary) {
          if (mcpContext.progress.summary.totalCompletedMaterials > 0) {
            suggestions.push("Show me my progress! 📊");
          }
        }

        if (mcpContext.currentMaterials?.length > 1) {
          suggestions.push("What lessons do I have? 📚");
        }
      }

      // Default suggestions if no context
      if (suggestions.length === 0) {
        suggestions.push(
          "What are we learning today? 📚",
          "Can you explain this to me? 🤔",
          "Let's practice together! ✏️",
          "I need help with my homework 📝"
        );
      }

      // Personalized based on learning profile
      if (learningProfile) {
        if (learningProfile.preferred_explanation_style === 'examples') {
          suggestions.push("Show me an example! 📖");
        } else if (learningProfile.preferred_explanation_style === 'step_by_step') {
          suggestions.push("Walk me through step by step 👣");
        }
      }

      // Remove duplicates and limit to 6 suggestions
      const uniqueSuggestions = [...new Set(suggestions)];

      res.json({
        success: true,
        suggestions: uniqueSuggestions.slice(0, 6)
      });

    } catch (error) {
      console.error('Get suggestions error:', error);
      res.json({
        success: true,
        suggestions: [
          "What are we learning today? 📚",
          "Can you help me learn? 🤔",
          "Let's practice together! ✏️",
          "I need help with homework 📝"
        ]
      });
    }
};

// 🔧 FIXED: Get lesson help with enhanced MCP access
exports.getLessonHelp = async (req, res) => {
  const childId = req.child?.child_id;
  const { lessonId } = req.params;

  if (!childId || !lessonId) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    // 🔧 FIXED: Use enhanced MCP client methods
    const hasAccess = await mcpClient.checkMaterialAccess(childId, lessonId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this lesson' });
    }

    // 🔧 FIXED: Get detailed lesson information with full content
    const lessonDetails = await mcpClient.getMaterialDetailsWithChild(childId, lessonId);
    if (!lessonDetails) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Get relevant memories for this lesson/subject
    const subject = lessonDetails.material?.subject || 'general';
    const lessonMemories = await memoryService.getRelevantMemories(childId, lessonDetails.material?.title || '', null, 3)
      .catch(e => {
        console.error('Error getting lesson memories:', e);
        return [];
      });

    // Generate helpful content based on lesson
    const lessonJson = lessonDetails.lesson_content || {};

    const helpContent = {
      lessonTitle: lessonDetails.material?.title,
      lessonType: lessonDetails.material?.content_type,
      subjectName: lessonDetails.material?.subject,
      tips: [],
      encouragement: "You're doing great! Let's work through this together! 🌟",
      learningGoals: [],
      nextSteps: [],
      pastExperience: null,
      personalizedTips: []
    };

    // Add memory-informed encouragement and tips
    const struggles = lessonMemories.filter(m => m.memory_type === 'struggle');
    const masteries = lessonMemories.filter(m => m.memory_type === 'mastery');

    if (masteries.length > 0) {
      helpContent.encouragement = `Remember how well you did with ${masteries[0].topic}? You've got this! 🌟`;
      helpContent.pastExperience = `You've successfully worked through similar ${subject} topics before!`;
    } else if (struggles.length > 0) {
      helpContent.encouragement = `I know ${struggles[0].topic} was tricky before, but we'll take it step by step this time! 💪`;
      helpContent.personalizedTips.push(`Take your time with this - I'm here to help when you need it 🤝`);
    }

    // Add specific tips based on content type
    switch (lessonDetails.material?.content_type) {
      case 'worksheet':
      case 'assignment':
        helpContent.tips = [
          "Read each question carefully before answering 📖",
          "Start with the easier questions first to build confidence 💪",
          "If you're stuck, try re-reading the lesson materials 🔍",
          "Take your time - there's no rush! ⏰"
        ];

        if (struggles.some(s => s.content.specificQuestion)) {
          helpContent.personalizedTips.push("If you get stuck on a specific question, just ask me about that question number! 🎯");
        }
        break;

      case 'test':
      case 'quiz':
        helpContent.tips = [
          "Take a deep breath and relax 😌",
          "Read all answer choices before selecting one 📝",
          "Trust your first instinct 🎯",
          "You've prepared well - you can do this! 🌟"
        ];
        break;

      default:
        helpContent.tips = [
          "Focus on understanding the main ideas first 💡",
          "Take notes as you go along 📝",
          "Ask me if anything is confusing 🤔",
          "Practice makes perfect! 🎯"
        ];
    }

    // Add specific guidance if available
    if (lessonJson.learning_objectives && lessonJson.learning_objectives.length > 0) {
      helpContent.learningGoals = lessonJson.learning_objectives.slice(0, 3);
    }

    if (lessonJson.tasks_or_questions && lessonJson.tasks_or_questions.length > 0) {
      helpContent.totalQuestions = lessonJson.tasks_or_questions.length;
      helpContent.firstQuestion = lessonJson.tasks_or_questions[0];
      helpContent.sampleQuestions = lessonJson.tasks_or_questions.slice(0, 3);
    }

    // Add estimated time and difficulty info
    if (lessonDetails.estimated_time) {
      helpContent.estimatedTime = lessonDetails.estimated_time;
    }

    if (lessonDetails.material?.difficulty_level) {
      helpContent.difficultyLevel = lessonDetails.material.difficulty_level;
    }

    // Add next steps based on lesson content
    helpContent.nextSteps = [
      "Start with the learning goals above 🎯",
      "Work through the questions step by step 📝",
      "Ask me for help if you get stuck 🤝",
      "Celebrate when you're done! 🎉"
    ];

    res.json({
      success: true,
      help: helpContent
    });

  } catch (error) {
    console.error('Get lesson help error:', error);
    res.status(500).json({
      error: 'Failed to get lesson help',
      code: 'HELP_ERROR'
    });
  }
};

// Report concerning message (safety feature) - Enhanced with memory context
exports.reportMessage = async (req, res) => {
  const childId = req.child?.child_id;
  const { messageId, reason, content } = req.body;

  if (!childId || !messageId) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    // Log the report (without storing actual message content for privacy)
    await supabase
      .from('safety_reports')
      .insert([{
        child_id: childId,
        message_id: messageId,
        reason: reason || 'unspecified',
        reported_at: new Date().toISOString()
      }]);

    // Get parent info to potentially notify them
    const { data: child } = await supabase
      .from('children')
      .select('parent_id')
      .eq('id', childId)
      .single();

    if (child?.parent_id) {
      // Create a notification for the parent
      await supabase
        .from('parent_notifications')
        .insert([{
          parent_id: child.parent_id,
          type: 'safety_concern',
          title: 'Chat Safety Report',
          message: `A message was flagged in your child's chat session. Reason: ${reason}`,
          created_at: new Date().toISOString()
        }]);
    }

    // Add a memory note about safety concerns (without storing the actual content)
    await memoryService.addMemory(childId, 'safety_concern', 'general', 'inappropriate_content', {
      reason: reason,
      timestamp: new Date().toISOString(),
      note: 'Safety report filed - content not stored for privacy'
    }, 1.0).catch(e => console.error('Error storing safety memory:', e));

    res.json({
      success: true,
      message: "Thank you for letting us know. We'll look into this! 👍"
    });

  } catch (error) {
    console.error('Report message error:', error);
    res.status(500).json({
      error: 'Failed to report message',
      code: 'REPORT_ERROR'
    });
  }
};