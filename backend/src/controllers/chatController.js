// backend/src/controllers/chatController.js - Complete Enhanced Version
const { OpenAI } = require('openai');
const supabase = require('../utils/supabaseClient');
const mcpClient = require('../services/mcpClient');
const { formatLearningContextForAI, isLessonQuery } = require('../middleware/mcpContext');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const KLIO_SYSTEM_PROMPT = `You are Klio, a friendly and encouraging AI tutor for children. Your personality is:
- Warm, patient, and always positive
- You use simple, age-appropriate language
- You celebrate small victories with emojis and encouragement
- You never make children feel bad about mistakes
- You turn learning into fun adventures

IMPORTANT CONTEXT:
- TODAY'S DATE: {currentDate}
- CURRENT TIME: {currentTime}

You have access to the child's actual curriculum and lessons. Use this information to:
- Reference specific lessons when relevant
- Help with actual assignments they're working on
- Provide examples from their learning materials
- Track their progress and celebrate achievements
- Suggest what to study next based on their curriculum
- Give specific, actionable guidance based on their current work
- **ACCURATELY determine if assignments are due TODAY, TOMORROW, or OVERDUE based on the current date above**

Child's Information:
- Name: {childName}
- Grade: {childGrade}
- Current Subjects: {subjects}

Current Learning Context:
{learningContext}

**SPECIFIC ASSIGNMENT HELP GUIDELINES:**
When a child asks about a specific question number (like "help me with number 7" or "question 15"), you MUST:
1. Look through the lesson_json data for the exact question they're asking about
2. Find the specific question text and provide targeted help
3. Reference the actual content from their assignment
4. Give step-by-step guidance for that specific problem
5. Use examples that match the format and style of their assignment

**Date Guidelines:**
- When asked about today's date, always use the date provided above: {currentDate}
- When calculating due dates, use {currentDate} as your reference point
- If something is due on {currentDate}, say it's due TODAY
- If something is due tomorrow, calculate based on {currentDate}
- Be precise about overdue items by comparing against {currentDate}

Guidelines for responses:
- If they ask "what lessons do I have" or similar, list their actual upcoming lessons/assignments
- If they need help with homework, check if it matches any of their current lessons
- If they ask what to study next, suggest based on their actual curriculum sequence
- Always be encouraging and make learning feel achievable
- Use the child's actual lesson data to provide personalized guidance
- **When they ask about specific question numbers, find and help with that exact question**`;

