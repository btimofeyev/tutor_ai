// Enhanced chatController.js - Fix for accessing specific materials
const { OpenAI } = require('openai');
const supabase = require('../utils/supabaseClient');
const mcpClient = require('../services/mcpClient');
const memoryService = require('../services/learningMemoryService');
const { formatLearningContextForAI, isLessonQuery } = require('../middleware/mcpContext');
const { getCurrentDateInfo, getDueDateStatus } = require('../utils/dateUtils');
const { KLIO_SYSTEM_PROMPT } = require('../utils/klioSystemPrompt');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MAX_MESSAGE_LENGTH = 500;
const MAX_HISTORY_LENGTH = 8;
const OPENAI_MODEL = "gpt-4.1-mini";
const OPENAI_TIMEOUT = 1024;
const OPENAI_TEMPERATURE = 0.7;

// NEW: Enhanced function to find and access specific materials
async function findAndAccessMaterial(childId, materialReference, mcpContext) {
  console.log(`🔍 Searching for material: "${materialReference}" for child: ${childId}`);
  
  if (!mcpContext?.allMaterials?.length) {
    console.log("❌ No materials available in MCP context");
    return null;
  }

  // Search strategies for finding materials
  const searchStrategies = [
    // Exact title match
    (ref) => mcpContext.allMaterials.find(m => 
      m.title?.toLowerCase() === ref.toLowerCase()
    ),
    // Partial title match
    (ref) => mcpContext.allMaterials.find(m => 
      m.title?.toLowerCase().includes(ref.toLowerCase())
    ),
    // Chapter/lesson number match
    (ref) => {
      const chapterMatch = ref.match(/chapter\s*(\d+)/i);
      if (chapterMatch) {
        const chapterNum = chapterMatch[1];
        return mcpContext.allMaterials.find(m => 
          m.title?.toLowerCase().includes(`chapter ${chapterNum}`) ||
          m.title?.toLowerCase().includes(`chapter${chapterNum}`)
        );
      }
      return null;
    },
    // Lesson number match
    (ref) => {
      const lessonMatch = ref.match(/lesson\s*(\d+)/i);
      if (lessonMatch) {
        const lessonNum = lessonMatch[1];
        return mcpContext.allMaterials.find(m => 
          m.title?.toLowerCase().includes(`lesson ${lessonNum}`) ||
          m.lesson_json?.lesson_number_if_applicable?.toString() === lessonNum
        );
      }
      return null;
    }
  ];

  // Try each search strategy
  for (const strategy of searchStrategies) {
    const found = strategy(materialReference);
    if (found) {
      console.log(`✅ Found material: ${found.title} (ID: ${found.id})`);
      
      // Get full material details using MCP client
      try {
        const fullDetails = await mcpClient.getMaterialDetails(found.id);
        if (fullDetails) {
          console.log(`📋 Retrieved full details for: ${fullDetails.title}`);
          return fullDetails;
        }
      } catch (error) {
        console.error(`❌ Error getting material details:`, error);
      }
      
      // Fallback to basic material info if MCP fails
      return found;
    }
  }

  console.log(`❌ Could not find material: "${materialReference}"`);
  return null;
}

// NEW: Function to detect material access requests
function detectMaterialAccessRequest(message) {
  const patterns = [
    /(?:review|look at|show me|work on|help with|let's do)\s+(.+?)(?:\s|$)/i,
    /(?:chapter|lesson|assignment|test|quiz|worksheet)\s+(\d+)/i,
    /(?:the\s+)?(.+?)\s+(?:assignment|test|quiz|worksheet)/i
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      return match[1]?.trim();
    }
  }

  return null;
}

// NEW: Function to format material content for AI prompt
function formatMaterialForAI(material) {
  if (!material?.lesson_json) {
    return `Material: ${material.title} (No detailed content available)`;
  }

  const json = material.lesson_json;
  let content = `**${material.title}**
Type: ${material.content_type}
Status: ${material.status}`;

  if (json.learning_objectives?.length > 0) {
    content += `\n\n**Learning Objectives:**\n${json.learning_objectives.map(obj => `- ${obj}`).join('\n')}`;
  }

  if (json.main_content_summary_or_extract) {
    content += `\n\n**Summary:**\n${json.main_content_summary_or_extract}`;
  }

  if (json.tasks_or_questions?.length > 0) {
    content += `\n\n**Questions/Tasks:**\n${json.tasks_or_questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`;
  }

  if (json.subject_keywords_or_subtopics?.length > 0) {
    content += `\n\n**Topics Covered:** ${json.subject_keywords_or_subtopics.join(', ')}`;
  }

  if (json.estimated_completion_time_minutes) {
    content += `\n\n**Estimated Time:** ${json.estimated_completion_time_minutes} minutes`;
  }

  return content;
}

