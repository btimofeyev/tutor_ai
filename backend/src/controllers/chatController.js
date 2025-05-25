// backend/src/controllers/chatController.js
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

IMPORTANT: You have access to the child's actual curriculum and lessons. Use this information to:
- Reference specific lessons when relevant
- Help with actual assignments they're working on
- Provide examples from their learning materials
- Track their progress and celebrate achievements
- Suggest what to study next based on their curriculum
- Give specific, actionable guidance based on their current work

Child's Information:
- Name: {childName}
- Grade: {childGrade}
- Current Subjects: {subjects}

Current Learning Context:
{learningContext}

When the child asks about lessons, assignments, or what they have coming up, ALWAYS reference their actual curriculum data from the context above. Be specific about lesson titles, due dates, and content.

Guidelines for responses:
- If they ask "what lessons do I have" or similar, list their actual upcoming lessons/assignments
- If they need help with homework, check if it matches any of their current lessons
- If they ask what to study next, suggest based on their actual curriculum sequence
- Always be encouraging and make learning feel achievable
- Use the child's actual lesson data to provide personalized guidance`;

// Main chat handler
exports.chat = async (req, res) => {
    const childId = req.child?.child_id;
    const { message, sessionHistory = [], lessonContext = null } = req.body;
    const mcpContext = req.mcpContext; // Enhanced MCP context from middleware

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

      // Check if this is a lesson-related query and we should search for specific content
      let specificLessonData = null;
      const isQueryAboutLessons = isLessonQuery(message);

      if (isQueryAboutLessons || message.toLowerCase().includes('help')) {
        try {
          // Try to find relevant lesson content
          const searchResults = await mcpClient.searchLessons(message, childId);
          if (searchResults.length > 0) {
            specificLessonData = searchResults[0];
            
            // Get full lesson details if available
            if (specificLessonData.id) {
              const lessonDetails = await mcpClient.getLessonDetails(specificLessonData.id);
              if (lessonDetails) {
                specificLessonData = lessonDetails;
              }
            }
          }
        } catch (searchError) {
          console.error('Error searching lessons:', searchError);
        }
      }

      // Format the learning context for the AI
      const formattedLearningContext = formatLearningContextForAI(mcpContext);

      // Create enhanced system prompt
      const systemPrompt = KLIO_SYSTEM_PROMPT
        .replace('{childName}', child?.name || 'Friend')
        .replace('{childGrade}', child?.grade || 'Elementary')
        .replace('{subjects}', subjects)
        .replace('{learningContext}', formattedLearningContext);

      // Add lesson details if found
      let additionalContext = "";
      if (specificLessonData && specificLessonData.lesson_json) {
        additionalContext = `

📚 **Relevant Lesson Information**:
- **Title**: ${specificLessonData.title}
- **Type**: ${specificLessonData.content_type}
- **Subject**: ${specificLessonData.child_subjects?.subjects?.name || 'General'}`;

        if (specificLessonData.due_date) {
          const dueDate = new Date(specificLessonData.due_date);
          const today = new Date();
          const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
          additionalContext += `\n- **Due**: ${dueDate.toLocaleDateString()}`;
          
          if (daysUntil <= 1) {
            additionalContext += ` (${daysUntil === 0 ? 'TODAY' : 'TOMORROW'}) ⚠️`;
          }
        }

        if (specificLessonData.lesson_json.learning_objectives) {
          additionalContext += `\n- **Learning Goals**: ${specificLessonData.lesson_json.learning_objectives.join(', ')}`;
        }

        if (specificLessonData.lesson_json.tasks_or_questions) {
          additionalContext += `\n- **Tasks/Questions** (${specificLessonData.lesson_json.tasks_or_questions.length} total):`;
          specificLessonData.lesson_json.tasks_or_questions.slice(0, 3).forEach((task, index) => {
            additionalContext += `\n  ${index + 1}. ${task}`;
          });
          if (specificLessonData.lesson_json.tasks_or_questions.length > 3) {
            additionalContext += `\n  ... and ${specificLessonData.lesson_json.tasks_or_questions.length - 3} more`;
          }
        }

        if (specificLessonData.lesson_json.main_content_summary_or_extract) {
          additionalContext += `\n- **Content Summary**: ${specificLessonData.lesson_json.main_content_summary_or_extract.substring(0, 200)}...`;
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
            has_lesson_context: !!specificLessonData
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
        lessonContext: specificLessonData ? {
          lessonId: specificLessonData.id,
          lessonTitle: specificLessonData.title,
          lessonType: specificLessonData.content_type,
          subjectName: specificLessonData.child_subjects?.subjects?.name
        } : null,
        mcpContextSummary: {
          hasActiveContent: mcpContext?.currentLessons?.length > 0 || mcpContext?.upcomingAssignments?.length > 0,
          currentLessonsCount: mcpContext?.currentLessons?.length || 0,
          upcomingAssignmentsCount: mcpContext?.upcomingAssignments?.length || 0
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
          if (mcpContext.progress.summary.totalCompletedLessons > 0) {
            suggestions.push("Show me my progress! 📊");
          }
        }

        // Active lessons suggestion
        if (mcpContext.currentLessons?.length > 1) {
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
    const hasAccess = await mcpClient.checkLessonAccess(childId, lessonId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this lesson' });
    }

    // Get detailed lesson information
    const lessonDetails = await mcpClient.getLessonDetails(lessonId);
    if (!lessonDetails) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Generate helpful content based on lesson
    const lessonJson = lessonDetails.lesson_json || {};
    
    const helpContent = {
      lessonTitle: lessonDetails.title,
      lessonType: lessonDetails.content_type,
      subjectName: lessonDetails.child_subjects?.subjects?.name,
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