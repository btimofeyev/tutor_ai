// Update your existing parseWorkspaceContent function with this enhanced version
// klioai-frontend/src/utils/workspaceParser.js

export const parseWorkspaceContent = (message, lessonContext = null) => {
    if (!message || typeof message !== 'string') return null;
  
    const content = message.toLowerCase();
    
    console.log('Parsing workspace content:', message.substring(0, 100) + '...');
    
    // Enhanced detection for fraction multiplication explanations
    const hasFractionExplanation = content.includes('multiply') && 
      (content.includes('numerator') || content.includes('denominator') || content.includes('fraction'));
    
    // Check for step-by-step patterns (1., 2., 3.)
    const hasNumberedSteps = /[1-3]\.\s*\*\*/.test(message);
    
    // Look for LaTeX fractions
    const fractionPattern = /\\frac\{(\d+)\}\{(\d+)\}/g;
    const fractionMatches = message.match(fractionPattern);
    
    // Look for example problems
    const examplePattern = /for example[^:]*:\s*([^\.!?\n]+)/i;
    const exampleMatch = message.match(examplePattern);
    
    // Check if this is the specific fraction explanation from your chat
    if (hasFractionExplanation && hasNumberedSteps) {
      console.log('Detected fraction explanation with steps');
      
      const problems = [];
      
      // Extract fractions from the example or message
      if (exampleMatch) {
        const exampleText = exampleMatch[1].trim();
        console.log('Found example:', exampleText);
        if (exampleText.includes('\\frac') || exampleText.includes('times')) {
          problems.push({
            text: exampleText,
            hint: "Follow the 3 steps above"
          });
        }
      }
      
      // Also look for any other fraction expressions
      if (fractionMatches) {
        fractionMatches.forEach(match => {
          // Create a multiplication problem if we have at least 2 fractions
          if (fractionMatches.length >= 2) {
            problems.push({
              text: fractionMatches.slice(0, 2).join(' \\times '),
              hint: "Remember: multiply numerators together, then denominators together"
            });
          }
        });
      }
      
      // If no specific problems found, create a generic example
      if (problems.length === 0) {
        problems.push({
          text: "\\frac{2}{3} \\times \\frac{4}{5}",
          hint: "Follow the steps: multiply 2×4=8, then 3×5=15, so the answer is 8/15"
        });
      }
  
      return {
        type: 'mixed',
        content: [
          {
            type: 'fraction_steps',
            content: message
          },
          ...problems.map(problem => ({
            type: 'math_problem',
            ...problem
          }))
        ]
      };
    }
  
    // Check for direct fraction problems (like in your workspace)
    if (fractionMatches && fractionMatches.length > 0) {
      console.log('Found fraction problems:', fractionMatches);
      return {
        type: 'math_problems',
        problems: fractionMatches.map((match, i) => ({
          text: match,
          hint: "Multiply the numerators together, then multiply the denominators together"
        }))
      };
    }
  
    // Check for assignment content
    const hasAssignmentContent = content.includes('assignment') || 
                                content.includes('learning goals') ||
                                content.includes('tackle') ||
                                content.includes('fundamental principle');
    
    if (lessonContext && hasAssignmentContent) {
      return {
        type: 'assignment',
        data: {
          title: lessonContext.title || 'Current Assignment',
          type: lessonContext.content_type || 'lesson',
          learningGoals: lessonContext.lesson_json?.learning_objectives || [],
          problems: lessonContext.lesson_json?.tasks_or_questions?.slice(0, 5) || [],
          estimatedTime: lessonContext.lesson_json?.estimated_completion_time_minutes
        }
      };
    }
  
    // Check for tree diagram mentions
    const hasTreeDiagram = content.includes('tree diagram') || 
                          content.includes('branches') ||
                          content.includes('outcomes');
  
    if (hasTreeDiagram && content.includes('shirt') && content.includes('pants')) {
      return {
        type: 'tree_diagram',
        data: {
          root: 'Outfit Choices',
          branches: [
            { label: 'Shirt 1', outcomes: ['Pants A', 'Pants B'] },
            { label: 'Shirt 2', outcomes: ['Pants A', 'Pants B'] },
            { label: 'Shirt 3', outcomes: ['Pants A', 'Pants B'] }
          ]
        }
      };
    }
  
    // Fall back to general math problems
    const mathProblemPattern = /(?:(?:problem|question)\s*\d+[:.]\s*|^\d+\.\s*).+/gim;
    const mathProblems = message.match(mathProblemPattern);
    
    if (mathProblems && mathProblems.length > 0) {
      return {
        type: 'math_problems',
        problems: mathProblems.map((problem, i) => ({
          text: problem.replace(/^\d+\.\s*/, '').trim(),
          hint: extractHint(message, i),
          workSpace: null
        }))
      };
    }
  
    console.log('No structured content detected');
    return null;
  };
  
  // Helper to extract hints
  const extractHint = (message, problemIndex) => {
    const hintPatterns = [
      /hint[:\s]+([^.!?]+)/i,
      /remember[:\s]+([^.!?]+)/i,
      /tip[:\s]+([^.!?]+)/i
    ];
    
    for (const pattern of hintPatterns) {
      const match = message.match(pattern);
      if (match) return match[1].trim();
    }
    
    return null;
  };
  
  // Special function to parse the exact content from your screenshot
  export const parseFractionMessage = (message) => {
    // This specifically handles the message in your screenshot
    const content = message.toLowerCase();
    
    if (content.includes('multiplying fractions') && content.includes('fun')) {
      console.log('Detected the specific fraction multiplication message');
      
      return {
        type: 'mixed',
        content: [
          {
            type: 'fraction_steps',
            content: message
          },
          {
            type: 'math_problem',
            text: "\\frac{2}{3} \\times \\frac{4}{5}",
            hint: "Follow the steps: 2×4=8 (numerators), 3×5=15 (denominators), so 8/15"
          }
        ]
      };
    }
    
    return null;
  };
  
  // Extract specific questions from lesson JSON
  export const extractQuestionFromLesson = (lessonJson, questionNumber) => {
    if (!lessonJson?.tasks_or_questions) return null;
    
    const questions = lessonJson.tasks_or_questions;
    const questionPattern = new RegExp(`^${questionNumber}\\.\\s`);
    
    const matchedQuestion = questions.find(q => 
      questionPattern.test(q.toString().trim())
    );
    
    if (matchedQuestion) {
      return {
        type: 'math_problems',
        problems: [{
          text: matchedQuestion.replace(/^\d+\.\s*/, '').trim(),
          hint: null,
          workSpace: null
        }]
      };
    }
    
    return null;
  };