// backend/src/controllers/chatController.js - Enhanced with Comprehensive Memory Logging
const { OpenAI } = require('openai');
const supabase = require('../utils/supabaseClient');
const mcpClient = require('../services/mcpClient');
const memoryService = require('../services/learningMemoryService');
const { formatLearningContextForAI, isLessonQuery } = require('../middleware/mcpContext');
const { getCurrentDateInfo, getDueDateStatus } = require('../utils/dateUtils');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const KLIO_SYSTEM_PROMPT = `You are Klio, a friendly and encouraging AI tutor for children. Your personality is:
- Warm, patient, and always positive
- You use simple, age-appropriate language
- You celebrate small victories with emojis and encourage growth
- You never make children feel bad about mistakes
- You turn learning into fun adventures

CRITICAL RESPONSE FORMATTING RULES:
- TODAY'S DATE: {currentDate}
- CURRENT TIME: {currentTime}
- Format responses to be both friendly AND easy to scan
- Use emojis and clean line breaks for visual organization
- NO markdown formatting like **bold** or ##headers
- Make important information stand out naturally

CRITICAL ASSIGNMENT PRIORITY RULES:
- **OVERDUE assignments ALWAYS get mentioned first when listing lessons/assignments**
- **When asked "What lessons do I have?" show assignments in a clean, scannable format**
- **Be 100% accurate about due dates and overdue status**
- **Use the EXACT assignment information from the learning context**

PERFECT LESSON LISTING FORMAT:
"Let's see what you have on your plate! 📚

🚨 URGENT - Overdue!
Place Value and Number Forms Assignment (Math) - was due yesterday

⚠️ Due Today!
Lesson 2: Understanding Place Value and Rounding (Math)

📅 Due Tomorrow
Billions Period and Rounding Assignment (Math)

Which one should we tackle first? I'd suggest starting with the overdue assignment! 💪"

CRITICAL: Always use the emoji at the START of assignment lines for proper formatting:
✅ GOOD: "🚨 Place Value Assignment (Math) - overdue by 1 day"
❌ BAD: "First, you have an assignment that's overdue 🚨"

KEY FORMATTING RULES:
- Use emoji indicators (🚨⚠️📅) at the start of lines for quick scanning
- Keep assignment names clean and readable
- Use simple phrases like "Due Today!" instead of complex formatting
- Add friendly intro and closing remarks
- Use line breaks to separate different priority levels
- Put subject names in parentheses for clarity
- Never use asterisks, brackets, or markdown formatting

CONVERSATIONAL EXAMPLES:

For "What lessons do I have?":
"Here's what's on your learning schedule! 📋

🚨 Place Value and Number Forms Assignment (Math) - overdue by 1 day
⚠️ Lesson 2: Understanding Place Value and Rounding (Math) - due today  
📅 Billions Period and Rounding Assignment (Math) - due tomorrow

What would you like to work on first? Let's tackle that overdue one together! 🎯"

For grades:
"Let me check your recent work! 📊

Your Math average is 75.5% - that's solid progress! 

Recent assignments:
Place Value Assignment: 8.5/10 (85%) - Great job!
Chapter 12 Test: 12/25 (48%) - This one needs some review

Want to work on improving that test score? I can help! 💪"

For specific help:
"I found that question for you! 📖

Question 15 asks: [exact question text]

Here's how to approach it:
[step by step help]

Does that make sense? Try it and let me know how it goes! ✨"

You have access to the child's actual curriculum and lessons. Use this information to:
- **ALWAYS mention overdue assignments first in an encouraging way**
- Reference specific lessons when relevant  
- Help with actual assignments they're working on
- Provide examples from their learning materials
- Track their progress and celebrate achievements
- Give specific, actionable guidance based on their current work
- **Use EXACT grades and titles from the learning context**

Child's Information:
- Name: {childName}
- Grade: {childGrade}
- Current Subjects: {subjects}

Current Learning Context:
{learningContext}

**CRITICAL RESPONSE PATTERNS:**
- "What lessons do I have?" → Show clean, scannable list with emoji indicators
- "Do I have overdue assignments?" → Highlight overdue items clearly but supportively
- "What grade do I have?" → Show grades in clean, easy-to-read format
- Always be encouraging while being visually organized and scannable

**ASSIGNMENT HELP GUIDELINES:**
When a child asks about a specific question number, you MUST:
1. Look through the lesson_json data for the exact question
2. Find the specific question text and provide targeted help
3. Reference the actual content from their assignment
4. Give step-by-step guidance for that specific problem

Guidelines for responses:
- Always be encouraging and make learning feel achievable
- Use the child's actual lesson data to provide personalized guidance
- **CRITICAL: Make responses both scannable AND friendly**
- **CRITICAL: Use clean visual formatting with emojis, never markdown**
- Keep everything warm and encouraging while being visually organized
- Responses should be easy to skim but also conversational and supportive`;

