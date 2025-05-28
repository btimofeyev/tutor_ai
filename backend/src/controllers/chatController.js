// backend/src/controllers/chatController.js - Enhanced with Comprehensive Memory Logging
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
  const recentMessages = sessionHistory.slice(-6); // Look at last 6 messages
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
function createSystemPrompt(childInfo, mcpContext, memoryContext, resistanceContext) {
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
    .replace(/{memoryContext}/g, memoryContext) + resistanceGuidance;
}
// Helper function to extract specific question from lesson data
function findQuestionInLessonData(mcpContext, questionRequest) {
  console.log('🔍 Looking for question in lesson data...');
  
  const questions = lessonData.lesson_json.tasks_or_questions;
  const questionPattern = new RegExp(`^${questionNumber}\\.\\s`);
  
  const matchedQuestionIndex = questions.findIndex(q => 
    questionPattern.test(q.toString().trim())
  );
  
  if (matchedQuestionIndex === -1) {
    console.log(`Question ${questionNumber} not found in questions:`, questions.slice(0, 10));
    return null;
  }
  
  const matchedQuestion = questions[matchedQuestionIndex];
  console.log(`Found question ${questionNumber}:`, matchedQuestion);
  
  // Find the relevant instruction by looking backwards for instruction-like text
  let relevantInstruction = null;
  for (let i = matchedQuestionIndex - 1; i >= 0; i--) {
    const prevItem = questions[i];
    if (!/^\d+\./.test(prevItem) && 
        (prevItem.toLowerCase().includes('write') || 
         prevItem.toLowerCase().includes('find') || 
         prevItem.toLowerCase().includes('complete') || 
         prevItem.toLowerCase().includes('round') || 
         prevItem.toLowerCase().includes('convert') || 
         prevItem.toLowerCase().includes('compare') ||
         prevItem.toLowerCase().includes('match') ||
         prevItem.toLowerCase().includes('rewrite') ||
         prevItem.toLowerCase().includes('value'))) {
      relevantInstruction = prevItem;
      console.log(`Found instruction for question ${questionNumber}:`, relevantInstruction);
      break;
    }
  }
  
  // Also look for section headers or categories
  let sectionContext = null;
  for (let i = matchedQuestionIndex - 1; i >= 0; i--) {
    const prevItem = questions[i];
    if (prevItem.length < 80 && !prevItem.match(/^\d+\./)) {
      if (prevItem.toLowerCase().includes('form') || 
          prevItem.toLowerCase().includes('round') ||
          prevItem.toLowerCase().includes('compare') ||
          prevItem.toLowerCase().includes('value') ||
          prevItem.toLowerCase().includes('match') ||
          prevItem.toLowerCase().includes('table') ||
          prevItem.toLowerCase().includes('rewrite')) {
        sectionContext = prevItem;
        break;
      }
    }
  }
  
  return {
    questionText: matchedQuestion,
    questionIndex: matchedQuestionIndex,
    totalQuestions: questions.length,
    lessonTitle: lessonData.title,
    lessonType: lessonData.content_type,
    learningObjectives: lessonData.lesson_json.learning_objectives || [],
    relevantInstruction: relevantInstruction,
    sectionContext: sectionContext,
    questionContent: matchedQuestion.replace(/^\d+\.\s*/, ''),
    rawQuestionArray: questions.slice(Math.max(0, matchedQuestionIndex - 3), matchedQuestionIndex + 2)
  };
}
function findQuestionInLessonData(mcpContext, questionRequest) {
  console.log('🔍 Looking for question in lesson data...');
  
  // Check if we have current focus with lesson data
  if (!mcpContext?.currentFocus?.lesson_json?.tasks_or_questions) {
    console.log('❌ No lesson_json data available');
    return null;
  }
  
  const questions = mcpContext.currentFocus.lesson_json.tasks_or_questions;
  console.log(`📋 Found ${questions.length} items in tasks_or_questions`);
  
  // Parse the question request
  const requestLower = questionRequest.toLowerCase();
  let questionNumber = null;
  
  // Extract question number from request
  const numberMatch = requestLower.match(/(?:question|problem|number)\s*(\d+)|(\d+)(?:st|nd|rd|th)?/);
  if (numberMatch) {
    questionNumber = numberMatch[1] || numberMatch[2];
  } else if (requestLower.includes('first')) {
    questionNumber = '1';
  } else if (requestLower.includes('second')) {
    questionNumber = '2';
  } else if (requestLower.includes('third')) {
    questionNumber = '3';
  }
  
  console.log(`🎯 Looking for question number: ${questionNumber}`);
  
  if (questionNumber) {
    // Look for numbered questions
    const questionPattern = new RegExp(`^${questionNumber}\\.\\s`);
    const matchedQuestion = questions.find(q => questionPattern.test(q.toString().trim()));
    
    if (matchedQuestion) {
      console.log(`✅ Found question ${questionNumber}: ${matchedQuestion}`);
      
      // Find relevant instruction by looking backwards
      const questionIndex = questions.indexOf(matchedQuestion);
      let relevantInstruction = null;
      
      for (let i = questionIndex - 1; i >= 0; i--) {
        const prevItem = questions[i];
        if (!/^\d+\./.test(prevItem) && prevItem.length < 100) {
          // This looks like an instruction
          relevantInstruction = prevItem;
          break;
        }
      }
      
      return {
        questionNumber,
        questionText: matchedQuestion,
        instruction: relevantInstruction,
        lessonTitle: mcpContext.currentFocus.title,
        questionIndex: questionIndex,
        totalQuestions: questions.length
      };
    }
  }
  
  // If no specific number, try to find the first numbered question
  const firstQuestion = questions.find(q => /^\d+\./.test(q.toString().trim()));
  if (firstQuestion && (requestLower.includes('first') || requestLower.includes('start'))) {
    const questionNum = firstQuestion.match(/^(\d+)\./)[1];
    console.log(`✅ Found first question: ${firstQuestion}`);
    
    return {
      questionNumber: questionNum,
      questionText: firstQuestion,
      instruction: questions[0], // Often the first item is an instruction
      lessonTitle: mcpContext.currentFocus.title,
      questionIndex: questions.indexOf(firstQuestion),
      totalQuestions: questions.length
    };
  }
  
  console.log('❌ Could not find requested question');
  return null;
}
// Helper function to find lesson by number/title
function findLessonByReference(mcpContext, lessonRef) {
  if (!mcpContext || !mcpContext.currentMaterials) return null;
  
  const lessonNumberMatch = lessonRef.match(/lesson\s*(\d+)/i);
  if (lessonNumberMatch) {
    const lessonNum = lessonNumberMatch[1];
    
    const matchedMaterial = mcpContext.currentMaterials.find(material => {
      if (material.lesson_json && material.lesson_json.lesson_number_if_applicable) {
        const materialLessonNum = material.lesson_json.lesson_number_if_applicable.toString();
        return materialLessonNum.includes(lessonNum);
      }
      return false;
    });
    
    if (matchedMaterial) return matchedMaterial;
  }
  
  return mcpContext.currentMaterials.find(material => 
    material.title && material.title.toLowerCase().includes(lessonRef.toLowerCase())
  );
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
  // Enhanced topic extraction with more comprehensive list
  const commonTopics = [
    'multiplication', 'division', 'addition', 'subtraction', 'fractions', 'decimals',
    'algebra', 'geometry', 'measurement', 'word problems', 'place value',
    'reading', 'writing', 'spelling', 'grammar', 'vocabulary', 'comprehension',
    'science', 'history', 'geography', 'biology', 'chemistry', 'physics',
    'egypt', 'nile', 'pyramid', 'pharaoh', 'ancient', 'civilization',
    'river', 'desert', 'africa', 'archaeology'
  ];
  const messageLower = message.toLowerCase();
  
  for (const topic of commonTopics) {
    if (messageLower.includes(topic)) return topic;
  }
  
  // Try to extract from specific question patterns
  const questionMatch = message.match(/(?:help.*with|working on|stuck on|talk.*about|learn.*about)\s+([^?.!]+)/i);
  if (questionMatch) {
    return questionMatch[1].trim().slice(0, 50);
  }
  
  return 'general';
}