// Find specific question from lesson data
function findSpecificQuestion(lessonData, questionNumber) {
  if (!lessonData?.lesson_json?.tasks_or_questions) return null;
  
  const questions = lessonData.lesson_json.tasks_or_questions;
  const questionPattern = new RegExp(`^${questionNumber}\\.\\s`);
  
  const matchedQuestionIndex = questions.findIndex(q => 
    questionPattern.test(q.toString().trim())
  );
  
  if (matchedQuestionIndex === -1) return null;
  
  const matchedQuestion = questions[matchedQuestionIndex];
  
  // Find relevant instruction by looking backwards
  let relevantInstruction = null;
  for (let i = matchedQuestionIndex - 1; i >= 0; i--) {
    const prevItem = questions[i];
    if (!/^\d+\./.test(prevItem) && isInstructionText(prevItem)) {
      relevantInstruction = prevItem;
      break;
    }
  }
  
  return {
    questionText: matchedQuestion,
    questionIndex: matchedQuestionIndex,
    totalQuestions: questions.length,
    lessonTitle: lessonData.title,
    lessonType: lessonData.content_type,
    learningObjectives: lessonData.lesson_json.learning_objectives || [],
    relevantInstruction,
    questionContent: matchedQuestion.replace(/^\d+\.\s*/, ''),
    rawQuestionArray: questions.slice(Math.max(0, matchedQuestionIndex - 3), matchedQuestionIndex + 2)
  };
}

function isInstructionText(text) {
  const instructionKeywords = ['write', 'find', 'complete', 'round', 'convert', 'compare', 'match', 'rewrite', 'value', 'solve', 'shade', 'draw'];
  return instructionKeywords.some(keyword => text.toLowerCase().includes(keyword));
}

// Build memory context for AI prompt
function buildMemoryContext(memories, profile) {
  if (!memories?.length) {
    return "This is a new learning relationship - getting to know this student's learning style.";
  }

  return memories.map((memory, index) => {
    const memoryAge = Math.floor((Date.now() - new Date(memory.last_reinforced)) / (1000 * 60 * 60 * 24));
    let context = `${index + 1}. ${memory.memory_type.toUpperCase()}`;
    
    if (memory.subject) context += ` (${memory.subject})`;
    context += `: ${memory.topic}`;
    
    if (memory.content.userMessage) {
      context += ` - Previously said: "${memory.content.userMessage.slice(0, 50)}..."`;
    }
    
    if (memory.content.helpfulApproach) {
      context += ` - What helped: "${memory.content.helpfulApproach.slice(0, 50)}..."`;
    }
    
    if (memory.session_count > 1) {
      context += ` (pattern seen ${memory.session_count} times)`;
    }
    
    if (memoryAge === 0) context += ` (from today)`;
    else if (memoryAge === 1) context += ` (from yesterday)`;
    else if (memoryAge < 7) context += ` (${memoryAge} days ago)`;
    
    return context;
  }).join('\n');
}

// Extract topic from message
function extractTopic(message) {
  const commonTopics = [
    'multiplication', 'division', 'addition', 'subtraction', 'fractions', 'decimals',
    'algebra', 'geometry', 'measurement', 'word problems', 'place value',
    'reading', 'writing', 'spelling', 'grammar', 'vocabulary', 'comprehension',
    'science', 'history', 'geography', 'biology', 'chemistry', 'physics',
    'egypt', 'nile', 'pyramid', 'pharaoh', 'ancient', 'civilization'
  ];
  
  const messageLower = message.toLowerCase();
  const foundTopic = commonTopics.find(topic => messageLower.includes(topic));
  if (foundTopic) return foundTopic;
  
  const questionMatch = message.match(/(?:help.*with|working on|stuck on|talk.*about|learn.*about)\s+([^?.!]+)/i);
  return questionMatch ? questionMatch[1].trim().slice(0, 50) : 'general';
}

