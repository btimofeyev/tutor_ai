// Subject-specific content type definitions
const SUBJECT_CONTENT_TYPES = {
  math: {
    workspace_type: "math_problems",
    content_types: ["addition", "subtraction", "multiplication", "division", "fractions", "decimals", "word_problem", "algebra", "geometry"],
    evaluation_type: "binary" // correct/incorrect
  },
  science: {
    workspace_type: "science_investigation", 
    content_types: ["hypothesis", "experiment_step", "observation", "data_collection", "conclusion", "lab_safety"],
    evaluation_type: "rubric" // multi-criteria
  },
  history: {
    workspace_type: "history_analysis",
    content_types: ["timeline_event", "cause_effect", "primary_source", "compare_contrast", "historical_thinking"],
    evaluation_type: "evidence_based" // reasoning assessment
  },
  "language arts": {
    workspace_type: "language_practice",
    content_types: ["reading_comprehension", "vocabulary", "grammar", "writing_prompt", "literary_analysis", "creative_writing", "essay_structure", "story_elements", "brainstorming", "revision"],
    evaluation_type: "rubric" // multi-criteria
  },
  "social studies": {
    workspace_type: "social_investigation", 
    content_types: ["map_analysis", "civic_scenario", "cultural_comparison", "government_structure", "economics"],
    evaluation_type: "evidence_based" // reasoning assessment
  }
};