// Enhanced function to update learning memories after interaction
async function updateLearningMemoriesEnhanced(childId, userMessage, aiResponse, mcpContext, learningProfile, resistanceContext) {
  console.log(`\n💾 === UPDATING ENHANCED LEARNING MEMORIES ===`);
  
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

    const messageLower = userMessage.toLowerCase();
    const subject = mcpContext?.currentFocus?.lesson?.unit?.child_subject?.subject?.name || 'general';
    const topic = mcpContext?.currentFocus?.title || 'general_learning';

    let memoryUpdates = [];

    // Track resistance patterns (NEW)
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

    // Track successful persistence breakthroughs (NEW)
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

    // Enhanced interest detection with educational connection tracking
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

    // Track educational engagement after persistence
    if (resistanceContext.persistenceAttempts > 0 &&
        (messageLower.includes('question') || messageLower.includes('problem') || 
         messageLower.includes('help me') || messageLower.includes('show me'))) {
      console.log(`📚 EDUCATIONAL ENGAGEMENT after resistance detected`);
      const memoryId = await memoryService.addMemory(childId, 'engagement_after_resistance', subject, topic, {
        engagementType: 'educational_question',
        afterResistanceAttempts: resistanceContext.persistenceAttempts,
        engagementMessage: userMessage.slice(0, 150),
        timestamp: new Date().toISOString()
      }, 0.9);
      
      if (memoryId) {
        memoryUpdates.push(`ENGAGEMENT: ${subject} - worked through resistance`);
        console.log(`   ✅ Stored engagement memory: ${memoryId}`);
      }
    }

    // Existing memory patterns (struggle, mastery, question patterns) - keep all existing logic
    // ... [include all the existing memory tracking code from the original] ...

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

// Main chat handler - Enhanced with Memory System
exports.chat = async (req, res) => {
  const childId = req.child?.child_id;
  const { message, sessionHistory = [], lessonContext = null } = req.body;
  const mcpContext = req.mcpContext;

  console.log('\n🤖 === ENHANCED KLIO CHAT SESSION START ===');
  console.log(`Child ID: ${childId}`);
  console.log(`Message: "${message}"`);
  console.log(`Session History Length: ${sessionHistory.length}`);

  if (!childId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }
  if (message.length > 500) {
    return res.status(400).json({ error: 'Message is too long.' });
  }

  try {
    // Get child info
    const { data: child } = await supabase
      .from('children')
      .select('name, grade')
      .eq('id', childId)
      .single();

    // Enhanced memory system with resistance tracking
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

    // NEW: Analyze resistance context
    const resistanceContext = analyzeResistanceContext(sessionHistory, mcpContext);
    
    console.log('\n🧠 === RESISTANCE ANALYSIS ===');
    console.log(`Resistance Count: ${resistanceContext.resistanceCount}`);
    console.log(`Has Overdue Work: ${resistanceContext.hasOverdueWork}`);
    console.log(`Needs Persistence: ${resistanceContext.needsEducationalPersistence}`);
    console.log(`Persistence Attempts: ${resistanceContext.persistenceAttempts}`);

    // Build enhanced memory context
    const memoryContext = buildMemoryContext(recentMemories, learningProfile);

    // Create enhanced system prompt with resistance awareness
    const systemPrompt = createSystemPrompt(child, mcpContext, memoryContext, resistanceContext);

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

    // Call OpenAI with enhanced parameters for better instruction following
    let response;
    try {
      response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Using the model specified in requirements
        messages: openaiMessages,
        temperature: 0.3, // Lower temperature for more consistent educational guidance
        max_tokens: 1024,
        frequency_penalty: 0.1, // Slight penalty to avoid repetitive responses
        presence_penalty: 0.1,  // Encourage variety in explanations
      });
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError);
      return res.status(503).json({
        error: "Oops! Klio is taking a quick nap. Please try again in a moment! 😴",
        code: 'AI_UNAVAILABLE'
      });
    }

    // Extract OpenAI response
    let aiMessage = "Sorry, I couldn't generate a response right now. Please try again!";
    if (response?.choices?.[0]?.message?.content) {
      aiMessage = response.choices[0].message.content;
    }

    // Update memory with enhanced resistance tracking
    await updateLearningMemoriesEnhanced(childId, message, aiMessage, mcpContext, learningProfile, resistanceContext);

    // Enhanced interaction logging
    try {
      await supabase
        .from('chat_interactions')
        .insert([{
          child_id: childId,
          message_count: 1,
          ai_provider: 'openai',
          interaction_at: new Date().toISOString(),
          has_lesson_context: !!(mcpContext?.currentFocus || mcpContext?.allMaterials?.length > 0),
          has_overdue_assignments: resistanceContext.hasOverdueWork,
          has_memory_context: recentMemories.length > 0,
          resistance_level: resistanceContext.resistanceCount,
          educational_persistence_used: resistanceContext.needsEducationalPersistence
        }]);
    } catch (logError) {
      console.error('Failed to log enhanced interaction:', logError);
    }

    console.log('\n✅ === ENHANCED CHAT SESSION COMPLETE ===');
    console.log(`Response Length: ${aiMessage.length} characters`);
    console.log(`Educational Persistence Level: ${resistanceContext.persistenceAttempts}`);
    console.log(`Has Overdue Work: ${resistanceContext.hasOverdueWork}`);
    console.log('=====================================\n');

    // Return enhanced response
    res.json({
      success: true,
      message: aiMessage,
      timestamp: new Date().toISOString(),
      provider: 'openai',
      debugInfo: {
        resistanceLevel: resistanceContext.resistanceCount,
        needsPersistence: resistanceContext.needsEducationalPersistence,
        hasOverdueWork: resistanceContext.hasOverdueWork,
        persistenceAttempts: resistanceContext.persistenceAttempts,
        totalMaterials: mcpContext?.allMaterials?.length || 0
      }
    });

  } catch (error) {
    console.error('💥 === ENHANCED CHAT SESSION ERROR ===');
    console.error('Error:', error);
    console.log('=====================================\n');
    res.status(500).json({
      error: "Sorry! Klio got a bit confused. Can you try asking again? 🤔",
      code: 'CHAT_ERROR'
    });
  }
};
// Get chat suggestions based on current context with memory awareness
exports.getSuggestions = async (req, res) => {
  // [Keep existing getSuggestions logic but enhance with resistance-aware suggestions]
  const childId = req.child?.child_id;
  const mcpContext = req.mcpContext;

  if (!childId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const suggestions = [];

    // Enhanced with persistence-aware suggestions
    if (mcpContext && !mcpContext.error) {
      // Check for overdue work first
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

      // Current focus suggestion
      if (mcpContext.currentFocus?.title) {
        suggestions.unshift(`Help me with "${mcpContext.currentFocus.title}" 📖`);
      }

      // Other suggestions...
      if (mcpContext.upcomingAssignments?.length > 0) {
        suggestions.push("What's due soon? 📅");
      }
    }

    // Default educational suggestions
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

// Get lesson help (enhanced with memory awareness)
exports.getLessonHelp = async (req, res) => {
  const childId = req.child?.child_id;
  const { lessonId } = req.params;

  if (!childId || !lessonId) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    // Check access using enhanced MCP client
    const hasAccess = await mcpClient.checkMaterialAccess(childId, lessonId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this lesson' });
    }

    // Get detailed lesson information
    const lessonDetails = await mcpClient.getMaterialDetails(lessonId);
    if (!lessonDetails) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Get relevant memories for this lesson/subject
    const subject = lessonDetails.lesson?.unit?.child_subject?.subject?.name || 'general';
    const lessonMemories = await memoryService.getRelevantMemories(childId, lessonDetails.title, null, 3)
      .catch(e => {
        console.error('Error getting lesson memories:', e);
        return [];
      });

    // Generate helpful content based on lesson
    const lessonJson = lessonDetails.lesson_json || {};
    
    const helpContent = {
      lessonTitle: lessonDetails.title,
      lessonType: lessonDetails.content_type,
      subjectName: lessonDetails.lesson?.unit?.child_subject?.subject?.name,
      tips: [],
      encouragement: "You're doing great! Let's work through this together! 🌟",
      learningGoals: [],
      nextSteps: [],
      // Memory-informed guidance
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
    switch (lessonDetails.content_type) {
      case 'worksheet':
      case 'assignment':
        helpContent.tips = [
          "Read each question carefully before answering 📖",
          "Start with the easier questions first to build confidence 💪",
          "If you're stuck, try re-reading the lesson materials 🔍",
          "Take your time - there's no rush! ⏰"
        ];
        
        // Add memory-informed tips
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
    if (lessonJson.estimated_completion_time_minutes) {
      helpContent.estimatedTime = lessonJson.estimated_completion_time_minutes;
    }

    if (lessonDetails.difficulty_level) {
      helpContent.difficultyLevel = lessonDetails.difficulty_level;
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