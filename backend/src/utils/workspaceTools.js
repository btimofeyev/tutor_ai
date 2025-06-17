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
    content_types: ["reading_comprehension", "vocabulary", "grammar", "writing_prompt", "literary_analysis"],
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
        if (text.includes('write') || text.includes('essay') || text.includes('paragraph')) return 'writing_prompt';
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
        literary_analysis: "What evidence from the text supports your answer?"
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
  }
};