const WORKSPACE_TOOLS = [
  {
    type: "function",
    function: {
      name: "create_subject_workspace",
      description: "Create a new interactive workspace for any subject with appropriate content",
      parameters: {
        type: "object",
        properties: {
          subject: {
            type: "string",
            enum: ["math", "science", "history", "language arts", "social studies"],
            description: "The subject for this workspace"
          },
          workspace_type: {
            type: "string", 
            enum: ["math_problems", "science_investigation", "history_analysis", "language_practice", "social_investigation"],
            description: "Type of workspace to create based on subject"
          },
          title: {
            type: "string",
            description: "Title for the workspace (e.g., 'Fraction Practice', 'Density Lab', 'Civil War Timeline')"
          },
          content: {
            type: "array",
            description: "Array of content items appropriate for the subject",
            items: {
              type: "object",
              properties: {
                text: {
                  type: "string", 
                  description: "The content text (problem, question, prompt, or instruction)"
                },
                type: {
                  type: "string",
                  description: "Type of content - depends on subject (e.g., 'addition' for math, 'hypothesis' for science)"
                },
                hint: {
                  type: "string",
                  description: "Helpful hint or guidance for this content item"
                },
                difficulty: {
                  type: "string", 
                  enum: ["easy", "medium", "hard"],
                  description: "Difficulty level"
                },
                reading_passage: {
                  type: "string",
                  description: "Required for reading_comprehension type: the passage text that students read before answering questions"
                },
                evaluation_criteria: {
                  type: "object",
                  description: "Subject-specific evaluation criteria",
                  properties: {
                    type: {
                      type: "string",
                      enum: ["binary", "rubric", "evidence_based"],
                      description: "How this item should be evaluated"
                    },
                    rubric_points: {
                      type: "array",
                      description: "For rubric evaluation: specific criteria to assess",
                      items: { type: "string" }
                    }
                  }
                }
              },
              required: ["text", "type", "hint"]
            }
          },
          explanation: {
            type: "string",
            description: "Brief explanation of the concept or skill being practiced"
          },
          learning_objectives: {
            type: "array",
            description: "Learning objectives for this workspace",
            items: { type: "string" }
          }
        },
        required: ["subject", "workspace_type", "title", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_math_workspace", 
      description: "Create a math workspace (legacy function - use create_subject_workspace for new implementations)",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Title for the workspace (e.g., 'Fraction Multiplication Practice')"
          },
          problems: {
            type: "array",
            description: "Array of math problems to practice",
            items: {
              type: "object",
              properties: {
                text: {
                  type: "string", 
                  description: "The math problem text (e.g., '4 × 2/3')"
                },
                type: {
                  type: "string",
                  enum: ["addition", "subtraction", "multiplication", "division", "fractions", "decimals", "word_problem"],
                  description: "Type of math problem"
                },
                hint: {
                  type: "string",
                  description: "Helpful hint for solving this problem"
                },
                difficulty: {
                  type: "string", 
                  enum: ["easy", "medium", "hard"],
                  description: "Difficulty level"
                }
              },
              required: ["text", "type", "hint"]
            }
          },
          explanation: {
            type: "string",
            description: "Brief explanation of the concept being practiced"
          }
        },
        required: ["title", "problems"]
      }
    }
  },
  {
    type: "function", 
    function: {
      name: "add_content_to_workspace",
      description: "Add more content to the existing workspace without resetting progress",
      parameters: {
        type: "object",
        properties: {
          content: {
            type: "array",
            description: "Additional content items to add",
            items: {
              type: "object",
              properties: {
                text: { type: "string" },
                type: { 
                  type: "string",
                  description: "Content type - varies by subject"
                },
                hint: { type: "string" },
                difficulty: {
                  type: "string",
                  enum: ["easy", "medium", "hard"] 
                },
                reading_passage: {
                  type: "string",
                  description: "Required for reading_comprehension type: the passage text that students read before answering questions"
                },
                evaluation_criteria: {
                  type: "object",
                  description: "How this content should be evaluated"
                }
              },
              required: ["text", "type", "hint"]
            }
          }
        },
        required: ["content"]
      }
    }
  },
  {
    type: "function", 
    function: {
      name: "add_problems_to_workspace",
      description: "Add math problems to workspace (legacy function - use add_content_to_workspace for new implementations)",
      parameters: {
        type: "object",
        properties: {
          problems: {
            type: "array",
            description: "Additional problems to add",
            items: {
              type: "object",
              properties: {
                text: { type: "string" },
                type: { 
                  type: "string",
                  enum: ["addition", "subtraction", "multiplication", "division", "fractions", "decimals", "word_problem"]
                },
                hint: { type: "string" },
                difficulty: {
                  type: "string",
                  enum: ["easy", "medium", "hard"] 
                }
              },
              required: ["text", "type", "hint"]
            }
          }
        },
        required: ["problems"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "evaluate_content_item",
      description: "Evaluate any workspace content item with subject-appropriate assessment",
      parameters: {
        type: "object",
        properties: {
          content_index: {
            type: "integer",
            description: "Index of the content item to evaluate (0-based)"
          },
          evaluation_result: {
            type: "string",
            enum: ["excellent", "good", "needs_improvement", "incomplete", "correct", "incorrect"],
            description: "Evaluation result appropriate for the content type"
          },
          feedback: {
            type: "string", 
            description: "Specific feedback message for the student"
          },
          rubric_scores: {
            type: "object",
            description: "For rubric-based evaluation: scores for each criteria",
            properties: {
              criteria_scores: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    criterion: { type: "string" },
                    score: { type: "number" },
                    max_score: { type: "number" },
                    feedback: { type: "string" }
                  }
                }
              }
            }
          },
          evidence_quality: {
            type: "object",
            description: "For evidence-based evaluation: quality assessment",
            properties: {
              evidence_strength: {
                type: "string",
                enum: ["strong", "adequate", "weak", "insufficient"]
              },
              reasoning_quality: {
                type: "string", 
                enum: ["excellent", "good", "developing", "needs_support"]
              },
              suggestions: {
                type: "array",
                items: { type: "string" }
              }
            }
          }
        },
        required: ["content_index", "evaluation_result", "feedback"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "mark_problem_correct",
      description: "Mark a specific math problem as correct (legacy function - use evaluate_content_item for new implementations)",
      parameters: {
        type: "object",
        properties: {
          problem_index: {
            type: "integer",
            description: "Index of the problem to mark correct (0-based)"
          },
          feedback: {
            type: "string", 
            description: "Positive feedback message for the student"
          }
        },
        required: ["problem_index"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "mark_problem_incorrect", 
      description: "Mark a math problem as incorrect (legacy function - use evaluate_content_item for new implementations)",
      parameters: {
        type: "object",
        properties: {
          problem_index: {
            type: "integer",
            description: "Index of the problem to mark incorrect (0-based)"
          },
          guidance: {
            type: "string",
            description: "Helpful guidance for the student to try again"
          }
        },
        required: ["problem_index"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_creative_writing_toolkit",
      description: "Create an interactive creative writing toolkit to help students brainstorm and organize their ideas",
      parameters: {
        type: "object",
        properties: {
          prompt_type: {
            type: "string",
            enum: ["story", "essay", "poem", "character_sketch", "scene", "dialogue"],
            description: "Type of creative writing assignment"
          },
          title: {
            type: "string",
            description: "Title for the writing project"
          },
          brainstorming_questions: {
            type: "array",
            description: "Guided questions to help student generate ideas",
            items: {
              type: "object",
              properties: {
                category: {
                  type: "string",
                  enum: ["character", "setting", "plot", "conflict", "theme", "style", "structure"],
                  description: "What aspect of writing this question focuses on"
                },
                question: {
                  type: "string",
                  description: "The specific question to guide student thinking"
                },
                hint: {
                  type: "string", 
                  description: "Optional hint to help student if they're stuck"
                }
              },
              required: ["category", "question"]
            }
          },
          planning_sections: {
            type: "array",
            description: "Sections to help organize student's ideas",
            items: {
              type: "object",
              properties: {
                section_name: {
                  type: "string",
                  description: "Name of this planning section (e.g., 'Character Notes', 'Plot Outline')"
                },
                prompts: {
                  type: "array",
                  items: { type: "string" },
                  description: "Specific prompts for this section"
                }
              },
              required: ["section_name", "prompts"]
            }
          }
        },
        required: ["prompt_type", "title", "brainstorming_questions"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "clear_workspace",
      description: "Clear the current workspace (use sparingly, only when starting completely new topic)",
      parameters: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            description: "Reason for clearing workspace"
          }
        }
      }
    }
  }
];

module.exports = { 
  WORKSPACE_TOOLS, 
  SUBJECT_CONTENT_TYPES,
  
  // Helper functions for subject detection and workspace type mapping
  getWorkspaceTypeForSubject: (subject) => {
    return SUBJECT_CONTENT_TYPES[subject]?.workspace_type || 'math_problems';
  },
  
  getContentTypesForSubject: (subject) => {
    return SUBJECT_CONTENT_TYPES[subject]?.content_types || ['general'];
  },
  
  getEvaluationTypeForSubject: (subject) => {
    return SUBJECT_CONTENT_TYPES[subject]?.evaluation_type || 'binary';
  },

  // Subject detection from MCP materials
  detectSubjectFromMaterial: (materialData) => {
    if (!materialData || !materialData.material) return 'math';
    
    const subject = materialData.material.subject?.toLowerCase();
    const title = materialData.material.title?.toLowerCase() || '';
    const contentType = materialData.material.content_type?.toLowerCase() || '';
    
    // Direct subject mapping
    if (SUBJECT_CONTENT_TYPES[subject]) {
      return subject;
    }
    
    // Keyword-based detection
    if (title.includes('science') || title.includes('lab') || title.includes('experiment')) {
      return 'science';
    }
    if (title.includes('history') || title.includes('civil war') || title.includes('revolution')) {
      return 'history';
    }
    if (title.includes('english') || title.includes('reading') || title.includes('writing') || 
        title.includes('language arts') || title.includes('literature')) {
      return 'language arts';
    }
    if (title.includes('social') || title.includes('government') || title.includes('civic')) {
      return 'social studies';
    }
    
    // Default to math if no other subject detected
    return 'math';
  },

  // Generate subject-appropriate workspace content from MCP material
  generateWorkspaceFromMaterial: function(materialData, maxItems = 5) {
    const subject = module.exports.detectSubjectFromMaterial(materialData);
    const workspaceType = module.exports.getWorkspaceTypeForSubject(subject);
    
    if (!materialData.questions || materialData.questions.length === 0) {
      return null;
    }

    const content = materialData.questions.slice(0, maxItems).map((question, index) => {
      const contentType = module.exports.inferContentTypeFromQuestion(question, subject);
      
      return {
        text: question.toString().replace(/^\d+\.\s*/, ''), // Remove question numbering
        type: contentType,
        hint: module.exports.generateHintForContentType(contentType, subject),
        difficulty: 'medium',
        evaluation_criteria: {
          type: module.exports.getEvaluationTypeForSubject(subject)
        }
      };
    });

    return {
      subject: subject,
      workspace_type: workspaceType,
      title: materialData.material.title || `${subject.charAt(0).toUpperCase() + subject.slice(1)} Practice`,
      content: content,
      explanation: `Practice with ${materialData.material.title}`,
      learning_objectives: materialData.learning_objectives || []
    };
  },

  // Helper to infer content type from question text
  inferContentTypeFromQuestion: function(questionText, subject) {
    const text = questionText.toLowerCase();
    
    switch (subject) {
      case 'math':
        if (text.includes('+') || text.includes('add')) return 'addition';
        if (text.includes('-') || text.includes('subtract')) return 'subtraction';
        if (text.includes('×') || text.includes('*') || text.includes('multiply')) return 'multiplication';
        if (text.includes('÷') || text.includes('/') || text.includes('divide')) return 'division';
        if (text.includes('fraction') || text.includes('/')) return 'fractions';
        return 'word_problem';
        
      case 'science':
        if (text.includes('hypothesis') || text.includes('predict')) return 'hypothesis';
        if (text.includes('observe') || text.includes('record')) return 'observation';
        if (text.includes('step') || text.includes('procedure')) return 'experiment_step';
        if (text.includes('conclude') || text.includes('explain')) return 'conclusion';
        return 'observation';
        
      case 'history':
        if (text.includes('when') || text.includes('date') || text.includes('year')) return 'timeline_event';
        if (text.includes('why') || text.includes('cause') || text.includes('effect')) return 'cause_effect';
        if (text.includes('compare') || text.includes('contrast')) return 'compare_contrast';
        if (text.includes('source') || text.includes('document')) return 'primary_source';
        return 'historical_thinking';
        
      case 'language arts':
        if (text.includes('read') || text.includes('passage') || text.includes('comprehension')) return 'reading_comprehension';
        if (text.includes('story') || text.includes('creative') || text.includes('imagination') || text.includes('character')) return 'creative_writing';
        if (text.includes('essay') || text.includes('thesis') || text.includes('argument')) return 'essay_structure';
        if (text.includes('brainstorm') || text.includes('ideas') || text.includes('plan')) return 'brainstorming';
        if (text.includes('revise') || text.includes('edit') || text.includes('improve')) return 'revision';
        if (text.includes('plot') || text.includes('setting') || text.includes('theme')) return 'story_elements';
        if (text.includes('write') || text.includes('paragraph')) return 'writing_prompt';
        if (text.includes('grammar') || text.includes('sentence')) return 'grammar';
        if (text.includes('vocabulary') || text.includes('word') || text.includes('meaning')) return 'vocabulary';
        return 'reading_comprehension';
        
      case 'social studies':
        if (text.includes('map') || text.includes('location')) return 'map_analysis';
        if (text.includes('government') || text.includes('democracy')) return 'civic_scenario';
        if (text.includes('culture') || text.includes('society')) return 'cultural_comparison';
        if (text.includes('economy') || text.includes('trade')) return 'economics';
        return 'civic_scenario';
        
      default:
        return 'general';
    }
  },

  // Generate appropriate hints based on content type and subject
  generateHintForContentType: function(contentType, subject) {
    const hintMap = {
      math: {
        addition: "Add the numbers together, starting with the ones place if needed!",
        subtraction: "Subtract the second number from the first. Remember to borrow if needed!",
        multiplication: "Think of multiplication as repeated addition!",
        division: "How many times does the divisor go into the dividend?",
        fractions: "Work with the numerators and denominators separately",
        word_problem: "Read carefully and identify what the problem is asking for"
      },
      science: {
        hypothesis: "Make an educated guess based on what you know. Use 'If... then...' format",
        observation: "Use your senses to record exactly what you see, hear, or measure",
        experiment_step: "Follow the procedure carefully and in order",
        conclusion: "Look at your data - what patterns do you see? What did you learn?",
        data_collection: "Record your measurements accurately and organize your data"
      },
      history: {
        timeline_event: "Think about when this happened in relation to other events",
        cause_effect: "What led to this event? What happened as a result?",
        primary_source: "What can this document tell us about the time period?",
        compare_contrast: "How are these similar? How are they different?",
        historical_thinking: "Use evidence to support your reasoning"
      },
      "language arts": {
        reading_comprehension: "Read carefully and look for key details in the text",
        writing_prompt: "Organize your thoughts before you start writing",
        vocabulary: "Use context clues to help determine the meaning",
        grammar: "Think about the rules for correct sentence structure",
        literary_analysis: "What evidence from the text supports your answer?",
        creative_writing: "Let your imagination flow! Focus on creating vivid characters and settings",
        essay_structure: "Start with a clear thesis, support with evidence, and conclude strongly",
        story_elements: "Consider character, setting, plot, conflict, and theme in your story",
        brainstorming: "Write down all your ideas first - don't worry about organizing them yet",
        revision: "Read your work aloud and look for ways to make it clearer and more engaging"
      },
      "social studies": {
        map_analysis: "Look at the legend, scale, and compass rose for clues",
        civic_scenario: "Think about rights, responsibilities, and democratic principles",
        cultural_comparison: "Consider how geography and history shape culture",
        economics: "Think about supply, demand, and how people make choices",
        government_structure: "Consider how power is distributed and decisions are made"
      }
    };
    
    return hintMap[subject]?.[contentType] || "Take your time and think through this step by step!";
  },

  // Cross-subject learning connections
  findCrossSubjectConnections: function(currentSubject, topic, otherSubjects = []) {
    const connections = {
      math: {
        science: {
          fractions: "Fractions are used in chemistry for ratios and proportions",
          decimals: "Decimals appear in scientific measurements and data",
          geometry: "Geometric shapes help understand molecular structures",
          algebra: "Algebraic equations model scientific relationships"
        },
        history: {
          fractions: "Historical timelines often use fractional periods",
          statistics: "Population data and historical trends use statistics",
          geometry: "Architecture and engineering in historical civilizations"
        },
        "language arts": {
          word_problem: "Math word problems develop reading comprehension skills",
          statistics: "Data analysis skills transfer to literary analysis"
        }
      },
      science: {
        math: {
          hypothesis: "Hypotheses often involve mathematical predictions",
          data_collection: "Data collection requires mathematical measurement",
          observation: "Scientific observations use mathematical precision"
        },
        history: {
          experiment_step: "Scientific method development through history",
          observation: "Historical scientific discoveries and their impact"
        }
      },
      history: {
        "language arts": {
          primary_source: "Primary sources are literary texts requiring analysis",
          timeline_event: "Historical narratives develop reading comprehension",
          cause_effect: "Cause and effect analysis transfers to literature"
        },
        math: {
          timeline_event: "Timelines involve mathematical sequencing and intervals",
          cause_effect: "Statistical analysis of historical patterns"
        }
      },
      "language arts": {
        history: {
          reading_comprehension: "Historical texts develop comprehension skills",
          vocabulary: "Historical context enriches vocabulary learning",
          writing_prompt: "Historical topics provide rich writing material"
        },
        science: {
          vocabulary: "Scientific terminology expands academic vocabulary",
          writing_prompt: "Science topics provide factual writing opportunities"
        }
      }
    };

    const currentConnections = connections[currentSubject] || {};
    const foundConnections = [];

    for (const otherSubject of otherSubjects) {
      if (currentConnections[otherSubject]) {
        const subjectConnections = currentConnections[otherSubject];
        for (const [contentType, connection] of Object.entries(subjectConnections)) {
          if (topic.toLowerCase().includes(contentType)) {
            foundConnections.push({
              subject: otherSubject,
              connection: connection,
              contentType: contentType
            });
          }
        }
      }
    }

    return foundConnections;
  },

  // Adaptive difficulty adjustment based on performance
  adaptDifficulty: function(currentDifficulty, recentPerformance, streakLength = 0) {
    // recentPerformance is array of booleans (true = correct, false = incorrect)
    if (!recentPerformance || recentPerformance.length < 3) {
      return currentDifficulty; // Not enough data to adapt
    }

    const correctCount = recentPerformance.filter(correct => correct).length;
    const accuracy = correctCount / recentPerformance.length;

    // Performance thresholds
    const highPerformance = accuracy >= 0.8 && streakLength >= 3;
    const lowPerformance = accuracy <= 0.4;
    const mediumPerformance = accuracy >= 0.6 && accuracy < 0.8;

    // Adapt difficulty
    if (highPerformance && currentDifficulty !== 'hard') {
      return currentDifficulty === 'easy' ? 'medium' : 'hard';
    } else if (lowPerformance && currentDifficulty !== 'easy') {
      return currentDifficulty === 'hard' ? 'medium' : 'easy';
    } else if (mediumPerformance && currentDifficulty === 'hard') {
      return 'medium'; // Step down slightly if struggling with hard
    }

    return currentDifficulty; // No change needed
  },

  // Generate next problems based on performance and learning patterns
  generateAdaptiveContent: function(subject, completedContent, performanceData, targetCount = 3) {
    const contentTypes = this.getContentTypesForSubject(subject);
    const evaluationType = this.getEvaluationTypeForSubject(subject);
    
    // Analyze performance by content type
    const performanceByType = {};
    completedContent.forEach((content, index) => {
      const performance = performanceData[index];
      if (!performanceByType[content.type]) {
        performanceByType[content.type] = [];
      }
      performanceByType[content.type].push(performance);
    });

    // Determine what to practice next
    const nextContent = [];
    
    // Prioritize content types that need more practice
    const strugglingTypes = Object.entries(performanceByType)
      .filter(([type, performances]) => {
        const accuracy = performances.filter(p => p).length / performances.length;
        return accuracy < 0.7;
      })
      .map(([type]) => type);

    // Generate content focusing on struggling areas
    let contentToGenerate = targetCount;
    
    if (strugglingTypes.length > 0) {
      strugglingTypes.forEach(type => {
        if (contentToGenerate > 0) {
          const accuracy = performanceByType[type].filter(p => p).length / performanceByType[type].length;
          const difficulty = accuracy < 0.5 ? 'easy' : 'medium';
          
          nextContent.push({
            type: type,
            difficulty: difficulty,
            hint: this.generateHintForContentType(type, subject),
            focus: 'remediation'
          });
          contentToGenerate--;
        }
      });
    }

    // Fill remaining with varied content
    while (contentToGenerate > 0) {
      const randomType = contentTypes[Math.floor(Math.random() * contentTypes.length)];
      const recentPerformance = performanceData.slice(-5); // Last 5 attempts
      const adaptedDifficulty = this.adaptDifficulty('medium', recentPerformance);
      
      nextContent.push({
        type: randomType,
        difficulty: adaptedDifficulty,
        hint: this.generateHintForContentType(randomType, subject),
        focus: 'practice'
      });
      contentToGenerate--;
    }

    return nextContent;
  },

  // Suggest complementary activities from other subjects
  suggestComplementaryActivities: function(currentSubject, topic, completedActivities = []) {
    const suggestions = [];
    
    // Define cross-curricular activity suggestions
    const activityMap = {
      math: {
        fractions: [
          { subject: "science", activity: "Measure ingredients for a chemistry experiment using fractions" },
          { subject: "language arts", activity: "Read and analyze a recipe that uses fractional measurements" }
        ],
        geometry: [
          { subject: "history", activity: "Study architectural designs from ancient civilizations" },
          { subject: "science", activity: "Explore geometric patterns in nature and crystals" }
        ]
      },
      science: {
        density: [
          { subject: "math", activity: "Calculate density using division and measurement" },
          { subject: "history", activity: "Learn about Archimedes' discovery of density principles" }
        ],
        hypothesis: [
          { subject: "language arts", activity: "Write a hypothesis using clear, scientific language" },
          { subject: "math", activity: "Create mathematical predictions for your hypothesis" }
        ]
      },
      history: {
        "civil war": [
          { subject: "math", activity: "Analyze Civil War statistics and battle data" },
          { subject: "language arts", activity: "Read primary source letters from Civil War soldiers" }
        ]
      }
    };

    const currentActivities = activityMap[currentSubject] || {};
    
    for (const [activityTopic, activities] of Object.entries(currentActivities)) {
      if (topic.toLowerCase().includes(activityTopic)) {
        suggestions.push(...activities);
      }
    }

    return suggestions.slice(0, 3); // Return top 3 suggestions
  }
};