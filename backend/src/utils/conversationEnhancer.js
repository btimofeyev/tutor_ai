// Enhanced conversation handling with better lesson awareness and natural flow

const { findLessonByName, generateLessonSuggestions } = require('./enhancedContextFormatter');

// Detect what the student is asking about and enhance the context accordingly
function enhanceConversationContext(message, mcpContext, child) {
  const messageLower = message.toLowerCase();
  const enhancements = {
    specificLesson: null,
    suggestedLessons: [],
    conversationType: 'general',
    responseGuidance: '',
    priorityContext: ''
  };

  // Detect conversation type
  if (isLessonPreparationQuery(messageLower)) {
    enhancements.conversationType = 'lesson_preparation';
    enhancements.responseGuidance = 'Focus on lesson objectives, key concepts, and what to expect';
  } else if (isHomeworkHelpQuery(messageLower)) {
    enhancements.conversationType = 'homework_help';
    enhancements.responseGuidance = 'Guide through problems step-by-step, reference lesson content';
  } else if (isConceptQuestionQuery(messageLower)) {
    enhancements.conversationType = 'concept_explanation';
    enhancements.responseGuidance = 'Explain using lesson vocabulary and connect to current curriculum';
  } else if (isGeneralChatQuery(messageLower)) {
    enhancements.conversationType = 'general_chat';
    enhancements.responseGuidance = 'Be friendly but guide toward current lessons if appropriate';
  }

  // Look for specific lesson mentions
  if (mcpContext.lessons) {
    const mentionedLesson = findLessonByName(mcpContext.lessons, message);
    if (mentionedLesson) {
      enhancements.specificLesson = mentionedLesson;
      enhancements.responseGuidance += ` Focus on "${mentionedLesson.title}" with objectives: ${mentionedLesson.objectives?.join(', ') || 'general learning'}`;
    } else {
      // Suggest relevant lessons
      enhancements.suggestedLessons = generateLessonSuggestions(mcpContext, message);
    }
  }

  // Add priority context for urgent items
  if (mcpContext.overdue && mcpContext.overdue.length > 0) {
    enhancements.priorityContext = `URGENT: Student has ${mcpContext.overdue.length} overdue assignment(s). Consider redirecting to these first.`;
  } else if (mcpContext.currentFocus) {
    enhancements.priorityContext = `FOCUS: Current priority is "${mcpContext.currentFocus.title}"`;
  }

  return enhancements;
}

// Query type detection functions
function isLessonPreparationQuery(message) {
  const preparationKeywords = [
    'what will we learn', 'what are we learning', 'what is the lesson about',
    'ready for', 'prepare for', 'what should i know', 'what to expect',
    'lesson today', 'studying today', 'whats coming up'
  ];
  return preparationKeywords.some(keyword => message.includes(keyword));
}

function isHomeworkHelpQuery(message) {
  const homeworkKeywords = [
    'help me with', 'help with', 'homework', 'assignment', 'worksheet',
    'problem', 'question', 'stuck on', 'dont understand', "don't understand",
    'how do i', 'how to', 'can you help', 'actual problem', 'actual assignment',
    'actual question', 'problem number', 'question number', 'real problem',
    'give me', 'show me', 'what is problem', 'what is question', 'whats problem',
    'whats question', 'my worksheet', 'my assignment', 'from my', 'problem 1',
    'question 1', 'number 1', 'first problem', 'first question'
  ];
  return homeworkKeywords.some(keyword => message.includes(keyword));
}

function isConceptQuestionQuery(message) {
  const conceptKeywords = [
    'what is', 'what are', 'explain', 'tell me about', 'how does',
    'why is', 'why does', 'what does', 'define', 'meaning of'
  ];
  return conceptKeywords.some(keyword => message.includes(keyword));
}

function isGeneralChatQuery(message) {
  const chatKeywords = [
    'hi', 'hello', 'hey', 'good morning', 'good afternoon',
    'how are you', 'whats up', "what's up", 'sup', 'yo'
  ];
  return chatKeywords.some(keyword => message.includes(keyword));
}

// Generate conversation starters based on available lessons
function generateConversationStarters(mcpContext, child) {
  const starters = [];
  
  if (!mcpContext.lessons || mcpContext.lessons.length === 0) {
    return [`Hi ${child?.name || 'there'}! I'm ready to help with any questions you have! 😊`];
  }

  // Check for urgent items first
  if (mcpContext.overdue && mcpContext.overdue.length > 0) {
    starters.push(`Hi ${child?.name}! I notice you have ${mcpContext.overdue.length} assignment${mcpContext.overdue.length > 1 ? 's' : ''} that need attention. Want to tackle those first?`);
  }

  // Due today
  const dueToday = mcpContext.lessons.filter(lesson => {
    if (!lesson.due_date) return false;
    const today = new Date().toISOString().split('T')[0];
    return lesson.due_date === today;
  });

  if (dueToday.length > 0) {
    const lesson = dueToday[0];
    starters.push(`Hey ${child?.name}! Your "${lesson.title}" lesson is due today. Ready to explore ${lesson.keywords?.join(' and ') || 'the concepts'}?`);
  }

  // General lesson suggestions
  const recentLessons = mcpContext.lessons.slice(0, 2);
  recentLessons.forEach(lesson => {
    if (lesson.objectives && lesson.objectives.length > 0) {
      starters.push(`Hi there! Want to work on "${lesson.title}"? You'll learn to ${lesson.objectives[0].toLowerCase()} and more! 🌟`);
    }
  });

  return starters.slice(0, 3);
}