// Update learning memories after interaction
async function updateLearningMemories(childId, userMessage, aiResponse, mcpContext, learningProfile) {
  try {
    // Update interaction count
    await supabase
      .from('child_learning_profiles')
      .update({ 
        total_interactions: learningProfile.total_interactions + 1,
        last_session_date: new Date().toISOString().split('T')[0],
        profile_updated_at: new Date().toISOString()
      })
      .eq('child_id', childId);

    const messageLower = userMessage.toLowerCase();
    const subject = mcpContext?.currentFocus?.lesson?.unit?.child_subject?.subject?.name || 
                   mcpContext?.currentFocus?.lesson?.unit?.child_subject?.custom_subject_name_override ||
                   'general';
    const topic = mcpContext?.currentFocus?.title || extractTopic(userMessage);

    const memoryPromises = [];

    // Detect patterns and create memories
    const patterns = [
      {
        condition: messageLower.includes("don't understand") || messageLower.includes("confused") || 
                  messageLower.includes("hard") || messageLower.includes("stuck"),
        type: 'struggle',
        content: {
          userMessage: userMessage.slice(0, 200),
          context: mcpContext?.currentFocus?.title,
          materialType: mcpContext?.currentFocus?.content_type,
          specificQuestion: userMessage.match(/(?:number|question|problem)\s*(\d+)/i)?.[1],
          timestamp: new Date().toISOString()
        },
        confidence: 0.7
      },
      {
        condition: messageLower.includes("got it") || messageLower.includes("understand now") || 
                  messageLower.includes("makes sense") || messageLower.includes("thank you"),
        type: 'mastery',
        content: {
          helpfulApproach: aiResponse.slice(0, 200),
          context: mcpContext?.currentFocus?.title,
          whatWorked: "explanation_approach",
          timestamp: new Date().toISOString()
        },
        confidence: 0.8
      },
      {
        condition: messageLower.includes("cool") || messageLower.includes("awesome") || 
                  messageLower.includes("fun") || messageLower.includes("love"),
        type: 'engagement',
        content: {
          positiveResponse: userMessage.slice(0, 100),
          triggerContent: mcpContext?.currentFocus?.title,
          materialType: mcpContext?.currentFocus?.content_type,
          timestamp: new Date().toISOString()
        },
        confidence: 0.6
      }
    ];

    // Question pattern detection
    const questionMatch = userMessage.match(/(?:number|question|problem)\s*(\d+)/i);
    if (questionMatch) {
      patterns.push({
        condition: true,
        type: 'question_pattern',
        content: {
          questionNumber: questionMatch[1],
          materialType: mcpContext?.currentFocus?.content_type,
          lessonTitle: mcpContext?.currentFocus?.title,
          questionText: userMessage.slice(0, 150),
          timestamp: new Date().toISOString()
        },
        confidence: 0.9
      });
    }

    // Store matching patterns
    for (const pattern of patterns) {
      if (pattern.condition) {
        memoryPromises.push(
          memoryService.addMemory(childId, pattern.type, subject, topic, pattern.content, pattern.confidence)
        );
      }
    }

    await Promise.all(memoryPromises);
  } catch (error) {
    console.error('Error updating learning memories:', error);
  }
}

