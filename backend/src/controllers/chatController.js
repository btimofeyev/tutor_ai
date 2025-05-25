// backend/src/controllers/chatController.js
const { OpenAI } = require('openai');
const supabase = require('../utils/supabaseClient');

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

IMPORTANT: You have access to the child's curriculum and lessons. Use this information to:
- Reference specific lessons when relevant
- Help with actual assignments they're working on
- Provide examples from their learning materials
- Track their progress and celebrate achievements
- Suggest what to study next based on their curriculum

Child's Information:
- Name: {childName}
- Grade: {childGrade}
- Current Subjects: {subjects}

Current Learning Context:
{learningContext}

When helping with lessons:
- Be specific about which lesson/assignment you're referencing
- Break down complex problems into simple steps
- Use examples from their actual curriculum when possible
- Encourage them to check their lesson materials
- If they're struggling, suggest taking a break or trying an easier part first`;

// Helper to get safe child context
const getChildContext = async (childId) => {
  try {
    const { data: child } = await supabase
      .from('children')
      .select('name, grade')
      .eq('id', childId)
      .single();

    // Get current subjects
    const { data: subjects } = await supabase
      .from('child_subjects')
      .select(`
        subjects:subject_id (name)
      `)
      .eq('child_id', childId);

    const subjectNames = subjects?.map(s => s.subjects?.name).filter(Boolean) || [];

    return {
      childName: child?.name || 'Friend',
      childGrade: child?.grade || 'Elementary',
      currentSubject: subjectNames.join(', ') || 'General Learning'
    };
  } catch (error) {
    console.error('Error fetching child context:', error);
    return {
      childName: 'Friend',
      childGrade: 'Elementary',
      currentSubject: 'General Learning'
    };
  }
};
const formatLearningContext = (mcpContext) => {
    if (!mcpContext) {
      return "No specific curriculum loaded at the moment.";
    }
  
    let context = "";
  
    // Current focus
    if (mcpContext.currentFocus) {
      const focus = mcpContext.currentFocus;
      context += `Current Focus: "${focus.title}" (${focus.content_type || 'lesson'})`;
      if (focus.due_date) {
        const dueDate = new Date(focus.due_date);
        const today = new Date();
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        context += ` - Due in ${daysUntilDue} days`;
      }
      context += "\n";
    }
  
    // Active lessons
    if (mcpContext.currentLessons && mcpContext.currentLessons.length > 0) {
      context += "\nActive Lessons:\n";
      mcpContext.currentLessons.slice(0, 3).forEach(lesson => {
        context += `- ${lesson.title} (${lesson.child_subjects?.subjects?.name || 'General'})\n`;
      });
    }
  
    // Upcoming assignments
    if (mcpContext.upcomingAssignments && mcpContext.upcomingAssignments.length > 0) {
      context += "\nUpcoming Assignments:\n";
      mcpContext.upcomingAssignments.slice(0, 3).forEach(assignment => {
        context += `- ${assignment.title} (Due: ${new Date(assignment.due_date).toLocaleDateString()})\n`;
      });
    }
  
    return context || "No specific curriculum loaded at the moment.";
  };
// Format system prompt with child data
const formatSystemPrompt = (context) => {
  return KLIO_SYSTEM_PROMPT
    .replace('{childName}', context.childName)
    .replace('{childGrade}', context.childGrade)
    .replace('{currentSubject}', context.currentSubject);
};

