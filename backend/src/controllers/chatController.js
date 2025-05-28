// backend/src/controllers/chatController.js - FIXED with proper question access
const { OpenAI } = require('openai');
const supabase = require('../utils/supabaseClient');
const mcpClient = require('../services/mcpClient');
const memoryService = require('../services/learningMemoryService');
const { formatLearningContextForAI, isLessonQuery } = require('../middleware/mcpContext');
const { getCurrentDateInfo, getDueDateStatus } = require('../utils/dateUtils');
const { KLIO_SYSTEM_PROMPT } = require('../utils/klioSystemPrompt');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// CRITICAL: Detect when child is asking for specific questions
function isQuestionAccessRequest(message) {
  const messageLower = message.toLowerCase();
  
  // Check for ANY indication of wanting questions/problems
  const questionIndicators = [
    // Direct question requests
    /(?:what'?s|tell me|show me|read me|give me|can you give me).*?(?:question|problem)/i,
    /(?:question|problem)\s*(?:\d+|first|second|third|1st|2nd|3rd|one|two|three)/i,
    /(?:first|1st|second|2nd|third|3rd|next)\s*(?:question|problem|one)/i,
    
    // Starting work patterns
    /(?:start|begin|work on|look at|tackle).*?(?:question|problem|number|from)/i,
    /let'?s?\s+(?:start|begin|work on|look at|do|try)/i,
    
    // Number patterns  
    /number\s*\d+/i,
    /from\s*(?:number|question|problem)\s*\d+/i,
    
    // General work initiation that implies wanting questions
    /(?:sure|okay|yes|ready)$/i // When responding to "want to see the first question?"
  ];
  
  console.log(`🔍 Checking if "${message}" is question access request...`);
  
  for (let i = 0; i < questionIndicators.length; i++) {
    if (questionIndicators[i].test(messageLower)) {
      console.log(`✅ QUESTION ACCESS DETECTED by pattern ${i + 1}: ${questionIndicators[i]}`);
      return true;
    }
  }
  
  console.log('❌ NO QUESTION ACCESS DETECTED');
  return false;
}
// ENHANCED: Better question extraction from lesson data
function findQuestionInLessonData(mcpContext, questionRequest) {
  console.log('\n🔍 === DETAILED QUESTION SEARCH ===');
  console.log(`Request: "${questionRequest}"`);
  console.log('MCP Context available:', !!mcpContext);
  console.log('Current Focus available:', !!mcpContext?.currentFocus);
  console.log('Lesson JSON available:', !!mcpContext?.currentFocus?.lesson_json);
  console.log('Tasks/Questions available:', !!mcpContext?.currentFocus?.lesson_json?.tasks_or_questions);
  
  if (!mcpContext?.currentFocus?.lesson_json?.tasks_or_questions) {
    console.log('❌ CRITICAL: No tasks_or_questions found in lesson data');
    console.log('Available data structure:');
    console.log('- mcpContext keys:', Object.keys(mcpContext || {}));
    console.log('- currentFocus keys:', Object.keys(mcpContext?.currentFocus || {}));
    console.log('- lesson_json keys:', Object.keys(mcpContext?.currentFocus?.lesson_json || {}));
    return null;
  }
  
  const questions = mcpContext.currentFocus.lesson_json.tasks_or_questions;
  console.log(`📋 Found ${questions.length} items in tasks_or_questions`);
  console.log('All items:');
  questions.forEach((q, i) => {
    console.log(`  ${i}: "${q}"`);
  });
  
  // Extract question number with comprehensive patterns
  const requestLower = questionRequest.toLowerCase();
  let questionNumber = null;
  
  // Try multiple extraction methods
  const extractionAttempts = [
    { method: 'direct_number', pattern: /(?:question|problem|number)\s*(\d+)/i },
    { method: 'start_from', pattern: /(?:start|begin).*?(?:from|with|at)?\s*(?:question|problem|number)\s*(\d+)/i },
    { method: 'bare_number', pattern: /(\d+)/i },
    { method: 'ordinal', pattern: /(?:first|1st)/i, value: '1' },
    { method: 'ordinal_2', pattern: /(?:second|2nd)/i, value: '2' },
    { method: 'ordinal_3', pattern: /(?:third|3rd)/i, value: '3' }
  ];
  
  for (const attempt of extractionAttempts) {
    const match = requestLower.match(attempt.pattern);
    if (match) {
      questionNumber = attempt.value || match[1];
      console.log(`🎯 Extracted question number "${questionNumber}" using ${attempt.method}: ${attempt.pattern}`);
      break;
    }
  }
  
  // If no number found, default to 1 for general requests
  if (!questionNumber && (requestLower.includes('start') || requestLower.includes('first') || requestLower.includes('sure'))) {
    questionNumber = '1';
    console.log(`🎯 Defaulting to question 1 for general start request`);
  }
  
  if (!questionNumber) {
    console.log('❌ Could not determine which question number to find');
    return null;
  }
  
  // Find the question
  const searchPattern = new RegExp(`^${questionNumber}\\.\\s`);
  console.log(`🔍 Searching for pattern: ${searchPattern}`);
  
  let matchedQuestionIndex = -1;
  let matchedQuestion = null;
  
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i].toString().trim();
    if (searchPattern.test(q)) {
      matchedQuestionIndex = i;
      matchedQuestion = q;
      console.log(`✅ FOUND MATCH at index ${i}: "${q}"`);
      break;
    }
  }
  
  if (matchedQuestionIndex === -1) {
    console.log(`❌ Question ${questionNumber} not found`);
    console.log('Available numbered questions:');
    questions.forEach((q, i) => {
      if (/^\d+\./.test(q.toString().trim())) {
        console.log(`  Found: "${q}"`);
      }
    });
    return null;
  }
  
  // Find instruction
  let instruction = null;
  for (let i = matchedQuestionIndex - 1; i >= 0; i--) {
    const item = questions[i];
    if (!/^\d+\./.test(item) && item.length > 5) {
      instruction = item;
      console.log(`📝 Found instruction: "${instruction}"`);
      break;
    }
  }
  
  const result = {
    questionNumber: questionNumber,
    questionText: matchedQuestion,
    lessonTitle: mcpContext.currentFocus.title,
    lessonType: mcpContext.currentFocus.content_type,
    instruction: instruction,
    totalQuestions: questions.filter(q => /^\d+\./.test(q.toString().trim())).length
  };
  
  console.log('✅ QUESTION DATA READY:');
  console.log(`   - Question ${result.questionNumber}`);
  console.log(`   - Text: "${result.questionText}"`);
  console.log(`   - Lesson: "${result.lessonTitle}"`);
  console.log(`   - Instruction: "${result.instruction || 'none'}"`);
  console.log('=================================\n');
  
  return result;
}