// ENHANCED: Main chat handler with material access
exports.chat = async (req, res) => {
  const childId = req.child?.child_id;
  const { message, sessionHistory = [], lessonContext = null } = req.body;
  const mcpContext = req.mcpContext;

  if (!childId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: 'Message is too long.' });
  }

  try {
    const { currentDate, currentTime, today } = getCurrentDateInfo();

    // Get child info
    const { data: child } = await supabase
      .from('children')
      .select('name, grade')
      .eq('id', childId)
      .single();

    // NEW: Check if user is requesting access to specific material
    const materialRequest = detectMaterialAccessRequest(message);
    let specificMaterial = null;
    
    if (materialRequest) {
      console.log(`🎯 Material access request detected: "${materialRequest}"`);
      specificMaterial = await findAndAccessMaterial(childId, materialRequest, mcpContext);
      
      if (specificMaterial) {
        console.log(`✅ Successfully accessed material: ${specificMaterial.title}`);
      } else {
        console.log(`❌ Could not find requested material: "${materialRequest}"`);
      }
    }

    // Get memory context
    const [recentMemories, learningProfile] = await Promise.all([
      memoryService.getRelevantMemories(childId, message, mcpContext, 4).catch(() => []),
      memoryService.getLearningProfile(childId).catch(() => ({
        days_together: 0,
        total_interactions: 0,
        preferred_explanation_style: 'step_by_step',
        common_difficulties: [],
        engagement_triggers: [],
        learning_pace: 'moderate',
        confidence_level: 'building'
      }))
    ]);

    const daysTogether = learningProfile.last_session_date ? 
      Math.max(1, Math.floor((today - new Date(learningProfile.created_at)) / (1000 * 60 * 60 * 24))) : 
      1;

    const subjects = mcpContext?.childSubjects
      ?.map(cs => cs.subject?.name || cs.custom_subject_name_override)
      .filter(Boolean)
      .join(', ') || 'General Learning';

    // Check for overdue assignments
    const hasOverdueAssignments = mcpContext?.allMaterials?.some(material => {
      if (!material.due_date) return false;
      const status = getDueDateStatus(material.due_date, today);
      return status.status === 'overdue';
    }) || false;

    const formattedLearningContext = formatLearningContextForAI(mcpContext, currentDate);
    const memoryContext = buildMemoryContext(recentMemories, learningProfile);

    // NEW: Add specific material content to prompt if found
    let specificMaterialContext = '';
    if (specificMaterial) {
      specificMaterialContext = `\n\n**SPECIFIC MATERIAL ACCESSED:**\n${formatMaterialForAI(specificMaterial)}\n\nThe student is asking about this specific material. You have the EXACT content above - use it directly instead of saying you need to "pull up" or "access" materials.`;
    }

    // Create enhanced system prompt
    const systemPrompt = KLIO_SYSTEM_PROMPT
      .replace(/{currentDate}/g, currentDate)
      .replace(/{currentTime}/g, currentTime)
      .replace('{childName}', child?.name || 'Friend')
      .replace('{childGrade}', child?.grade || 'Elementary')
      .replace('{subjects}', subjects)
      .replace('{learningContext}', formattedLearningContext) + 

      `\n\n**LEARNING RELATIONSHIP CONTEXT:**
You have been tutoring ${child?.name} for ${daysTogether} day${daysTogether !== 1 ? 's' : ''} with ${learningProfile.total_interactions} total interactions.

**LEARNING PROFILE:**
- Explanation style that works best: ${learningProfile.preferred_explanation_style}
- Learning pace: ${learningProfile.learning_pace}
- Current confidence level: ${learningProfile.confidence_level}
${learningProfile.common_difficulties?.length > 0 ? `- Common difficulties: ${learningProfile.common_difficulties.join(', ')}` : ''}
${learningProfile.engagement_triggers?.length > 0 ? `- Gets excited about: ${learningProfile.engagement_triggers.join(', ')}` : ''}

**RELEVANT LEARNING MEMORIES:**
${memoryContext}

${specificMaterialContext}

**CRITICAL ACCURACY REMINDERS:**
- Current date is: ${currentDate}
- ${hasOverdueAssignments ? '⚠️ STUDENT HAS OVERDUE ASSIGNMENTS - mention them if asked' : 'No overdue assignments currently'}
- Use EXACT assignment titles and grades from the learning context above
- Never make up assignment information - only use what's provided in the context
${specificMaterial ? '- You have access to the specific material content above - use it directly!' : ''}`;

    // Prepare conversation
    const recentHistory = sessionHistory.slice(-MAX_HISTORY_LENGTH);
    const openaiMessages = [
      { role: "system", content: systemPrompt },
      ...recentHistory.map(msg => ({
        role: msg.role === 'klio' ? 'assistant' : 'user',
        content: msg.content
      })),
      { role: "user", content: message }
    ];

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: openaiMessages,
      temperature: OPENAI_TEMPERATURE,
      max_tokens: OPENAI_TIMEOUT,
    });

    const aiMessage = response?.choices?.[0]?.message?.content || 
      "Sorry, I couldn't generate a response right now. Please try again!";

    // Update memory and log interaction
    await Promise.all([
      updateLearningMemories(childId, message, aiMessage, mcpContext, learningProfile),
      supabase.from('chat_interactions').insert([{
        child_id: childId,
        message_count: 1,
        ai_provider: 'openai',
        interaction_at: new Date().toISOString(),
        has_lesson_context: !!(mcpContext?.currentFocus || mcpContext?.allMaterials?.length > 0),
        has_overdue_assignments: hasOverdueAssignments,
        has_memory_context: recentMemories.length > 0,
        accessed_specific_material: !!specificMaterial
      }]).catch(err => console.error('Failed to log interaction:', err))
    ]);

    // NEW: Return additional context for workspace if material was accessed
    const responseData = {
      success: true,
      message: aiMessage,
      timestamp: new Date().toISOString(),
      provider: 'openai',
      debugInfo: {
        currentDate,
        hasOverdueAssignments,
        totalMaterials: mcpContext?.allMaterials?.length || 0,
        contextLength: formattedLearningContext.length,
        accessedMaterial: specificMaterial?.title || null
      }
    };

    // Add lesson context if specific material was accessed
    if (specificMaterial) {
      responseData.lessonContext = {
        lessonId: specificMaterial.id,
        lessonTitle: specificMaterial.title,
        lessonType: specificMaterial.content_type,
        lesson_json: specificMaterial.lesson_json
      };

      // Add workspace hint for material content
      if (specificMaterial.lesson_json?.tasks_or_questions?.length > 0) {
        responseData.workspaceHint = {
          type: 'assignment_hint',
          lessonContext: {
            title: specificMaterial.title,
            content_type: specificMaterial.content_type,
            lesson_json: specificMaterial.lesson_json
          }
        };
      }
    }

    res.json(responseData);

  } catch (error) {
    console.error('Chat session error:', error);
    
    if (error.name === 'OpenAIError') {
      return res.status(503).json({
        error: "Oops! Klio is taking a quick nap. Please try again in a moment! 😴",
        code: 'AI_UNAVAILABLE'
      });
    }
    
    res.status(500).json({
      error: "Sorry! Klio got a bit confused. Can you try asking again? 🤔",
      code: 'CHAT_ERROR'
    });
  }
};