// Main chat handler using v1 API
exports.chat = async (req, res) => {
    const childId = req.child?.child_id;
    const { message, sessionHistory = [], lessonContext = null } = req.body;
    const mcpContext = req.mcpContext; // If you have MCP middleware
  
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
  
      // Optionally look up lesson context (for help/homework/lesson)
      let specificLessonData = null;
      if (
        message.toLowerCase().includes('help') ||
        message.toLowerCase().includes('lesson') ||
        message.toLowerCase().includes('homework')
      ) {
        // Try to find relevant lesson (assuming mcpClient is available)
        if (typeof mcpClient !== 'undefined' && mcpClient?.searchLessons) {
          const searchResults = await mcpClient.searchLessons(message, childId);
          if (searchResults.length > 0) {
            specificLessonData = searchResults[0];
            // Get full lesson details if available
            const lessonDetails = await mcpClient.getLessonDetails(specificLessonData.lesson_id);
            if (lessonDetails) {
              specificLessonData = lessonDetails;
            }
          }
        }
      }
  
      // Enhanced system prompt (replace with your real one if different)
      const systemPrompt = KLIO_SYSTEM_PROMPT
        .replace('{childName}', child?.name || 'Friend')
        .replace('{childGrade}', child?.grade || 'Elementary')
        .replace('{subjects}', subjects)
        .replace('{learningContext}', formatLearningContext?.(mcpContext) || '');
  
      // Add lesson details if found
      let additionalContext = "";
      if (specificLessonData && specificLessonData.lesson_json) {
        additionalContext = `
  
  Relevant Lesson Information:
  Title: ${specificLessonData.title}
  Type: ${specificLessonData.content_type}
  ${specificLessonData.lesson_json.learning_objectives ? `Learning Objectives: ${specificLessonData.lesson_json.learning_objectives.join(', ')}` : ''}
  ${specificLessonData.lesson_json.tasks_or_questions ? `\nTasks/Questions in this lesson:\n${specificLessonData.lesson_json.tasks_or_questions.slice(0, 3).join('\n')}` : ''}`;
      }
  
      // Prepare conversation history and user input
      const recentHistory = sessionHistory.slice(-10);
  
      const openaiMessages = [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: systemPrompt
            }
          ]
        },
        ...recentHistory.map(msg => ({
          role: msg.role === 'klio' ? 'assistant' : 'user',
          content: [
            {
              type: msg.role === 'klio' ? "output_text" : "input_text",
              text: msg.content
            }
          ]
        })),
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: message + additionalContext
            }
          ]
        }
      ];
  
      // Call OpenAI (use "gpt-4o" for latest/best performance)
      let response;
      try {
        response = await openai.responses.create({
          model: "gpt-4.1-mini",
          input: openaiMessages,
          text: {
            format: {
              type: "text"
            }
          },
          reasoning: {},
          tools: [],
          temperature: 1,
          max_output_tokens: 1024,
          top_p: 1,
          store: true
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
      if (typeof response?.output_text === 'string') {
        aiMessage = response.output_text;
      } else if (
        Array.isArray(response?.output) &&
        response.output[0]?.content &&
        Array.isArray(response.output[0].content) &&
        response.output[0].content[0]?.text
      ) {
        aiMessage = response.output[0].content[0].text;
      } else if (response?.error) {
        console.error("OpenAI API error:", response.error);
        aiMessage = "Sorry, there was an AI error: " + response.error.message;
      } else {
        console.error("OpenAI API unknown response shape:", response);
      }
  
      // Log interaction
      await supabase
        .from('chat_interactions')
        .insert([{
          child_id: childId,
          message_count: 1,
          ai_provider: 'openai',
          interaction_at: new Date().toISOString()
        }]);
  
      // Return response (with lessonContext if present)
      res.json({
        success: true,
        message: aiMessage,
        timestamp: new Date().toISOString(),
        provider: 'openai',
        lessonContext: specificLessonData ? {
          lessonId: specificLessonData.id,
          lessonTitle: specificLessonData.title,
          lessonType: specificLessonData.content_type
        } : null
      });
  
    } catch (error) {
      console.error('Enhanced chat error:', error);
      res.status(500).json({
        error: "Sorry! Klio got a bit confused. Can you try asking again? 🤔",
        code: 'CHAT_ERROR'
      });
    }
  };
  
  exports.getLessonHelp = async (req, res) => {
    const childId = req.child?.child_id;
    const { lessonId } = req.params;
  
    if (!childId || !lessonId) {
      return res.status(400).json({ error: 'Invalid request' });
    }
  
    try {
      // Check access
      const hasAccess = await mcpClient.checkLessonAccess(childId, lessonId);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this lesson' });
      }
  
      // Get lesson details
      const lessonDetails = await mcpClient.getLessonDetails(lessonId);
      if (!lessonDetails) {
        return res.status(404).json({ error: 'Lesson not found' });
      }
  
      // Generate helpful content based on lesson
      const lessonJson = lessonDetails.lesson_json || {};
      
      const helpContent = {
        lessonTitle: lessonDetails.title,
        lessonType: lessonDetails.content_type,
        tips: [],
        encouragement: "You're doing great! Let's work through this together! 🌟"
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
      }
  
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
// Get chat suggestions based on current context
exports.getSuggestions = async (req, res) => {
    const childId = req.child?.child_id;
    const mcpContext = req.mcpContext; // If available from middleware
  
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
      if (mcpContext) {
        // Current lesson suggestion
        if (mcpContext.currentFocus?.title) {
          suggestions.unshift(`Help me with "${mcpContext.currentFocus.title}" 📖`);
        }
  
        // Subject-specific suggestion
        if (Array.isArray(mcpContext.childSubjects) && mcpContext.childSubjects.length > 0) {
          const topSubject = mcpContext.childSubjects[0]?.subjects?.name;
          if (topSubject && !suggestions.includes(`Let's practice ${topSubject}! 🎯`)) {
            suggestions.push(`Let's practice ${topSubject}! 🎯`);
          }
        }
  
        // Urgent assignment
        if (Array.isArray(mcpContext.upcomingAssignments) && mcpContext.upcomingAssignments.length > 0) {
          const nextAssignment = mcpContext.upcomingAssignments[0];
          if (nextAssignment?.due_date && nextAssignment?.title) {
            const dueDate = new Date(nextAssignment.due_date);
            const now = new Date();
            const daysUntil = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
            if (!isNaN(daysUntil) && daysUntil <= 2) {
              suggestions.unshift(`Help with "${nextAssignment.title}" (due soon!) ⏰`);
            }
          }
        }
      }
  
      // Remove duplicates, return max 6
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
          "Can you help me learn? 📚",
          "Let's practice together! ✏️",
          "Tell me something cool! 🌟",
          "I need help with homework 📝"
        ]
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
    // Log the report (without storing actual message content)
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
      // Create a notification for the parent (implement based on your notification system)
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