function detectAvoidancePattern(message) {
  const avoidanceKeywords = [
    'skip', 'don\'t want', 'don\'t feel like', 'not today', 'later', 'maybe tomorrow',
    'boring', 'hard', 'difficult', 'hate this', 'can we do something else',
    'don\'t have to', 'not in the mood', 'tired', 'don\'t care'
  ];
  
  const messageLower = message.toLowerCase();
  return avoidanceKeywords.some(keyword => messageLower.includes(keyword));
}

function detectInterestPattern(message) {
  const interestKeywords = [
    'love', 'like', 'cool', 'awesome', 'fun', 'interesting', 'tell me about',
    'what about', 'can we talk about', 'I want to learn about', 'fascinating'
  ];
  
  const messageLower = message.toLowerCase();
  return interestKeywords.some(keyword => messageLower.includes(keyword));
}

function analyzeResistanceContext(sessionHistory, mcpContext) {
  const recentMessages = sessionHistory.slice(-6);
  let resistanceCount = 0;
  let hasOverdueWork = false;
  let hasDiscussedOverdue = false;
  
  // Check for overdue assignments
  if (mcpContext?.allMaterials?.some(material => {
    if (!material.due_date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(material.due_date + 'T00:00:00');
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  })) {
    hasOverdueWork = true;
  }
  
  // Check conversation history
  recentMessages.forEach(msg => {
    if (msg.role === 'child') {
      if (detectAvoidancePattern(msg.content)) {
        resistanceCount++;
      }
    } else if (msg.role === 'klio') {
      if (msg.content.toLowerCase().includes('overdue') || 
          msg.content.toLowerCase().includes('was due')) {
        hasDiscussedOverdue = true;
      }
    }
  });
  
  return {
    resistanceCount,
    hasOverdueWork,
    hasDiscussedOverdue,
    needsEducationalPersistence: resistanceCount > 0 && hasOverdueWork,
    persistenceAttempts: resistanceCount
  };
}

function createSystemPrompt(childInfo, mcpContext, memoryContext, resistanceContext, questionData = null) {
  const { currentDate, currentTime } = getCurrentDateInfo();
  
  // Enhanced context with resistance awareness
  let resistanceGuidance = '';
  if (resistanceContext.needsEducationalPersistence) {
    if (resistanceContext.persistenceAttempts === 1) {
      resistanceGuidance = `
**CRITICAL CONTEXT**: Child has shown initial resistance to educational tasks and has overdue work. Use GENTLE PERSISTENCE APPROACH with micro-goals. This is your first attempt to redirect them back to learning.`;
    } else if (resistanceContext.persistenceAttempts === 2) {
      resistanceGuidance = `
**CRITICAL CONTEXT**: Child has shown resistance TWICE. Use STRONGER MOTIVATIONAL TECHNIQUES and offer more support. Try connecting their interests to the work or breaking tasks into even smaller pieces.`;
    } else if (resistanceContext.persistenceAttempts >= 3) {
      resistanceGuidance = `
**CRITICAL CONTEXT**: Child has shown PERSISTENT resistance. Consider offering a very brief break (5 minutes) but ALWAYS return to educational goals. Focus on understanding their specific obstacles and providing maximum support.`;
    }
  }

  // CRITICAL: Add question access instructions if question data is available
  let questionAccessGuidance = '';
  if (questionData) {
    questionAccessGuidance = `

**CRITICAL: SPECIFIC QUESTION ACCESS**
The child has asked for a specific question from their assignment. You have access to the EXACT question data:

LESSON: "${questionData.lessonTitle}"
QUESTION NUMBER: ${questionData.questionNumber}
QUESTION TEXT: "${questionData.questionText}"
${questionData.relevantInstruction ? `INSTRUCTION: "${questionData.relevantInstruction}"` : ''}

**YOU MUST:**
1. Quote the EXACT question text as provided above
2. Never make up or modify the question
3. Provide the exact text from their assignment
4. Offer to help work through this specific question

**EXAMPLE RESPONSE:**
"Perfect! Let me pull up your ${questionData.lessonTitle}! 📚

Question ${questionData.questionNumber}: "${questionData.questionText}"

${questionData.relevantInstruction ? `The instruction for this section is: "${questionData.relevantInstruction}"` : ''}

Want to work through this together? I can guide you step by step! 🌟"`;
  }
  
  // Format subjects from MCP context
  const subjects = mcpContext?.childSubjects
    ?.map(cs => cs.subject?.name || cs.custom_subject_name_override)
    .filter(Boolean)
    .join(', ') || 'General Learning';

  // Format the learning context for the AI with accurate date info
  const formattedLearningContext = formatLearningContextForAI(mcpContext, currentDate);

  return KLIO_SYSTEM_PROMPT
    .replace(/{currentDate}/g, currentDate)
    .replace(/{currentTime}/g, currentTime)
    .replace(/{childName}/g, childInfo?.name || 'Friend')
    .replace(/{childGrade}/g, childInfo?.grade || 'Elementary')
    .replace(/{subjects}/g, subjects)
    .replace(/{learningContext}/g, formattedLearningContext)
    .replace(/{memoryContext}/g, memoryContext) + resistanceGuidance + questionAccessGuidance;
}
function createSystemPromptWithQuestionData(basePrompt, questionData) {
  if (!questionData) {
    return basePrompt;
  }
  
  console.log('🎯 ADDING QUESTION DATA TO SYSTEM PROMPT');
  
  const questionSection = `

**🚨 CRITICAL: SPECIFIC QUESTION ACCESS OVERRIDE 🚨**

THE CHILD HAS ASKED FOR A SPECIFIC QUESTION. YOU HAVE THE EXACT DATA:

LESSON: "${questionData.lessonTitle}"
QUESTION: "${questionData.questionText}"
${questionData.instruction ? `INSTRUCTION: "${questionData.instruction}"` : ''}

**MANDATORY RESPONSE FORMAT:**
You MUST respond with this EXACT format:

"Perfect! Let me pull up your ${questionData.lessonTitle}! 📚

Question ${questionData.questionNumber}: "${questionData.questionText}"

${questionData.instruction ? `The instruction for this section is: "${questionData.instruction}"` : ''}

Want to work through this together? I can guide you step by step! 🌟"

**CRITICAL RULES:**
1. Use the EXACT question text provided above
2. NEVER modify or paraphrase the question  
3. NEVER make up different questions
4. Quote the question exactly as written
5. This overrides all other instructions

`;

  console.log('📝 Question section added to prompt');
  return basePrompt + questionSection;
}
// Helper functions (keeping existing ones)
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

function extractTopic(message) {
  const commonTopics = [
    'multiplication', 'division', 'addition', 'subtraction', 'fractions', 'decimals',
    'algebra', 'geometry', 'measurement', 'word problems', 'place value',
    'reading', 'writing', 'spelling', 'grammar', 'vocabulary', 'comprehension',
    'science', 'history', 'geography', 'biology', 'chemistry', 'physics',
    'combinatorics', 'counting', 'tree diagrams', 'fundamental principle',
    'egypt', 'nile', 'pyramid', 'pharaoh', 'ancient', 'civilization'
  ];
  const messageLower = message.toLowerCase();
  
  for (const topic of commonTopics) {
    if (messageLower.includes(topic)) return topic;
  }
  
  const questionMatch = message.match(/(?:help.*with|working on|stuck on|talk.*about|learn.*about)\s+([^?.!]+)/i);
  if (questionMatch) {
    return questionMatch[1].trim().slice(0, 50);
  }
  
  return 'general';
}

async function updateLearningMemoriesEnhanced(childId, userMessage, aiResponse, mcpContext, learningProfile, resistanceContext) {
  console.log(`\n💾 === UPDATING ENHANCED LEARNING MEMORIES ===`);
  
  try {
    await supabase
      .from('child_learning_profiles')
      .update({ 
        total_interactions: learningProfile.total_interactions + 1,
        last_session_date: new Date().toISOString().split('T')[0],
        profile_updated_at: new Date().toISOString()
      })
      .eq('child_id', childId);

    const messageLower = userMessage.toLowerCase();
    const subject = mcpContext?.currentFocus?.lesson?.unit?.child_subject?.subject?.name || 'general';
    const topic = mcpContext?.currentFocus?.title || 'general_learning';

    let memoryUpdates = [];

    // Track resistance patterns
    if (detectAvoidancePattern(userMessage)) {
      console.log(`🚨 EDUCATIONAL RESISTANCE pattern detected`);
      const memoryId = await memoryService.addMemory(childId, 'resistance_pattern', subject, 'educational_avoidance', {
        userMessage: userMessage.slice(0, 200),
        hasOverdueWork: resistanceContext.hasOverdueWork,
        persistenceAttempts: resistanceContext.persistenceAttempts,
        context: mcpContext?.currentFocus?.title,
        timestamp: new Date().toISOString()
      }, 0.9);
      
      if (memoryId) {
        memoryUpdates.push(`RESISTANCE: ${subject} - avoidance pattern`);
        console.log(`   ✅ Stored resistance memory: ${memoryId}`);
      }
    }

    // Track successful persistence breakthroughs
    if (resistanceContext.persistenceAttempts > 0 && 
        (messageLower.includes('okay') || messageLower.includes('fine') || 
         messageLower.includes('let\'s try') || messageLower.includes('sure'))) {
      console.log(`🎉 PERSISTENCE BREAKTHROUGH detected`);
      const memoryId = await memoryService.addMemory(childId, 'persistence_success', subject, topic, {
        breakthroughAfterAttempts: resistanceContext.persistenceAttempts,
        whatWorked: aiResponse.includes('small') ? 'micro_goals' : 
                   aiResponse.includes('together') ? 'collaborative_approach' :
                   aiResponse.includes('break') ? 'task_breakdown' : 'encouragement',
        originalResistance: userMessage.slice(0, 100),
        timestamp: new Date().toISOString()
      }, 0.8);
      
      if (memoryId) {
        memoryUpdates.push(`BREAKTHROUGH: ${subject} - persistence worked`);
        console.log(`   ✅ Stored breakthrough memory: ${memoryId}`);
      }
    }

    // Enhanced interest detection
    if (detectInterestPattern(userMessage)) {
      console.log(`🎯 ENHANCED INTEREST pattern detected`);
      const extractedTopic = userMessage.match(/(?:about|love|like|cool|awesome)\s+([^.!?]+)/i)?.[1]?.trim() || topic;
      
      const memoryId = await memoryService.addMemory(childId, 'topic_interest', subject, extractedTopic, {
        interestExpression: userMessage.slice(0, 100),
        potentialEducationalConnection: subject,
        shouldConnectToCurrentWork: resistanceContext.hasOverdueWork,
        timestamp: new Date().toISOString()
      }, 0.8);
      
      if (memoryId) {
        memoryUpdates.push(`INTEREST: ${extractedTopic} - potential educational bridge`);
        console.log(`   ✅ Stored enhanced interest memory: ${memoryId}`);
      }
    }

    // Summary
    if (memoryUpdates.length > 0) {
      console.log(`📊 Enhanced Memory Update Summary:`);
      memoryUpdates.forEach((update, i) => {
        console.log(`   ${i + 1}. ${update}`);
      });
    } else {
      console.log(`📝 No new memory patterns detected in this message`);
    }

  } catch (error) {
    console.error('❌ Error updating enhanced learning memories:', error);
  }
}

// MAIN CHAT HANDLER - FIXED with question access
exports.chat = async (req, res) => {
  const childId = req.child?.child_id;
  const { message } = req.body;
  const mcpContext = req.mcpContext;

  console.log('\n🤖 === ENHANCED CHAT SESSION DEBUG ===');
  console.log(`Child ID: ${childId}`);
  console.log(`Message: "${message}"`);
  console.log(`Has MCP Context: ${!!mcpContext}`);
  console.log(`Has Current Focus: ${!!mcpContext?.currentFocus}`);
  console.log(`Current Focus Title: ${mcpContext?.currentFocus?.title || 'none'}`);
  
  if (!childId || !message) {
    return res.status(400).json({ error: 'Missing required data' });
  }

  try {
    // STEP 1: Check for question access request
    const isRequestingQuestion = isQuestionAccessRequest(message);
    console.log(`🔍 Is question request: ${isRequestingQuestion}`);
    
    let questionData = null;
    if (isRequestingQuestion) {
      console.log('🎯 ATTEMPTING TO FIND QUESTION DATA...');
      questionData = findQuestionInLessonData(mcpContext, message);
      
      if (questionData) {
        console.log('✅ QUESTION DATA FOUND - Will add to system prompt');
      } else {
        console.log('❌ QUESTION DATA NOT FOUND - AI may hallucinate');
      }
    }
    
    // STEP 2: Get child info
    const { data: child } = await supabase
      .from('children')
      .select('name, grade')
      .eq('id', childId)
      .single();

    // STEP 3: Build system prompt
    let systemPrompt = `You are Klio, an expert AI tutor. Help children with their educational assignments.

Current child: ${child?.name || 'Student'}
Current assignment: ${mcpContext?.currentFocus?.title || 'General learning'}

Available lesson data: ${!!mcpContext?.currentFocus?.lesson_json ? 'YES' : 'NO'}

When a child asks for specific questions from their assignments, you MUST access their lesson materials and provide the EXACT question text as it appears in their assignment. Never make up or modify questions.
`;

    // STEP 4: Add question data if available
    if (questionData) {
      systemPrompt = createSystemPromptWithQuestionData(systemPrompt, questionData);
    }
    
    console.log('📝 System prompt length:', systemPrompt.length);
    console.log('🎯 Contains question data:', systemPrompt.includes('SPECIFIC QUESTION ACCESS'));
    
    // STEP 5: Call OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: 0.1, // Very low temperature for accuracy
      max_tokens: 1024
    });

    const aiMessage = response.choices[0]?.message?.content || "I couldn't generate a response.";
    
    console.log('🤖 AI Response length:', aiMessage.length);
    console.log('📝 AI Response preview:', aiMessage.substring(0, 200) + '...');
    console.log('✅ Contains question text:', questionData ? aiMessage.includes(questionData.questionText.substring(0, 50)) : 'N/A');
    console.log('=====================================\n');

    res.json({
      success: true,
      message: aiMessage,
      timestamp: new Date().toISOString(),
      debugInfo: {
        questionDetected: isRequestingQuestion,
        questionDataFound: !!questionData,
        questionNumber: questionData?.questionNumber || null,
        hasLessonData: !!mcpContext?.currentFocus?.lesson_json,
        currentFocus: mcpContext?.currentFocus?.title || null
      }
    });

  } catch (error) {
    console.error('💥 CHAT ERROR:', error);
    res.status(500).json({
      error: "Sorry! Klio got confused. Can you try asking again? 🤔",
      code: 'CHAT_ERROR'
    });
  }
};

