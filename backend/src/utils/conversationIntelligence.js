// conversationIntelligence.js - Adaptive conversation logic for tutoring
const supabase = require('./supabaseClient');

// Analyze student's recent performance and confidence
async function analyzeStudentProfile(childId) {
  try {
    // Get recent chat history (last 10 messages)
    const { data: recentChats, error: chatError } = await supabase
      .from('chat_history')
      .select('*')
      .eq('child_id', childId)
      .order('timestamp', { ascending: false })
      .limit(10);

    if (chatError) {
      console.warn('Could not fetch chat history for student analysis:', chatError);
      
      // If table doesn't exist, use enhanced default profile based on child data
      const { data: childData } = await supabase
        .from('children')
        .select('lifetime_correct, current_streak, created_at')
        .eq('id', childId)
        .single()
        .catch(() => ({ data: null }));
      
      return getEnhancedDefaultProfile(childData);
    }

    // Analyze patterns in recent interactions
    const analysis = {
      confidence_level: 'medium',
      recent_success_rate: 0.7,
      struggling_areas: [],
      strengths: [],
      response_patterns: {
        average_response_time: 60, // seconds
        tends_to_give_up: false,
        asks_for_help: false,
        explains_thinking: false
      },
      engagement_level: 'medium',
      last_session_duration: 0,
      preferred_subjects: []
    };

    // Analyze message patterns
    if (recentChats && recentChats.length > 0) {
      const studentMessages = recentChats.filter(msg => msg.role === 'user');
      const klioMessages = recentChats.filter(msg => msg.role === 'assistant');

      // Detect giving up patterns
      const giveUpPhrases = ['i don\'t know', 'this is hard', 'i can\'t do this', 'skip this', 'i don\'t want to'];
      const giveUpCount = studentMessages.filter(msg => 
        giveUpPhrases.some(phrase => msg.content.toLowerCase().includes(phrase))
      ).length;
      
      analysis.response_patterns.tends_to_give_up = giveUpCount > studentMessages.length * 0.3;

      // Detect help-seeking behavior
      const helpPhrases = ['help me', 'i need help', 'how do i', 'what should i do', 'can you explain'];
      const helpCount = studentMessages.filter(msg => 
        helpPhrases.some(phrase => msg.content.toLowerCase().includes(phrase))
      ).length;
      
      analysis.response_patterns.asks_for_help = helpCount > studentMessages.length * 0.2;

      // Detect explanation patterns
      const explanationIndicators = ['because', 'first i', 'then i', 'so i', 'my answer is'];
      const explanationCount = studentMessages.filter(msg => 
        explanationIndicators.some(phrase => msg.content.toLowerCase().includes(phrase))
      ).length;
      
      analysis.response_patterns.explains_thinking = explanationCount > studentMessages.length * 0.3;

      // Analyze celebration responses from Klio
      const celebrationWords = ['correct', 'excellent', 'great job', 'perfect', 'well done'];
      const celebrationCount = klioMessages.filter(msg => 
        celebrationWords.some(word => msg.content.toLowerCase().includes(word))
      ).length;
      
      analysis.recent_success_rate = Math.min(celebrationCount / Math.max(klioMessages.length, 1), 1);
      
      // Determine confidence level based on success rate and behavior
      if (analysis.recent_success_rate > 0.8 && !analysis.response_patterns.tends_to_give_up) {
        analysis.confidence_level = 'high';
      } else if (analysis.recent_success_rate < 0.4 || analysis.response_patterns.tends_to_give_up) {
        analysis.confidence_level = 'low';
      }
      
      // Determine engagement level
      if (analysis.response_patterns.explains_thinking && analysis.response_patterns.asks_for_help) {
        analysis.engagement_level = 'high';
      } else if (analysis.response_patterns.tends_to_give_up) {
        analysis.engagement_level = 'low';
      }
    }

    return analysis;
  } catch (error) {
    console.error('Error analyzing student profile:', error);
    return getDefaultProfile();
  }
}

// Default profile for new students or when analysis fails
function getDefaultProfile() {
  return {
    confidence_level: 'medium',
    recent_success_rate: 0.7,
    struggling_areas: [],
    strengths: [],
    response_patterns: {
      average_response_time: 60,
      tends_to_give_up: false,
      asks_for_help: false,
      explains_thinking: false
    },
    engagement_level: 'medium',
    last_session_duration: 0,
    preferred_subjects: []
  };
}