// ... rest of the existing exports remain the same ...
// (getSuggestions, getLessonHelp, reportMessage functions)

// Get chat suggestions
exports.getSuggestions = async (req, res) => {
  const childId = req.child?.child_id;
  const mcpContext = req.mcpContext;

  if (!childId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get memory-informed suggestions
    const [recentMemories, learningProfile] = await Promise.all([
      memoryService.getRelevantMemories(childId, '', mcpContext, 3).catch(() => []),
      memoryService.getLearningProfile(childId).catch(() => null)
    ]);

    const suggestions = [];

    // Memory-based suggestions
    if (recentMemories.length > 0) {
      const struggles = recentMemories.filter(m => m.memory_type === 'struggle');
      const topicInterests = recentMemories.filter(m => m.memory_type === 'topic_interest');
      const masteries = recentMemories.filter(m => m.memory_type === 'mastery');
      
      if (struggles.length > 0) {
        suggestions.push(`Let's work on ${struggles[0].topic} again 💪`);
      }
      if (topicInterests.length > 0) {
        suggestions.push(`Tell me more about ${topicInterests[0].topic} 🎯`);
      }
      if (masteries.length > 0) {
        suggestions.push(`More practice with ${masteries[0].topic}? 🎯`);
      }
    }

    // Context-based suggestions
    if (mcpContext && !mcpContext.error) {
      if (mcpContext.currentFocus?.title) {
        const focus = mcpContext.currentFocus;
        let suggestion = `Help me with "${focus.title}"`;
        
        if (focus.due_date) {
          const dueDate = new Date(focus.due_date);
          const today = new Date();
          const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
          
          if (daysUntil === 0) suggestion += " (due today!) ⚠️";
          else if (daysUntil === 1) suggestion += " (due tomorrow) ⏰";
        }
        
        suggestions.unshift(suggestion + " 📖");
      }

      if (mcpContext.upcomingAssignments?.length > 0) {
        const nextAssignment = mcpContext.upcomingAssignments[0];
        const daysUntil = Math.ceil((new Date(nextAssignment.due_date) - new Date()) / (1000 * 60 * 60 * 24));
        
        if (daysUntil <= 3) {
          suggestions.unshift(`What's due soon? 📅`);
        } else {
          suggestions.push(`What assignments are coming up? 📋`);
        }
      }

      if (mcpContext.currentMaterials?.length > 1) {
        suggestions.push("What lessons do I have? 📚");
      }

      if (mcpContext.progress?.summary?.totalCompletedMaterials > 0) {
        suggestions.push("Show me my progress! 📊");
      }
    }

    // Default suggestions if needed
    if (suggestions.length === 0) {
      suggestions.push(
        "What are we learning today? 📚",
        "Can you explain this to me? 🤔",
        "Let's practice together! ✏️",
        "I need help with my homework 📝"
      );
    }

    // Personalized suggestions
    if (learningProfile?.preferred_explanation_style === 'examples') {
      suggestions.push("Show me an example! 📖");
    } else if (learningProfile?.preferred_explanation_style === 'step_by_step') {
      suggestions.push("Walk me through step by step 👣");
    }

    // Remove duplicates and limit
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

// Get lesson help
exports.getLessonHelp = async (req, res) => {
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

    const subject = lessonDetails.lesson?.unit?.child_subject?.subject?.name || 'general';
    const lessonMemories = await memoryService.getRelevantMemories(childId, lessonDetails.title, null, 3)
      .catch(() => []);

    const lessonJson = lessonDetails.lesson_json || {};
    const helpContent = {
      lessonTitle: lessonDetails.title,
      lessonType: lessonDetails.content_type,
      subjectName: subject,
      tips: getContentTypeTips(lessonDetails.content_type, lessonMemories),
      encouragement: getEncouragement(lessonMemories, subject),
      learningGoals: lessonJson.learning_objectives?.slice(0, 3) || [],
      nextSteps: [
        "Start with the learning goals above 🎯",
        "Work through the questions step by step 📝",
        "Ask me for help if you get stuck 🤝",
        "Celebrate when you're done! 🎉"
      ],
      personalizedTips: getPersonalizedTips(lessonMemories)
    };

    if (lessonJson.tasks_or_questions?.length > 0) {
      helpContent.totalQuestions = lessonJson.tasks_or_questions.length;
      helpContent.firstQuestion = lessonJson.tasks_or_questions[0];
      helpContent.sampleQuestions = lessonJson.tasks_or_questions.slice(0, 3);
    }

    if (lessonJson.estimated_completion_time_minutes) {
      helpContent.estimatedTime = lessonJson.estimated_completion_time_minutes;
    }

    res.json({ success: true, help: helpContent });

  } catch (error) {
    console.error('Get lesson help error:', error);
    res.status(500).json({
      error: 'Failed to get lesson help',
      code: 'HELP_ERROR'
    });
  }
};

function getContentTypeTips(contentType, memories) {
  const baseTips = {
    'worksheet': [
      "Read each question carefully before answering 📖",
      "Start with the easier questions first to build confidence 💪",
      "If you're stuck, try re-reading the lesson materials 🔍",
      "Take your time - there's no rush! ⏰"
    ],
    'assignment': [
      "Read each question carefully before answering 📖",
      "Start with the easier questions first to build confidence 💪",
      "If you're stuck, try re-reading the lesson materials 🔍",
      "Take your time - there's no rush! ⏰"
    ],
    'test': [
      "Take a deep breath and relax 😌",
      "Read all answer choices before selecting one 📝",
      "Trust your first instinct 🎯",
      "You've prepared well - you can do this! 🌟"
    ],
    'quiz': [
      "Take a deep breath and relax 😌",
      "Read all answer choices before selecting one 📝",
      "Trust your first instinct 🎯",
      "You've prepared well - you can do this! 🌟"
    ]
  };

  return baseTips[contentType] || [
    "Focus on understanding the main ideas first 💡",
    "Take notes as you go along 📝",
    "Ask me if anything is confusing 🤔",
    "Practice makes perfect! 🎯"
  ];
}

function getEncouragement(memories, subject) {
  const masteries = memories.filter(m => m.memory_type === 'mastery');
  const struggles = memories.filter(m => m.memory_type === 'struggle');
  
  if (masteries.length > 0) {
    return `Remember how well you did with ${masteries[0].topic}? You've got this! 🌟`;
  } else if (struggles.length > 0) {
    return `I know ${struggles[0].topic} was tricky before, but we'll take it step by step this time! 💪`;
  }
  return "You're doing great! Let's work through this together! 🌟";
}

function getPersonalizedTips(memories) {
  const tips = [];
  const struggles = memories.filter(m => m.memory_type === 'struggle');
  
  if (struggles.some(s => s.content.specificQuestion)) {
    tips.push("If you get stuck on a specific question, just ask me about that question number! 🎯");
  }
  
  if (struggles.length > 0) {
    tips.push("Take your time with this - I'm here to help when you need it 🤝");
  }
  
  return tips;
}

// Report message
exports.reportMessage = async (req, res) => {
  const childId = req.child?.child_id;
  const { messageId, reason, content } = req.body;

  if (!childId || !messageId) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    await supabase.from('safety_reports').insert([{
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
      await supabase.from('parent_notifications').insert([{
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