// Enhance the system prompt with conversation-specific guidance
function addConversationGuidance(basePrompt, enhancements, mcpContext, child) {
  let guidance = basePrompt;

  // Add specific lesson context if available
  if (enhancements.specificLesson) {
    const lesson = enhancements.specificLesson;
    guidance += `\n\n## 🎯 STUDENT IS ASKING ABOUT: "${lesson.title}"\n`;
    guidance += `**Subject**: ${lesson.subject}\n`;
    if (lesson.objectives) {
      guidance += `**Learning Objectives**: ${lesson.objectives.join(', ')}\n`;
    }
    if (lesson.focus) {
      guidance += `**Lesson Focus**: ${lesson.focus}\n`;
    }
    if (lesson.keywords) {
      guidance += `**Key Concepts to Use**: ${lesson.keywords.join(', ')}\n`;
    }
    if (lesson.difficulty_level) {
      guidance += `**Difficulty Level**: ${lesson.difficulty_level} - adjust explanations accordingly\n`;
    }
    if (lesson.due_date) {
      guidance += `**Due Date**: ${lesson.due_date}\n`;
    }
    guidance += `\n**CRITICAL**: Reference these specific objectives and concepts in your response!`;
  }

  // Add suggested lessons if relevant
  if (enhancements.suggestedLessons.length > 0) {
    guidance += `\n\n## 💡 RELEVANT LESSONS TO CONSIDER:\n`;
    enhancements.suggestedLessons.forEach((lesson, i) => {
      guidance += `${i + 1}. "${lesson.title}" (${lesson.subject}) - ${lesson.focus || 'Available to study'}\n`;
    });
  }

  // Add conversation type guidance
  guidance += `\n\n## 🗣️ CONVERSATION TYPE: ${enhancements.conversationType.toUpperCase()}\n`;
  guidance += `**Response Approach**: ${enhancements.responseGuidance}\n`;

  // Add priority context
  if (enhancements.priorityContext) {
    guidance += `\n⚠️ **PRIORITY CONTEXT**: ${enhancements.priorityContext}\n`;
  }

  // Add conversation-specific instructions
  switch (enhancements.conversationType) {
    case 'lesson_preparation':
      guidance += `\n**LESSON PREP RESPONSE TEMPLATE**:
      1. Reference specific lesson objectives from their curriculum
      2. Mention key concepts they'll work with
      3. Build excitement about what they'll learn
      4. Offer to start with specific objectives
      Example: "Great question! In [Lesson], you'll learn to [objective 1] and [objective 2]. The focus is on [lesson focus]. Ready to explore [key concept]?"`;
      break;
      
    case 'homework_help':
      guidance += `\n**HOMEWORK HELP APPROACH**:
      1. If the exact question is available in ❓ Questions - provide it instantly
      2. If question number isn't available, CREATE A WORKSPACE with practice problems using create_subject_workspace function
      3. ALWAYS send practice problems to workspace panel, not just in chat
      4. Use lesson context: "I see you're on Question 9! Let me create a practice workspace for you."
      5. NEVER ask students to provide their homework questions (avoids cheating)
      6. Focus on INTERACTIVE SKILL-BUILDING: use workspace for hands-on practice
      7. Let students work in workspace and use evaluate_content_item to check answers
      8. Match difficulty level using lesson objectives and sample questions`;
      break;
      
    case 'concept_explanation':
      guidance += `\n**CONCEPT EXPLANATION APPROACH**:
      1. Use examples from their lesson content
      2. Reference their current vocabulary/keywords
      3. Connect to lesson objectives they're working toward
      4. Keep explanations age-appropriate`;
      break;
      
    case 'general_chat':
      guidance += `\n**GENERAL CHAT APPROACH**:
      1. Be friendly and welcoming
      2. Gently guide toward current lessons when appropriate
      3. Ask what they'd like to work on today
      4. Suggest specific lessons if they seem ready`;
      break;
  }

  return guidance;
}

// Generate personalized responses based on student profile and context
function generatePersonalizedResponse(studentProfile, conversationType, mcpContext) {
  const responses = {
    lesson_preparation: {
      high_confidence: [
        "Excellent question! Let's dive into what you'll master today!",
        "Great thinking ahead! Here's what we'll explore:",
        "Perfect timing! Let me tell you about today's exciting lesson:"
      ],
      building_confidence: [
        "That's a smart question! Let me help you get ready:",
        "Good thinking! Here's what we'll learn together:",
        "Great question! I'll help you prepare step by step:"
      ],
      low_confidence: [
        "That's a wonderful question! Don't worry, we'll take it step by step:",
        "I'm so glad you asked! Let's explore this together:",
        "Great question! I'll make sure you feel confident about this:"
      ]
    },
    homework_help: {
      high_confidence: [
        "I'd love to help! What specific part are you working on?",
        "Great! Let's tackle this together. What's the question?",
        "Awesome! Show me what you're working on:"
      ],
      building_confidence: [
        "I'm here to help! Let's work through this together:",
        "No problem! We'll figure this out step by step:",
        "Of course! Let's break this down together:"
      ],
      low_confidence: [
        "I'm here to help you! Don't worry, we'll take it slowly:",
        "That's what I'm here for! Let's work through this carefully:",
        "I'd love to help! We'll make sure you understand each step:"
      ]
    }
  };

  const confidenceLevel = studentProfile?.confidence_level || 'building_confidence';
  const typeResponses = responses[conversationType] || responses.lesson_preparation;
  const levelResponses = typeResponses[confidenceLevel] || typeResponses.building_confidence;
  
  return levelResponses[Math.floor(Math.random() * levelResponses.length)];
}

module.exports = {
  enhanceConversationContext,
  generateConversationStarters,
  addConversationGuidance,
  generatePersonalizedResponse,
  isLessonPreparationQuery,
  isHomeworkHelpQuery,
  isConceptQuestionQuery,
  isGeneralChatQuery
};