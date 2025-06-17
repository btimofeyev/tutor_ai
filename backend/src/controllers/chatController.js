// backend/src/controllers/chatController.js - FUNCTION CALLING VERSION
const { OpenAI } = require('openai');
const supabase = require('../utils/supabaseClient');
const mcpClient = require('../services/mcpClient');
const memoryService = require('../services/learningMemoryService');
const chatHistoryService = require('../services/chatHistoryService');
const { formatLearningContextForAI, isLessonQuery } = require('../middleware/mcpContext');
const { getCurrentDateInfo, getDueDateStatus } = require('../utils/dateUtils');
const { KLIO_SYSTEM_PROMPT } = require('../utils/klioSystemPrompt');
const { WORKSPACE_TOOLS, getEvaluationTypeForSubject, generateWorkspaceFromMaterial, detectSubjectFromMaterial, findCrossSubjectConnections, suggestComplementaryActivities } = require('../utils/workspaceTools');
const { getWorkspaceHandler } = require('../utils/workspaceFunctionHandlers');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


// Enhanced system prompt for function calling
const ENHANCED_SYSTEM_PROMPT = `${KLIO_SYSTEM_PROMPT}

# 🔧 MULTI-SUBJECT WORKSPACE MANAGEMENT

You have access to powerful workspace tools that create interactive learning experiences across ALL subjects. Use them strategically:

## 🎯 CREATING SUBJECT WORKSPACES (create_subject_workspace):

**Math Workspaces:**
- Student asks: "Can you give me some fraction problems?"
→ create_subject_workspace({subject: "math", workspace_type: "math_problems", ...})

**Science Workspaces:**
- Student asks: "Help me with the density experiment"
→ create_subject_workspace({subject: "science", workspace_type: "science_investigation", ...})

**History Workspaces:**
- Student asks: "I need to work on Civil War timeline"
→ create_subject_workspace({subject: "history", workspace_type: "history_analysis", ...})

**Language Arts Workspaces:**
- Student asks: "Let's practice reading comprehension"
→ create_subject_workspace({subject: "language arts", workspace_type: "language_practice", ...})

**Social Studies Workspaces:**
- Student asks: "Help me understand government structure"
→ create_subject_workspace({subject: "social studies", workspace_type: "social_investigation", ...})

## 📚 SUBJECT-SPECIFIC CONTENT TYPES:

**Math:** addition, subtraction, multiplication, division, fractions, decimals, word_problem, algebra, geometry
**Science:** hypothesis, experiment_step, observation, data_collection, conclusion, lab_safety  
**History:** timeline_event, cause_effect, primary_source, compare_contrast, historical_thinking
**Language Arts:** reading_comprehension, vocabulary, grammar, writing_prompt, literary_analysis
**Social Studies:** map_analysis, civic_scenario, cultural_comparison, government_structure, economics

## ⚖️ EVALUATION TYPES BY SUBJECT:

**Binary (Math):** correct/incorrect for problems with clear answers
**Rubric (Science/Language Arts):** excellent/good/needs_improvement for multi-criteria tasks  
**Evidence-based (History/Social Studies):** assess reasoning and evidence quality

## 🔧 WHEN TO USE WORKSPACE FUNCTIONS:

**CREATE NEW workspace:**
- Student asks for practice in any subject
- Starting a new topic or skill
- Student says "I want to work on [topic]"
- MCP materials suggest interactive practice

**ADD CONTENT (add_content_to_workspace):**
- Student wants more: "Give me another one" or "More activities please"
- Student is doing well: "That was easy, can I have harder ones?"
- Continuing same topic in any subject

**EVALUATE CONTENT (evaluate_content_item):**
- Student shows their work and asks you to check it
- Student gives an answer and wants feedback
- You can assess their work quality
- Use appropriate evaluation type for the subject

**CRITICAL:** Always match the evaluation type to the subject and provide meaningful feedback!

## 📋 MULTI-SUBJECT FUNCTION CALLING EXAMPLES:

**Math Workspace:**
Student: "I need to practice multiplying fractions"
→ create_subject_workspace({
subject: "math",
workspace_type: "math_problems", 
title: "Fraction Multiplication Practice",
content: [
{text: "2/3 × 1/4", type: "multiplication", hint: "Multiply numerators, then denominators"},
{text: "3/5 × 2/7", type: "multiplication", hint: "Remember to simplify if possible"}
]
})

**Science Workspace:**
Student: "Help me with this density lab"
→ create_subject_workspace({
subject: "science",
workspace_type: "science_investigation",
title: "Density Investigation Lab",
content: [
{text: "Form a hypothesis about which object will be denser", type: "hypothesis", hint: "Use if-then format"},
{text: "Record the mass and volume measurements", type: "data_collection", hint: "Use the balance and graduated cylinder"}
]
})

**History Workspace:**
Student: "I need to work on the Civil War timeline"
→ create_subject_workspace({
subject: "history", 
workspace_type: "history_analysis",
title: "Civil War Timeline Analysis",
content: [
{text: "When did the Civil War begin and with what event?", type: "timeline_event", hint: "Think about Fort Sumter"},
{text: "What were the main causes that led to the Civil War?", type: "cause_effect", hint: "Consider economic, political, and social factors"}
]
})

**Language Arts Workspace:**
Student: "Let's practice reading comprehension"
→ create_subject_workspace({
subject: "language arts",
workspace_type: "language_practice", 
title: "Reading Comprehension Practice",
content: [
{text: "What is the main idea of the passage?", type: "reading_comprehension", hint: "Look for the most important point the author is making"},
{text: "What does the word 'resilient' mean in this context?", type: "vocabulary", hint: "Use context clues from surrounding sentences"}
]
})

**Evaluating Student Work:**
Student: "For the density lab, my hypothesis is: If I test different materials, then metal will be denser than wood because metal atoms are packed more tightly."
→ evaluate_content_item({
content_index: 0,
evaluation_result: "excellent", 
feedback: "Outstanding hypothesis! You used proper if-then format and gave a scientific explanation based on atomic structure! ⭐",
rubric_scores: {
criteria_scores: [
{criterion: "Format", score: 4, max_score: 4, feedback: "Perfect if-then structure"},
{criterion: "Scientific reasoning", score: 4, max_score: 4, feedback: "Excellent atomic explanation"}
]
}
})

## 🎯 MULTI-SUBJECT FUNCTION CALLING RULES:

1. **Subject Detection**: Analyze MCP materials to detect subject automatically
2. **Appropriate Workspaces**: Match workspace type to subject (math_problems, science_investigation, etc.)
3. **Evaluation Matching**: Use binary for math, rubric for science/language arts, evidence-based for history/social studies
4. **Content Type Accuracy**: Use subject-specific content types (hypothesis for science, timeline_event for history)
5. **Progressive Difficulty**: Start with student's level and adapt based on performance
6. **Meaningful Feedback**: Provide subject-appropriate feedback and encouragement
7. **Workspace Continuity**: Use add_content_to_workspace for same subject, create_subject_workspace for new topics
8. **Clear Separation**: Only use clear_workspace when completely changing subjects or starting over

## 🔄 LEGACY COMPATIBILITY:
- create_math_workspace, add_problems_to_workspace, mark_problem_correct/incorrect still work
- But prefer create_subject_workspace and evaluate_content_item for new implementations
- All workspaces support the enhanced multi-level feedback system

## 🔗 CROSS-SUBJECT LEARNING CONNECTIONS:

**Make Learning Connections:**
- When working on math fractions, mention their use in science measurements
- When studying history timelines, connect to mathematical sequencing
- When analyzing literature, connect to historical context
- When doing science experiments, connect to mathematical calculations

**Examples:**
- Math fractions + Science: "Fractions help us measure precise amounts in chemistry experiments"
- History events + Language Arts: "Primary sources from this period are great reading comprehension practice"
- Science observations + Math: "Let's use decimals to record our measurements precisely"

**Suggest Complementary Activities:**
- After math geometry: "This connects to architecture you might study in history class"
- After science hypothesis: "Writing clear hypotheses helps with language arts too"
- After history analysis: "The data from this period makes great math practice"

Remember: Functions are tools to enhance learning across ALL subjects, creating meaningful connections between disciplines!`;

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
        
        // Check if material has interactive content suitable for workspace
        const detectedSubject = detectSubjectFromMaterial(materialData);
        const workspaceData = generateWorkspaceFromMaterial(materialData, 3);
        
        if (workspaceData && workspaceData.content.length > 0) {
          console.log(`🎯 Material "${foundMaterialTitle}" has ${workspaceData.content.length} interactive ${detectedSubject} activities`);
          materialContentForAI += `\n\n**WORKSPACE OPPORTUNITY:** This material contains ${workspaceData.content.length} interactive ${detectedSubject} activities that could be turned into a hands-on workspace for practice.`;
        }
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
              
              // Check if material has interactive content suitable for workspace
              const detectedSubject = detectSubjectFromMaterial(materialData);
              const workspaceData = generateWorkspaceFromMaterial(materialData, 4);
              
              if (workspaceData && workspaceData.content.length > 0) {
                console.log(`🎯 Found material "${foundMaterialTitle}" has ${workspaceData.content.length} interactive ${detectedSubject} activities`);
                materialContentForAI += `\n\n**WORKSPACE SUGGESTION:** This ${detectedSubject} material contains ${workspaceData.content.length} activities perfect for an interactive workspace.`;
              }
              
              break;
            }
          }
        }
      }
    }

    // Rest of your existing chat handler code...
    // (memory context, system prompt building, OpenAI call, etc.)
    
    const [recentMemories, learningProfile, databaseHistory] = await Promise.all([
      memoryService.getRelevantMemories(childId, message, mcpContext, 12).catch(e => {
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
      }),
      chatHistoryService.buildContextForAI(childId, message, 40).catch(e => {
        console.error('❌ Error getting chat history:', e);
        return [];
      })
    ]);

    // Enhanced context for function calling - supports multi-subject workspaces
    let workspaceContext = '';
    if (currentWorkspace) {
      const isSubjectWorkspace = currentWorkspace.subject && currentWorkspace.content;
      const workspaceItems = currentWorkspace.content || currentWorkspace.problems || [];
      const subject = currentWorkspace.subject || 'math';
      const workspaceType = currentWorkspace.type || 'math_problems';
      
      const itemsList = workspaceItems.map((item, i) => {
        const label = subject === 'math' ? 'Problem' : 
                     subject === 'science' ? 'Activity' :
                     subject === 'history' ? 'Question' :
                     subject === 'language arts' ? 'Exercise' : 'Task';
        return `${i + 1}. ${item.text} (${item.status})`;
      }).join('\n');
      
      workspaceContext = `\n\n**CURRENT ${subject.toUpperCase()} WORKSPACE CONTEXT:**
      - Active workspace: "${currentWorkspace.title}" (${workspaceType})
      - Subject: ${subject}
      - Total items: ${currentWorkspace.stats.totalItems || currentWorkspace.stats.totalProblems}
      - Completed: ${currentWorkspace.stats.completed}
      - Evaluation type: ${getEvaluationTypeForSubject ? getEvaluationTypeForSubject(subject) : 'binary'}
      
      **WORKSPACE CONTENT:**
      ${itemsList}
      
      **MULTI-SUBJECT WORKSPACE RULES:**
      - For checking work: Use evaluate_content_item with appropriate evaluation_result for this subject
      - For adding content: Use add_content_to_workspace with subject-appropriate content types
      - For math: Use correct/incorrect evaluation
      - For science/language arts: Use excellent/good/needs_improvement with rubric_scores
      - For history/social studies: Use evidence-based evaluation with evidence_quality
      - Content index is 0-based: "Item 1" = content_index: 0, "Item 2" = content_index: 1
      
      **CHECKING STUDENT WORK:** 
      If student says "check my work on [Item] X" and shows their work:
      1. Evaluate their work quality based on subject standards
      2. Use evaluate_content_item with content_index = X-1
      3. Choose appropriate evaluation_result for the subject
      4. Provide meaningful, subject-specific feedback
      
      **CRITICAL - CONVERSATIONAL RESPONSES:** Always provide conversational text alongside function calls:
      - When excellent: "Outstanding work! You really understand this concept! ⭐"
      - When good: "Great job! You've got the right idea! ✅"
      - When needs improvement: "Good effort! Let's work on this together to make it even better! 💪"
      - NEVER use function calls without conversational text!`;
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
    // Combine session history with database history for better context
    const sessionMessages = sessionHistory.slice(-10).map(msg => ({
      role: msg.role === 'klio' ? 'assistant' : 'user',
      content: msg.content
    }));
    
    // Merge database history with current session, removing duplicates
    const allHistory = [...databaseHistory, ...sessionMessages];
    const recentHistory = allHistory.slice(-50); // Use up to 50 messages for context
    const openaiMessages = [
      {
        role: "system",
        content: systemPrompt
      },
      ...recentHistory
        .filter(msg => msg.content && typeof msg.content === 'string' && msg.content.trim().length > 0)
        .map(msg => ({
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
          // NEW: Subject-agnostic functions
          case 'create_subject_workspace':
            result = await workspaceHandler.handleCreateSubjectWorkspace(functionArgs, childId);
            break;
          case 'add_content_to_workspace':
            result = await workspaceHandler.handleAddContentToWorkspace(functionArgs, childId);
            break;
          case 'evaluate_content_item':
            result = await workspaceHandler.handleEvaluateContentItem(functionArgs, childId);
            break;
          
          // LEGACY: Math-specific functions (backward compatibility)
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
          
          // General workspace management
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

    // Auto-generate conversational response if LLM only used function calls
    let finalMessage = responseMessage.content;
    if ((!finalMessage || finalMessage.trim() === '') && workspaceActions.length > 0) {
      console.log('🎯 Auto-generating conversational response for function calls');
      
      const action = workspaceActions[0]; // Use first action for response
      switch (action.action) {
        case 'create_workspace':
          // Handle both new subject workspaces and legacy math workspaces
          const itemCount = action.workspace.content?.length || action.workspace.problems?.length || 0;
          const itemType = action.workspace.subject ? `${action.workspace.subject} activities` : 'problems';
          finalMessage = `Great! I've set up "${action.workspace.title}" with ${itemCount} ${itemType} for you in the workspace. Let's start practicing! 🎯`;
          break;
        case 'add_content':
          finalMessage = `Awesome! I've added ${action.newContent.length} more activities to keep you practicing. You're doing great! 💪`;
          break;
        case 'add_problems':
          finalMessage = `Awesome! I've added ${action.newProblems.length} more problems to keep you practicing. You're doing great! 💪`;
          break;
        case 'evaluate_content':
          const evaluatedItem = action.item;
          const resultText = action.item.status === 'excellent' ? 'excellent work' :
                           action.item.status === 'good' ? 'good job' :
                           action.item.status === 'correct' ? 'got that exactly right' :
                           action.item.status === 'needs_improvement' ? 'good effort, but let\'s work on this more' :
                           'gave it a try';
          finalMessage = `${resultText.charAt(0).toUpperCase() + resultText.slice(1)}! ${evaluatedItem.feedback} Ready for the next one?`;
          break;
        case 'mark_correct':
          const correctProblem = action.problem;
          // Extract student's answer from the original message if possible
          const answerMatch = message.match(/My work:\s*([^\n\[]+)/i);
          const studentAnswer = answerMatch ? answerMatch[1].trim() : 'your answer';
          
          // Get lifetime progress to include in response
          let progressMessage = '';
          try {
            const { data: child } = await supabase
              .from('children')
              .select('lifetime_correct, current_streak, best_streak')
              .eq('id', childId)
              .single();
            
            if (child) {
              const lifetimeCorrect = child.lifetime_correct || 0;
              const currentStreak = child.current_streak || 0;
              const bestStreak = child.best_streak || 0;
              
              if (currentStreak > 1) {
                if (currentStreak === bestStreak) {
                  progressMessage = ` You're on fire with a ${currentStreak}-problem streak - that's your best yet! 🔥`;
                } else {
                  progressMessage = ` You're on a ${currentStreak}-problem streak! 🔥`;
                }
              } else if (lifetimeCorrect % 10 === 0 && lifetimeCorrect > 0) {
                progressMessage = ` That's ${lifetimeCorrect} problems correct lifetime! 🎯`;
              }
            }
          } catch (error) {
            console.warn('Could not fetch progress for response:', error);
          }
          
          finalMessage = `Perfect! You got that exactly right! ${correctProblem.text} = ${studentAnswer}. Great work!${progressMessage} 🎉 Ready for the next one?`;
          break;
        case 'mark_incorrect':
          const incorrectProblem = action.problem;
          finalMessage = `Not quite right, but you're on the right track! Let's think through ${incorrectProblem.text} step by step. ${action.problem.feedback || "I'm here to help!"} 💪`;
          break;
        case 'clear_workspace':
          finalMessage = `Workspace cleared! Ready to start something new? What would you like to practice? 🚀`;
          break;
        default:
          finalMessage = `I've updated the workspace for you! 👍`;
      }
      
      console.log(`🗣️ Generated conversational response: "${finalMessage}"`);
    }

    // Update learning memories
    await updateLearningMemories(childId, message, finalMessage || '', mcpContext, learningProfile);

    // Store chat messages in database for enhanced context
    try {
      await Promise.all([
        chatHistoryService.storeMessage(childId, 'user', message, {
          hasLessonContext: !!(mcpContext?.currentFocus || mcpContext?.allMaterials?.length > 0),
          hasOverdueAssignments: mcpContext?.overdue?.length > 0,
          specificQuestionRequest: !!specificQuestionRequest,
          materialFound: foundMaterialTitle
        }),
        chatHistoryService.storeMessage(childId, 'assistant', finalMessage || '', {
          functionCallsCount: toolCalls?.length || 0,
          workspaceActions: workspaceActions.map(a => a.action),
          hasMaterialContent: !!materialContentForAI,
          memoryContext: recentMemories.length > 0
        })
      ]);
      
      // Schedule cleanup if needed (async, don't wait)
      chatHistoryService.scheduleCleanup(childId).catch(e => 
        console.error('Cleanup scheduling failed:', e)
      );
    } catch (historyError) {
      console.error('Failed to store chat history:', historyError);
    }

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
    console.log(`Response Length: ${finalMessage?.length || 0} characters`);
    console.log(`Function Calls: ${toolCalls?.length || 0}`);
    console.log(`Workspace Actions: ${workspaceActions.length}`);
    console.log(`Material Content Used: ${!!materialContentForAI}`);
    console.log(`Found Material: ${foundMaterialTitle || 'None'}`);

    // Return enhanced response with workspace actions
    res.json({
      success: true,
      message: finalMessage || '',
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

// Debug endpoint to test enhanced memory system
exports.debugMemory = async (req, res) => {
  const childId = req.child?.child_id;
  const mcpContext = req.mcpContext;
  const { message = "test message" } = req.query;

  if (!childId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const [recentMemories, learningProfile, databaseHistory, conversationStats] = await Promise.all([
      memoryService.getRelevantMemories(childId, message, mcpContext, 12),
      memoryService.getLearningProfile(childId),
      chatHistoryService.buildContextForAI(childId, message, 40),
      chatHistoryService.getConversationStats(childId)
    ]);

    res.json({
      success: true,
      childId,
      testMessage: message,
      enhancedMemorySystem: {
        recentMemories: {
          count: recentMemories.length,
          memories: recentMemories.map(m => ({
            type: m.memory_type,
            content: m.content.substring(0, 100) + '...',
            confidence: m.confidence,
            subject: m.subject,
            topic: m.topic,
            daysSinceReinforced: Math.floor((Date.now() - new Date(m.last_reinforced)) / (1000 * 60 * 60 * 24))
          }))
        },
        learningProfile: {
          totalInteractions: learningProfile.total_interactions,
          daysTogether: learningProfile.days_together,
          preferredStyle: learningProfile.preferred_explanation_style,
          commonDifficulties: learningProfile.common_difficulties,
          confidenceLevel: learningProfile.confidence_level
        },
        databaseHistory: {
          contextMessagesCount: databaseHistory.length,
          recentMessages: databaseHistory.slice(-5).map(msg => ({
            role: msg.role,
            content: msg.content?.substring(0, 100) + '...',
            timestamp: msg.created_at || 'session'
          }))
        },
        conversationStats,
        mcpContext: {
          hasCurrentFocus: !!mcpContext?.currentFocus,
          currentFocusTitle: mcpContext?.currentFocus?.title,
          hasOverdueAssignments: mcpContext?.overdue?.length > 0,
          totalMaterials: mcpContext?.allMaterials?.length || 0
        }
      }
    });
  } catch (error) {
    console.error('Debug memory error:', error);
    res.status(500).json({
      error: 'Failed to debug memory system',
      details: error.message
    });
  }
};