// Enhanced default profile using available child data
function getEnhancedDefaultProfile(childData) {
  
  const profile = getDefaultProfile();
  
  if (childData) {
    // Adjust confidence based on lifetime performance
    const lifetimeCorrect = childData.lifetime_correct || 0;
    const currentStreak = childData.current_streak || 0;
    
    if (lifetimeCorrect > 50 && currentStreak > 5) {
      profile.confidence_level = 'high';
      profile.recent_success_rate = 0.85;
      profile.engagement_level = 'high';
    } else if (lifetimeCorrect < 10 || currentStreak === 0) {
      profile.confidence_level = 'low';
      profile.recent_success_rate = 0.4;
      profile.response_patterns.tends_to_give_up = true;
      profile.response_patterns.asks_for_help = true;
    }
    
    // Account for new vs experienced students
    const accountAge = childData.created_at ? 
      (Date.now() - new Date(childData.created_at).getTime()) / (1000 * 60 * 60 * 24) : 0;
    
    if (accountAge < 7) { // New student (less than a week)
      profile.confidence_level = 'low';
      profile.response_patterns.asks_for_help = true;
      profile.engagement_level = 'medium';
    }
  }
  
  return profile;
}

// Generate adaptive conversation strategy based on student profile
function generateConversationStrategy(studentProfile, currentContext = {}) {
  const strategy = {
    response_style: 'balanced',
    encouragement_level: 'medium',
    challenge_level: 'medium',
    celebration_intensity: 'medium',
    patience_level: 'medium',
    guidance_approach: 'scaffolded',
    question_complexity: 'medium',
    celebration_triggers: ['correct', 'improvement', 'effort']
  };

  // Adapt based on confidence level
  switch (studentProfile.confidence_level) {
    case 'low':
      strategy.response_style = 'encouraging';
      strategy.encouragement_level = 'high';
      strategy.challenge_level = 'low';
      strategy.celebration_intensity = 'high';
      strategy.patience_level = 'high';
      strategy.guidance_approach = 'heavily_scaffolded';
      strategy.question_complexity = 'simple';
      strategy.celebration_triggers = ['correct', 'attempt', 'effort', 'small_improvement'];
      break;
      
    case 'high':
      strategy.response_style = 'challenging';
      strategy.encouragement_level = 'medium';
      strategy.challenge_level = 'high';
      strategy.celebration_intensity = 'medium';
      strategy.patience_level = 'medium';
      strategy.guidance_approach = 'minimal_scaffolding';
      strategy.question_complexity = 'complex';
      strategy.celebration_triggers = ['correct', 'excellent_work', 'creative_thinking'];
      break;
  }

  // Adapt based on recent success rate
  if (studentProfile.recent_success_rate < 0.5) {
    strategy.challenge_level = 'low';
    strategy.encouragement_level = 'high';
    strategy.guidance_approach = 'heavily_scaffolded';
  } else if (studentProfile.recent_success_rate > 0.8) {
    strategy.challenge_level = 'high';
    strategy.guidance_approach = 'minimal_scaffolding';
  }

  // Adapt based on behavioral patterns
  if (studentProfile.response_patterns.tends_to_give_up) {
    strategy.encouragement_level = 'high';
    strategy.patience_level = 'high';
    strategy.celebration_intensity = 'high';
    strategy.challenge_level = 'low';
  }

  if (studentProfile.response_patterns.explains_thinking) {
    strategy.response_style = 'validating';
    strategy.guidance_approach = 'socratic'; // Ask guiding questions
  }

  if (!studentProfile.response_patterns.asks_for_help) {
    strategy.guidance_approach = 'proactive'; // Offer help before asked
  }

  // Context-specific adaptations
  if (currentContext.subject === 'creative writing') {
    strategy.guidance_approach = 'questioning'; // Never give direct answers
    strategy.celebration_triggers = ['creativity', 'effort', 'improvement', 'completion'];
  }

  if (currentContext.time_of_day === 'evening') {
    strategy.patience_level = 'high';
    strategy.encouragement_level = 'high';
  }

  if (currentContext.session_length > 30) { // minutes
    strategy.encouragement_level = 'high';
    strategy.celebration_intensity = 'high';
  }

  return strategy;
}