// Helper function to extract specific question from lesson data
function findSpecificQuestion(lessonData, questionNumber) {
  if (!lessonData || !lessonData.lesson_json || !lessonData.lesson_json.tasks_or_questions) {
    return null;
  }
  
  const questions = lessonData.lesson_json.tasks_or_questions;
  
  // Try to find question by number pattern - be more specific
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
    // Look for instruction patterns (sentences that don't start with numbers)
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
  
  // Also look for section headers or categories - be more flexible
  let sectionContext = null;
  for (let i = matchedQuestionIndex - 1; i >= 0; i--) {
    const prevItem = questions[i];
    if (prevItem.length < 80 && !prevItem.match(/^\d+\./)) {
      // More flexible section detection
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
    // Extract just the number/content without the question number
    questionContent: matchedQuestion.replace(/^\d+\.\s*/, ''),
    // Add the raw question for debugging
    rawQuestionArray: questions.slice(Math.max(0, matchedQuestionIndex - 3), matchedQuestionIndex + 2)
  };
}

// Helper function to find lesson by number/title
function findLessonByReference(mcpContext, lessonRef) {
  if (!mcpContext || !mcpContext.currentMaterials) return null;
  
  // Try to find by lesson number
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
  
  // Try to find by title containing the reference
  return mcpContext.currentMaterials.find(material => 
    material.title && material.title.toLowerCase().includes(lessonRef.toLowerCase())
  );
}

// Main chat handler - Enhanced
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
    if (message.length > 500) {
      return res.status(400).json({ error: 'Message is too long.' });
    }

    try {
      // Get current date and time - THIS IS THE KEY FIX
      const now = new Date();
      const currentDate = now.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const currentTime = now.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });

      // Get child info (name, grade)
      const { data: child } = await supabase
        .from('children')
        .select('name, grade')
        .eq('id', childId)
        .single();

      // Format subjects from MCP context
      const subjects = mcpContext?.childSubjects
        ?.map(cs => cs.subjects?.name)
        .filter(Boolean)
        .join(', ') || 'General Learning';

      // ENHANCED: Look for specific question references
      let specificQuestionData = null;
      let targetLessonData = null;
      
      // Check for patterns like "number 7", "question 15", "problem 3", etc.
      const questionNumberMatch = message.match(/(?:number|question|problem|item)\s*(\d+)/i);
      const lessonReferenceMatch = message.match(/lesson\s*(\d+|[a-z]+)/i);
      
      if (questionNumberMatch || lessonReferenceMatch) {
        console.log('Detected specific question/lesson reference:', {
          questionNumber: questionNumberMatch?.[1],
          lessonReference: lessonReferenceMatch?.[0]
        });
        
        // First, try to find the specific lesson being referenced
        if (lessonReferenceMatch) {
          targetLessonData = findLessonByReference(mcpContext, lessonReferenceMatch[0]);
          console.log('Found target lesson:', targetLessonData?.title);
        }
        
        // If we have a question number, look for it in the target lesson or current focus
        if (questionNumberMatch) {
          const questionNumber = questionNumberMatch[1];
          
          // Try target lesson first, then current focus, then all current materials
          const searchOrder = [
            targetLessonData,
            mcpContext?.currentFocus,
            ...(mcpContext?.currentMaterials || [])
          ].filter(Boolean);
          
          for (const lessonData of searchOrder) {
            specificQuestionData = findSpecificQuestion(lessonData, questionNumber);
            if (specificQuestionData) {
              targetLessonData = lessonData;
              console.log('Found specific question:', {
                questionText: specificQuestionData.questionText,
                lessonTitle: specificQuestionData.lessonTitle
              });
              break;
            }
          }
        }
      }

      // Check if this is a lesson-related query and we should search for specific content
      let additionalLessonData = null;
      const isQueryAboutLessons = isLessonQuery(message);

      if (isQueryAboutLessons || message.toLowerCase().includes('help')) {
        try {
          // Try to find relevant lesson content
          const searchResults = await mcpClient.searchMaterials(message, childId);
          if (searchResults.length > 0) {
            additionalLessonData = searchResults[0];
            
            // Get full lesson details if available
            if (additionalLessonData.id) {
              const lessonDetails = await mcpClient.getMaterialDetails(additionalLessonData.id);
              if (lessonDetails) {
                additionalLessonData = lessonDetails;
              }
            }
          }
        } catch (searchError) {
          console.error('Error searching lessons:', searchError);
        }
      }

      // Format the learning context for the AI
      const formattedLearningContext = formatLearningContextForAI(mcpContext, currentDate);

      // Create enhanced system prompt with current date and time
      const systemPrompt = KLIO_SYSTEM_PROMPT
        .replace(/{currentDate}/g, currentDate)
        .replace(/{currentTime}/g, currentTime)
        .replace('{childName}', child?.name || 'Friend')
        .replace('{childGrade}', child?.grade || 'Elementary')
        .replace('{subjects}', subjects)
        .replace('{learningContext}', formattedLearningContext);

      // ENHANCED: Build additional context with specific question details
      let additionalContext = "";
      
      if (specificQuestionData) {
        additionalContext += `

🎯 **SPECIFIC QUESTION HELP REQUEST**:
The student is asking about question ${questionNumberMatch[1]} from "${specificQuestionData.lessonTitle}"

**Question Context**:
- Question number: ${questionNumberMatch[1]}
- Content: "${specificQuestionData.questionContent}"
- Relevant instruction: "${specificQuestionData.relevantInstruction || 'See assignment context'}"
- Section: "${specificQuestionData.sectionContext || 'General practice'}"
- Lesson: "${specificQuestionData.lessonTitle}" (${targetLessonData?.content_type})
- Learning objectives: ${specificQuestionData.learningObjectives.join(', ')}

**CRITICAL TEACHING INSTRUCTIONS**: 
- DO NOT give the direct answer
- DO NOT hallucinate or make up question content
- USE ONLY the exact question content provided: "${specificQuestionData.questionContent}"
- Guide the student step-by-step through the thinking process for THIS SPECIFIC QUESTION
- Ask clarifying questions to check their understanding
- Encourage them to try each step before moving to the next
- Celebrate their thinking and effort
- If they're stuck, give hints rather than solutions
- Reference the specific instruction: "${specificQuestionData.relevantInstruction}"
- Help them understand the CONCEPT behind this type of problem
- NEVER invent different numbers or change the question content`;

        if (targetLessonData?.due_date) {
          const dueDate = new Date(targetLessonData.due_date + 'T00:00:00');
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          dueDate.setHours(0, 0, 0, 0);
          
          const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
          
          additionalContext += `\n- **Due**: ${dueDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`;
          
          if (daysUntil < 0) {
            additionalContext += ` (OVERDUE by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''}) 🚨`;
          } else if (daysUntil === 0) {
            additionalContext += ` (DUE TODAY!) ⚠️`;
          } else if (daysUntil === 1) {
            additionalContext += ` (DUE TOMORROW) ⏰`;
          }
        }
      } else if (targetLessonData && targetLessonData.lesson_json) {
        // Add lesson context even if we didn't find the specific question
        additionalContext += `

📚 **LESSON CONTEXT**:
- **Title**: ${targetLessonData.title}
- **Type**: ${targetLessonData.content_type}`;

        if (targetLessonData.lesson_json.tasks_or_questions) {
          additionalContext += `\n- **Available Questions/Tasks**: ${targetLessonData.lesson_json.tasks_or_questions.length} total`;
          
          // Show first few questions as examples
          const firstFewQuestions = targetLessonData.lesson_json.tasks_or_questions.slice(0, 5);
          additionalContext += `\n- **Sample Questions**:`;
          firstFewQuestions.forEach((q, i) => {
            additionalContext += `\n  ${i + 1}. ${q}`;
          });
          if (targetLessonData.lesson_json.tasks_or_questions.length > 5) {
            additionalContext += `\n  ... and ${targetLessonData.lesson_json.tasks_or_questions.length - 5} more`;
          }
        }
      }

      // Add lesson details if found with date-aware context
      if (additionalLessonData && additionalLessonData.lesson_json && !specificQuestionData) {
        additionalContext += `

📚 **RELEVANT LESSON INFORMATION**:
- **Title**: ${additionalLessonData.title}
- **Type**: ${additionalLessonData.content_type}
- **Subject**: ${additionalLessonData.lesson?.unit?.child_subject?.subject?.name || 'General'}`;

        if (additionalLessonData.due_date) {
          const dueDate = new Date(additionalLessonData.due_date + 'T00:00:00');
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          dueDate.setHours(0, 0, 0, 0);
          
          const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
          
          additionalContext += `\n- **Due**: ${dueDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`;
          
          if (daysUntil < 0) {
            additionalContext += ` (OVERDUE by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''}) 🚨`;
          } else if (daysUntil === 0) {
            additionalContext += ` (DUE TODAY!) ⚠️`;
          } else if (daysUntil === 1) {
            additionalContext += ` (DUE TOMORROW) ⏰`;
          } else if (daysUntil <= 7) {
            additionalContext += ` (Due in ${daysUntil} days)`;
          }
        }

        if (additionalLessonData.lesson_json.learning_objectives) {
          additionalContext += `\n- **Learning Goals**: ${additionalLessonData.lesson_json.learning_objectives.join(', ')}`;
        }

        if (additionalLessonData.lesson_json.tasks_or_questions) {
          additionalContext += `\n- **Tasks/Questions** (${additionalLessonData.lesson_json.tasks_or_questions.length} total):`;
          additionalLessonData.lesson_json.tasks_or_questions.slice(0, 3).forEach((task, index) => {
            additionalContext += `\n  ${index + 1}. ${task}`;
          });
          if (additionalLessonData.lesson_json.tasks_or_questions.length > 3) {
            additionalContext += `\n  ... and ${additionalLessonData.lesson_json.tasks_or_questions.length - 3} more`;
          }
        }

        if (additionalLessonData.lesson_json.main_content_summary_or_extract) {
          additionalContext += `\n- **Content Summary**: ${additionalLessonData.lesson_json.main_content_summary_or_extract.substring(0, 200)}...`;
        }
      }

      // Prepare conversation history
      const recentHistory = sessionHistory.slice(-10);

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
          content: message + additionalContext
        }
      ];

      // Call OpenAI
      let response;
      try {
        response = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
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
      } else {
        console.error("OpenAI API unexpected response shape:", response);
      }

      // Log interaction for analytics
      try {
        await supabase
          .from('chat_interactions')
          .insert([{
            child_id: childId,
            message_count: 1,
            ai_provider: 'openai',
            interaction_at: new Date().toISOString(),
            has_lesson_context: !!(specificQuestionData || targetLessonData || additionalLessonData),
            specific_question_asked: !!specificQuestionData
          }]);
      } catch (logError) {
        console.error('Failed to log interaction:', logError);
      }

      // Return response with lesson context if relevant
      res.json({
        success: true,
        message: aiMessage,
        timestamp: new Date().toISOString(),
        provider: 'openai',
        lessonContext: (targetLessonData || additionalLessonData) ? {
          lessonId: (targetLessonData || additionalLessonData).id,
          lessonTitle: (targetLessonData || additionalLessonData).title,
          lessonType: (targetLessonData || additionalLessonData).content_type,
          subjectName: (targetLessonData || additionalLessonData).lesson?.unit?.child_subject?.subject?.name,
          specificQuestion: specificQuestionData ? {
            questionText: specificQuestionData.questionText,
            questionNumber: specificQuestionData.questionIndex + 1,
            totalQuestions: specificQuestionData.totalQuestions,
            instruction: specificQuestionData.relevantInstruction
          } : null
        } : null,
        mcpContextSummary: {
          hasActiveContent: mcpContext?.currentMaterials?.length > 0 || mcpContext?.upcomingAssignments?.length > 0,
          currentMaterialsCount: mcpContext?.currentMaterials?.length || 0,
          upcomingAssignmentsCount: mcpContext?.upcomingAssignments?.length || 0,
          foundSpecificQuestion: !!specificQuestionData
        }
      });

    } catch (error) {
      console.error('Enhanced chat error:', error);
      res.status(500).json({
        error: "Sorry! Klio got a bit confused. Can you try asking again? 🤔",
        code: 'CHAT_ERROR'
      });
    }
};

// Get chat suggestions based on current context
exports.getSuggestions = async (req, res) => {
    const childId = req.child?.child_id;
    const mcpContext = req.mcpContext;

    if (!childId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      // Start with default suggestions
      const suggestions = [
        "What are we learning today? 📚",
        "Can you explain this to me? 🤔",
        "Let's practice together! ✏️",
        "I need help with my homework 📝"
      ];

      // Enhance with context if available
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

// Get lesson help (enhanced)
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

    // Generate helpful content based on lesson
    const lessonJson = lessonDetails.lesson_json || {};
    
    const helpContent = {
      lessonTitle: lessonDetails.title,
      lessonType: lessonDetails.content_type,
      subjectName: lessonDetails.lesson?.unit?.child_subject?.subject?.name,
      tips: [],
      encouragement: "You're doing great! Let's work through this together! 🌟",
      learningGoals: [],
      nextSteps: []
    };

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

// Report concerning message (safety feature)
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