// Keep existing helper methods (getSuggestions, getLessonHelp, reportMessage) unchanged
exports.getSuggestions = async (req, res) => {
  const childId = req.child?.child_id;
  const mcpContext = req.mcpContext;

  if (!childId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const suggestions = [];

    if (mcpContext && !mcpContext.error) {
      const hasOverdueWork = mcpContext.allMaterials?.some(material => {
        if (!material.due_date) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(material.due_date + 'T00:00:00');
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
      });

      if (hasOverdueWork) {
        suggestions.unshift("Help me catch up on overdue work 🎯");
        suggestions.push("Let's break down my assignments 📝");
      }

      if (mcpContext.currentFocus?.title) {
        suggestions.unshift(`Help me with "${mcpContext.currentFocus.title}" 📖`);
      }

      if (mcpContext.upcomingAssignments?.length > 0) {
        suggestions.push("What's due soon? 📅");
      }
    }

    if (suggestions.length === 0) {
      suggestions.push(
        "What assignments do I have? 📚",
        "Help me get organized 📝",
        "I need motivation to study 💪",
        "Can you help me understand this? 🤔"
      );
    }

    res.json({
      success: true,
      suggestions: suggestions.slice(0, 6)
    });

  } catch (error) {
    console.error('Get suggestions error:', error);
    res.json({
      success: true,
      suggestions: [
        "What assignments do I have? 📚",
        "Help me get organized 📝",
        "I need motivation to study 💪",
        "Can you help me understand this? 🤔"
      ]
    });
  }
};

