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

async function getMaterialWithContent(childId, materialRef) {
  try {
    console.log(`🔍 Searching for material: "${materialRef}"`);
    
    // First try to get full content directly
    const materialContent = await mcpClient.getMaterialContent(childId, materialRef);
    if (materialContent) {
      console.log(`✅ Found material content: "${materialContent.material.title}"`);
      return materialContent;
    }

    // If direct lookup fails, try searching
    const searchResult = await mcpClient.search(childId, materialRef, 'assignments');
    const assignments = searchResult.results.assignments || [];
    
    if (assignments.length > 0) {
      const bestMatch = assignments.find(a => 
        a.title.toLowerCase().includes(materialRef.toLowerCase())
      ) || assignments[0];
      
      console.log(`🔍 Found material via search: "${bestMatch.title}"`);
      
      // Try to get full content for the found material
      const fullContent = await mcpClient.getMaterialContent(childId, bestMatch.title);
      return fullContent;
    }

    console.log(`❌ Material not found: "${materialRef}"`);
    return null;
  } catch (error) {
    console.error('❌ Error getting material with content:', error);
    return null;
  }
}
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

  if (!childId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const { currentDate, currentTime, today } = getCurrentDateInfo();

    // Get child info
    const { data: child } = await supabase
      .from('children')
      .select('name, grade')
      .eq('id', childId)
      .single();

    // 🎯 ENHANCED: Check for specific question requests
    const questionRequest = parseSpecificQuestionRequest(message);
    let materialContentForAI = '';
    let enhancedMcpContext = mcpContext;

    if (questionRequest) {
      console.log('🎯 Specific question request detected:', questionRequest);
      
      let materialRef = questionRequest.materialRef;
      
      // If no material specified, try to use current focus
      if (!materialRef && mcpContext?.currentFocus?.title) {
        materialRef = mcpContext.currentFocus.title;
        console.log(`🎯 Using current focus as material: "${materialRef}"`);
      }
      
      if (materialRef) {
        const materialData = await getMaterialWithContent(childId, materialRef);
        if (materialData) {
          materialContentForAI = formatMaterialContentForAI(materialData, questionRequest.questionNumber);
          
          // Enhance MCP context with the specific material
          enhancedMcpContext = {
            ...mcpContext,
            currentFocus: materialData.material,
            specificQuestion: {
              number: questionRequest.questionNumber,
              material: materialData
            }
          };
          
          console.log(`✅ Enhanced context with material content for question ${questionRequest.questionNumber}`);
        } else {
          materialContentForAI = `\n❌ **MATERIAL ACCESS ERROR**: Could not find "${materialRef}" or access its content. Please verify the material name and try again.\n`;
          console.log(`❌ Could not find material: "${materialRef}"`);
        }
      } else {
        materialContentForAI = `\n⚠️ **MATERIAL NOT SPECIFIED**: You asked about question ${questionRequest.questionNumber}, but didn't specify which assignment or material. Please specify the material name (e.g., "Chapter 12 Assessment question ${questionRequest.questionNumber}").\n`;
        console.log(`⚠️ Question request without material specification`);
      }
    }

    // Get memory context
    const [recentMemories, learningProfile] = await Promise.all([
      memoryService.getRelevantMemories(childId, message, enhancedMcpContext, 4).catch(e => {
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

    // Build memory context
    const memoryContext = buildMemoryContext(recentMemories, learningProfile);

    // Calculate days together
    const daysTogether = learningProfile.last_session_date ? 
      Math.max(1, Math.floor((today - new Date(learningProfile.created_at)) / (1000 * 60 * 60 * 24))) : 
      1;

    // Format subjects from MCP context
    const subjects = enhancedMcpContext?.childSubjects
      ?.map(cs => cs.subject?.name || cs.custom_subject_name_override)
      .filter(Boolean)
      .join(', ') || 'General Learning';

    // Check for overdue assignments
    const hasOverdueAssignments = enhancedMcpContext?.overdue?.some(material => {
      if (!material.due_date) return false;
      const status = getDueDateStatus(material.due_date, today);
      return status.status === 'overdue';
    }) || false;

    // Format the learning context for the AI
    const formattedLearningContext = formatLearningContextForAI(enhancedMcpContext, currentDate);

    // 🎯 ENHANCED: Create system prompt with material content
    const systemPrompt = KLIO_SYSTEM_PROMPT
      .replace(/{currentDate}/g, currentDate)
      .replace(/{currentTime}/g, currentTime)
      .replace('{childName}', child?.name || 'Friend')
      .replace('{childGrade}', child?.grade || 'Elementary')
      .replace('{subjects}', subjects)
      .replace('{learningContext}', formattedLearningContext) + 

      // 🎯 ADD MATERIAL CONTENT TO PROMPT
      materialContentForAI + 

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

**🚨 CRITICAL MATERIAL ACCESS PROTOCOL 🚨**
${materialContentForAI ? 
  `✅ ACTUAL MATERIAL CONTENT IS PROVIDED ABOVE

**MANDATORY RULES:**
- Use ONLY the exact questions shown in the material content above
- Quote the EXACT text from the material - never paraphrase or change it
- Never create similar problems or make up different questions  
- Never say you need to "access" or "pull up" materials when content is already provided
- Always reference the specific question number and exact text when helping

**EXAMPLE OF CORRECT RESPONSE:**
"Looking at your Chapter 12 Assessment, question 5 asks: '6 x 1/3'. Let me help you solve this step by step..."

**NEVER DO THIS:**
- Don't say "Let me access your materials"
- Don't create similar problems like recipe questions when the real question is different
- Don't paraphrase the question text` :
  `⚠️ NO SPECIFIC MATERIAL CONTENT PROVIDED

**REQUIRED ACTIONS:**
- If student asks about specific questions, tell them you need the material name
- Never make up questions or content
- Ask them to specify which assignment/material they're referring to
- Only then can you access the actual content`
}

**ACCURACY REMINDERS:**
- Current date is: ${currentDate}
- ${hasOverdueAssignments ? '⚠️ STUDENT HAS OVERDUE ASSIGNMENTS - mention them if asked' : 'No overdue assignments currently'}
- Use EXACT assignment titles and grades from the learning context above
- Never make up assignment information - only use what's provided in the context
- When material content is provided, use the EXACT question text, don't create similar problems`;

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

    // Update memory
    await updateLearningMemories(childId, message, aiMessage, enhancedMcpContext, learningProfile);

    // Log interaction for analytics
    try {
      await supabase
        .from('chat_interactions')
        .insert([{
          child_id: childId,
          message_count: 1,
          ai_provider: 'openai',
          interaction_at: new Date().toISOString(),
          has_lesson_context: !!(enhancedMcpContext?.currentFocus || enhancedMcpContext?.allMaterials?.length > 0),
          has_overdue_assignments: hasOverdueAssignments,
          has_memory_context: recentMemories.length > 0,
          has_material_content: !!materialContentForAI,
          specific_question_request: !!questionRequest
        }]);
    } catch (logError) {
      console.error('Failed to log interaction:', logError);
    }

    console.log('\n✅ === CHAT SESSION COMPLETE ===');
    console.log(`Response Length: ${aiMessage.length} characters`);
    console.log(`Has Material Content: ${!!materialContentForAI}`);
    console.log(`Question Request: ${questionRequest ? `Q${questionRequest.questionNumber}` : 'None'}`);

    // Return response
    res.json({
      success: true,
      message: aiMessage,
      timestamp: new Date().toISOString(),
      provider: 'openai',
      debugInfo: {
        currentDate,
        hasOverdueAssignments,
        totalMaterials: enhancedMcpContext?.allMaterials?.length || 0,
        contextLength: formattedLearningContext.length,
        hasMaterialContent: !!materialContentForAI,
        questionRequest: questionRequest || null
      }
    });

  } catch (error) {
    console.error('💥 === CHAT SESSION ERROR ===');
    console.error('Error:', error);
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
const shouldIncludeWorkspaceContent = (aiResponse, mcpContext) => {
  const response = aiResponse.toLowerCase();
  
  // Check for assignment-related content
  if (response.includes('assignment') && response.includes('learning goals')) {
    return {
      type: 'assignment_hint',
      lessonContext: mcpContext?.currentFocus
    };
  }
  
  // Check for specific question requests
  const questionMatch = response.match(/question\s*(\d+)/i);
  if (questionMatch && mcpContext?.currentFocus?.lesson_json) {
    return {
      type: 'specific_question',
      questionNumber: questionMatch[1],
      lessonContext: mcpContext.currentFocus
    };
  }
  
  return null;
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