// Helper function to extract specific question from lesson data
function findSpecificQuestion(lessonData, questionNumber) {
  if (!lessonData || !lessonData.lesson_json || !lessonData.lesson_json.tasks_or_questions) {
    return null;
  }
  
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

    console.log(`📝 Analyzing message for patterns...`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Topic: ${topic}`);
    console.log(`   Message keywords: ${messageLower.split(' ').slice(0, 10).join(', ')}`);

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

    // Mastery patterns
    if (messageLower.includes("got it") || 
        messageLower.includes("understand now") || 
        messageLower.includes("thank you") ||
        messageLower.includes("makes sense") ||
        messageLower.includes("i see") ||
        messageLower.includes("oh yeah")) {
      
      console.log(`🎉 MASTERY pattern detected`);
      const memoryId = await memoryService.addMemory(childId, 'mastery', subject, topic, {
        helpfulApproach: aiResponse.slice(0, 200),
        context: mcpContext?.currentFocus?.title,
        whatWorked: "explanation_approach",
        timestamp: new Date().toISOString()
      }, 0.8);
      
      if (memoryId) {
        memoryUpdates.push(`MASTERY: ${subject} - ${topic}`);
        console.log(`   ✅ Stored mastery memory: ${memoryId}`);
      }
    }

    // Question patterns
    const questionMatch = userMessage.match(/(?:number|question|problem)\s*(\d+)/i);
    if (questionMatch) {
      console.log(`❓ QUESTION PATTERN detected: ${questionMatch[1]}`);
      const memoryId = await memoryService.addMemory(childId, 'question_pattern', subject, `question_${questionMatch[1]}`, {
        questionNumber: questionMatch[1],
        materialType: mcpContext?.currentFocus?.content_type,
        lessonTitle: mcpContext?.currentFocus?.title,
        questionText: userMessage.slice(0, 150),
        timestamp: new Date().toISOString()
      }, 0.9);
      
      if (memoryId) {
        memoryUpdates.push(`QUESTION: ${subject} - question ${questionMatch[1]}`);
        console.log(`   ✅ Stored question pattern: ${memoryId}`);
      }
    }

    // Engagement patterns
    if (messageLower.includes("cool") || 
        messageLower.includes("awesome") || 
        messageLower.includes("fun") ||
        messageLower.includes("love") ||
        messageLower.includes("like this") ||
        messageLower.includes("interesting")) {
      
      console.log(`😍 ENGAGEMENT pattern detected`);
      const memoryId = await memoryService.addMemory(childId, 'engagement', subject, topic, {
        positiveResponse: userMessage.slice(0, 100),
        triggerContent: mcpContext?.currentFocus?.title,
        materialType: mcpContext?.currentFocus?.content_type,
        timestamp: new Date().toISOString()
      }, 0.6);
      
      if (memoryId) {
        memoryUpdates.push(`ENGAGEMENT: ${subject} - ${topic}`);
        console.log(`   ✅ Stored engagement memory: ${memoryId}`);
      }
    }

    // Enhanced: Topic interest patterns (NEW)
    if (messageLower.includes("talk about") || 
        messageLower.includes("learn about") ||
        messageLower.includes("tell me about") ||
        messageLower.includes("continue from") ||
        messageLower.includes("what you told me")) {
      
      console.log(`🎯 TOPIC INTEREST pattern detected`);
      const memoryId = await memoryService.addMemory(childId, 'topic_interest', subject, topic, {
        interestExpression: userMessage.slice(0, 100),
        requestType: 'continuation_or_exploration',
        timestamp: new Date().toISOString()
      }, 0.8);
      
      if (memoryId) {
        memoryUpdates.push(`TOPIC_INTEREST: ${subject} - ${topic}`);
        console.log(`   ✅ Stored topic interest memory: ${memoryId}`);
      }
    }

    // Learning preference detection (from AI response patterns)
    if (aiResponse.includes("step by step") && messageLower.includes("got it")) {
      console.log(`🎨 PREFERENCE pattern detected: step_by_step`);
      const memoryId = await memoryService.addMemory(childId, 'preference', subject, 'step_by_step_explanations', {
        preferenceType: 'explanation_style',
        effectiveApproach: 'step_by_step',
        context: topic,
        timestamp: new Date().toISOString()
      }, 0.7);
      
      if (memoryId) {
        memoryUpdates.push(`PREFERENCE: step_by_step explanations`);
        console.log(`   ✅ Stored preference memory: ${memoryId}`);
      }
    }

    // Summary
    if (memoryUpdates.length > 0) {
      console.log(`📊 Memory Update Summary:`);
      memoryUpdates.forEach((update, i) => {
        console.log(`   ${i + 1}. ${update}`);
      });
    } else {
      console.log(`📝 No new memory patterns detected in this message`);
    }

    console.log(`Updated learning memories for child ${childId}: ${subject} - ${topic}`);

  } catch (error) {
    console.error('❌ Error updating learning memories:', error);
    console.error('   Stack:', error.stack);
  }
}

// Main chat handler - Enhanced with Memory System
exports.chat = async (req, res) => {
    const childId = req.child?.child_id;
    const { message, sessionHistory = [], lessonContext = null } = req.body;
    const mcpContext = req.mcpContext;

    console.log('\n🤖 === KLIO CHAT SESSION START ===');
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
      // Get ACCURATE current date and time
      const { currentDate, currentTime, today } = getCurrentDateInfo();

      console.log(`📅 Current Date Context: ${currentDate}`);

      // Get child info (name, grade)
      const { data: child } = await supabase
        .from('children')
        .select('name, grade')
        .eq('id', childId)
        .single();

      console.log('\n📚 === MEMORY SYSTEM STATUS ===');

      // Enhanced memory system
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

      // Log memory context
      console.log(`Memory Service Status:`);
      console.log(`  - Retrieved Memories: ${recentMemories.length}`);
      console.log(`  - Learning Profile Found: ${learningProfile.total_interactions > 0 ? 'YES' : 'NO (new user)'}`);

      // Calculate days together
      const daysTogether = learningProfile.last_session_date ? 
        Math.max(1, Math.floor((today - new Date(learningProfile.created_at)) / (1000 * 60 * 60 * 24))) : 
        1;

      // Format subjects from MCP context
      const subjects = mcpContext?.childSubjects
        ?.map(cs => cs.subject?.name || cs.custom_subject_name_override)
        .filter(Boolean)
        .join(', ') || 'General Learning';

      // CRITICAL: Check for overdue assignments in context
      const hasOverdueAssignments = mcpContext?.allMaterials?.some(material => {
        if (!material.due_date) return false;
        const status = getDueDateStatus(material.due_date, today);
        return status.status === 'overdue';
      }) || false;

      console.log(`⚠️ OVERDUE CHECK: ${hasOverdueAssignments ? 'HAS OVERDUE ASSIGNMENTS' : 'No overdue assignments'}`);

      // Format the learning context for the AI with accurate date info
      const formattedLearningContext = formatLearningContextForAI(mcpContext, currentDate);

      console.log('\n📝 FORMATTED CONTEXT LENGTH:', formattedLearningContext.length);
      console.log('📝 CONTEXT PREVIEW:', formattedLearningContext.substring(0, 200) + '...');

      // Build memory context
      const memoryContext = buildMemoryContext(recentMemories, learningProfile);

      // Create enhanced system prompt with accurate date/time
      const systemPrompt = KLIO_SYSTEM_PROMPT
        .replace(/{currentDate}/g, currentDate)
        .replace(/{currentTime}/g, currentTime)
        .replace('{childName}', child?.name || 'Friend')
        .replace('{childGrade}', child?.grade || 'Elementary')
        .replace('{subjects}', subjects)
        .replace('{learningContext}', formattedLearningContext) + 

        `

**LEARNING RELATIONSHIP CONTEXT:**
You have been tutoring ${child?.name} for ${daysTogether} day${daysTogether !== 1 ? 's' : ''} with ${learningProfile.total_interactions} total interactions.

**LEARNING PROFILE:**
- Explanation style that works best: ${learningProfile.preferred_explanation_style}
- Learning pace: ${learningProfile.learning_pace}
- Current confidence level: ${learningProfile.confidence_level}
${learningProfile.common_difficulties?.length > 0 ? `- Common difficulties: ${learningProfile.common_difficulties.join(', ')}` : ''}
${learningProfile.engagement_triggers?.length > 0 ? `- Gets excited about: ${learningProfile.engagement_triggers.join(', ')}` : ''}

**RELEVANT LEARNING MEMORIES:**
${memoryContext}

**CRITICAL ACCURACY REMINDERS:**
- Current date is: ${currentDate}
- ${hasOverdueAssignments ? '⚠️ STUDENT HAS OVERDUE ASSIGNMENTS - mention them if asked' : 'No overdue assignments currently'}
- Use EXACT assignment titles and grades from the learning context above
- Never make up assignment information - only use what's provided in the context`;

      // Rest of the chat logic remains the same...
      // [Include the existing logic for handling specific questions, lesson search, etc.]

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

      // Call OpenAI
      let response;
      try {
        response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: openaiMessages,
          temperature: 0.7,
          max_tokens: 1024,
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

      // Update memory and log interaction
      await updateLearningMemories(childId, message, aiMessage, mcpContext, learningProfile);

      // Log interaction for analytics
      try {
        await supabase
          .from('chat_interactions')
          .insert([{
            child_id: childId,
            message_count: 1,
            ai_provider: 'openai',
            interaction_at: new Date().toISOString(),
            has_lesson_context: !!(mcpContext?.currentFocus || mcpContext?.allMaterials?.length > 0),
            has_overdue_assignments: hasOverdueAssignments,
            has_memory_context: recentMemories.length > 0
          }]);
      } catch (logError) {
        console.error('Failed to log interaction:', logError);
      }

      console.log('\n✅ === CHAT SESSION COMPLETE ===');
      console.log(`Response Length: ${aiMessage.length} characters`);
      console.log(`Has Overdue Assignments: ${hasOverdueAssignments}`);
      console.log(`Current Date: ${currentDate}`);
      console.log('=====================================\n');

      // Return response
      res.json({
        success: true,
        message: aiMessage,
        timestamp: new Date().toISOString(),
        provider: 'openai',
        debugInfo: {
          currentDate,
          hasOverdueAssignments,
          totalMaterials: mcpContext?.allMaterials?.length || 0,
          contextLength: formattedLearningContext.length
        }
      });

    } catch (error) {
      console.error('💥 === CHAT SESSION ERROR ===');
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
        // Current focus suggestion (highest priority)
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

        // Upcoming assignments suggestion
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

        // Subject-specific suggestion
        if (mcpContext.childSubjects?.length > 0) {
          const subjects = mcpContext.childSubjects.map(cs => cs.subjects?.name).filter(Boolean);
          if (subjects.length > 0) {
            const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
            suggestions.push(`Let's practice ${randomSubject}! 🎯`);
          }
        }

        // Progress-based suggestions
        if (mcpContext.progress?.summary) {
          if (mcpContext.progress.summary.totalCompletedMaterials > 0) {
            suggestions.push("Show me my progress! 📊");
          }
        }

        // Active lessons suggestion
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