exports.getLessonHelp = async (req, res) => {
  // Keep existing implementation
  const childId = req.child?.child_id;
  const { lessonId } = req.params;

  if (!childId || !lessonId) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    const hasAccess = await mcpClient.checkMaterialAccess(childId, lessonId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this lesson' });
    }

    const lessonDetails = await mcpClient.getMaterialDetails(lessonId);
    if (!lessonDetails) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    res.json({
      success: true,
      help: {
        lessonTitle: lessonDetails.title,
        lessonType: lessonDetails.content_type,
        tips: ["Read each question carefully", "Take your time", "Ask for help if needed"],
        encouragement: "You've got this! 🌟"
      }
    });

  } catch (error) {
    console.error('Get lesson help error:', error);
    res.status(500).json({
      error: 'Failed to get lesson help',
      code: 'HELP_ERROR'
    });
  }
};

exports.reportMessage = async (req, res) => {
  const childId = req.child?.child_id;
  const { messageId, reason, content } = req.body;

  if (!childId || !messageId) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    await supabase
      .from('safety_reports')
      .insert([{
        child_id: childId,
        message_id: messageId,
        reason: reason || 'unspecified',
        reported_at: new Date().toISOString()
      }]);

    const { data: child } = await supabase
      .from('children')
      .select('parent_id')
      .eq('id', childId)
      .single();

    if (child?.parent_id) {
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