// Generate contextual personality traits for the AI response
function generatePersonalityContext(strategy, currentMessage = '') {
  const personalities = {
    encouraging: {
      tone: "warm and supportive",
      phrases: ["You're doing great!", "I believe in you!", "That's a wonderful start!"],
      emojis: ["🌟", "💪", "😊", "👏"],
      response_starters: ["That's fantastic thinking!", "I love how you approached this!", "You're really growing!"]
    },
    challenging: {
      tone: "confident and pushing",
      phrases: ["I know you can do better!", "Let's push yourself!", "Ready for a challenge?"],
      emojis: ["🎯", "🚀", "⚡", "🔥"],
      response_starters: ["Excellent! Now let's try something harder.", "Perfect! Ready for the next level?", "Great work! Let's challenge yourself."]
    },
    questioning: {
      tone: "curious and guiding",
      phrases: ["What do you think?", "How might we approach this?", "What patterns do you notice?"],
      emojis: ["🤔", "💡", "🔍", "❓"],
      response_starters: ["That's interesting! What made you think of that?", "Hmm, what do you notice about...", "Good observation! What else..."]
    },
    validating: {
      tone: "affirming and building",
      phrases: ["Exactly right!", "That's perfect reasoning!", "You explained that beautifully!"],
      emojis: ["✅", "🎉", "⭐", "👍"],
      response_starters: ["Perfect explanation!", "Exactly! You understand this!", "Beautiful reasoning!"]
    },
    balanced: {
      tone: "steady and reliable",
      phrases: ["Good work!", "Let's think about this.", "You're making progress!"],
      emojis: ["📚", "🎯", "✏️", "📊"],
      response_starters: ["Nice work! Let's continue.", "Good! Now let's look at...", "That's progress! Next..."]
    }
  };

  const personality = personalities[strategy.response_style] || personalities.balanced;
  
  return {
    ...personality,
    celebration_level: strategy.celebration_intensity,
    patience_level: strategy.patience_level,
    guidance_style: strategy.guidance_approach
  };
}

// Determine if we should trigger a celebration based on student message
function shouldCelebrate(studentMessage, strategy, studentProfile) {
  const messageContent = studentMessage.toLowerCase();
  
  const celebrationTriggers = {
    correct: ['correct', 'right', 'yes', 'exactly'],
    effort: ['tried', 'working on', 'thinking about', 'attempting'],
    improvement: ['better', 'getting it', 'understand now', 'makes sense'],
    creativity: ['idea', 'what if', 'maybe', 'could be'],
    completion: ['done', 'finished', 'completed', 'ready'],
    explanation: ['because', 'so', 'then', 'first']
  };

  for (const trigger of strategy.celebration_triggers) {
    if (celebrationTriggers[trigger]) {
      const shouldTrigger = celebrationTriggers[trigger].some(phrase => 
        messageContent.includes(phrase)
      );
      if (shouldTrigger) {
        return {
          should_celebrate: true,
          celebration_type: trigger,
          intensity: strategy.celebration_intensity
        };
      }
    }
  }

  return { should_celebrate: false };
}

// Generate suggestion bubbles based on context and student profile
function generateContextualSuggestions(studentProfile, currentContext, strategy) {
  const baseSuggestions = [
    "Need help with this problem? 🤔",
    "Want to try a different approach? 💡",
    "Ready for something new? 🎯"
  ];

  const suggestions = [...baseSuggestions];

  // Add confidence-based suggestions
  if (studentProfile.confidence_level === 'low') {
    suggestions.unshift("Let's break this down step by step 📝");
    suggestions.unshift("Want me to give you a hint? 💡");
  } else if (studentProfile.confidence_level === 'high') {
    suggestions.unshift("Ready for a challenge problem? 🔥");
    suggestions.unshift("Want to try the advanced version? 🚀");
  }

  // Add behavioral pattern suggestions
  if (studentProfile.response_patterns.tends_to_give_up) {
    suggestions.unshift("Let's make this easier! 🌟");
    suggestions.unshift("You've got this! Want encouragement? 💪");
  }

  if (!studentProfile.response_patterns.explains_thinking) {
    suggestions.push("Can you tell me how you solved it? 🗣️");
    suggestions.push("Walk me through your thinking! 🚶‍♂️");
  }

  // Add subject-specific suggestions
  if (currentContext.subject === 'creative writing') {
    suggestions.push("Help me brainstorm ideas! 💭");
    suggestions.push("Let's develop this character! 👤");
    suggestions.push("What happens next in the story? 📖");
  }

  if (currentContext.subject === 'math') {
    suggestions.push("Show me a similar problem! 🔢");
    suggestions.push("Let's practice this concept! ⚡");
  }

  // Limit to 4-5 suggestions to avoid overwhelming
  return suggestions.slice(0, strategy.challenge_level === 'low' ? 3 : 5);
}

module.exports = {
  analyzeStudentProfile,
  generateConversationStrategy,
  generatePersonalityContext,
  shouldCelebrate,
  generateContextualSuggestions
};