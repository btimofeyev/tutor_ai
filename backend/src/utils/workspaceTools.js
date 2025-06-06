const WORKSPACE_TOOLS = [
  {
    type: "function",
    function: {
      name: "create_math_workspace",
      description: "Create a new math practice workspace with problems",
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
      name: "add_problems_to_workspace",
      description: "Add more problems to the existing workspace without resetting progress",
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
      name: "mark_problem_correct",
      description: "Mark a specific problem as correct when student shows right work",
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
      description: "Mark a problem as incorrect and provide guidance",
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

module.exports = { WORKSPACE_TOOLS };