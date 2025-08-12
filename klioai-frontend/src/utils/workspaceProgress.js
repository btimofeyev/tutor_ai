// klioai-frontend/src/utils/workspaceProgress.js
// Simple utility to detect when Klio confirms correct answers

export const detectCorrectAnswer = (klioMessage, workspaceContext = null) => {
    if (!klioMessage || typeof klioMessage !== 'string') return null;

    const messageLower = klioMessage.toLowerCase();

    // Positive confirmation patterns
    const correctPatterns = [
      /perfect!?\s*you'?re\s*absolutely\s*right/i,
      /excellent\s*work!?\s*that'?s\s*exactly\s*correct/i,
      /outstanding!?\s*you\s*nailed\s*it/i,
      /that'?s\s*correct!?\s*🎉/i,
      /you'?re\s*thinking\s*exactly\s*right/i,
      /great\s*job!?\s*.*correct/i,
      /excellent!?\s*that'?s\s*right/i,
      /perfect!?\s*.*🎉/i,
      /outstanding\s*work!?\s*.*exactly\s*right/i
    ];

    // Check if Klio is confirming a correct answer
    const isConfirmingCorrect = correctPatterns.some(pattern => pattern.test(klioMessage));

    if (!isConfirmingCorrect) return null;

    // Try to extract what problem was solved
    let problemContext = null;

    // Look for math expressions or problem references
    const mathExpressions = [
      /(\d+\s*[\+\-\*×÷\/]\s*\d+)/g,
      /(\d+\/\d+\s*[×\*]\s*\d+\/\d+)/g,
      /(\d+\s*rounded\s*to.*\d+)/gi
    ];

    for (const pattern of mathExpressions) {
      const matches = klioMessage.match(pattern);
      if (matches) {
        problemContext = {
          type: 'math_problem',
          expression: matches[0],
          detectedFrom: 'klio_response'
        };
        break;
      }
    }

    // If we have workspace context, try to match against current problems
    if (workspaceContext && workspaceContext.problems) {
      const activeProblem = workspaceContext.problems.find(p =>
        workspaceContext.problemStates?.[p.id] === 'checking'
      );

      if (activeProblem) {
        problemContext = {
          type: 'workspace_problem',
          problemId: activeProblem.id,
          problemText: activeProblem.text,
          detectedFrom: 'workspace_context'
        };
      }
    }

    return {
      isCorrect: true,
      confidence: 0.9, // High confidence for explicit confirmations
      problemContext,
      triggerPhrase: klioMessage.substring(0, 50) + '...'
    };
  };

  // Detect when Klio indicates an incorrect answer
  export const detectIncorrectAnswer = (klioMessage, workspaceContext = null) => {
    if (!klioMessage || typeof klioMessage !== 'string') return null;

    const incorrectPatterns = [
      /not\s*quite\s*right/i,
      /that'?s\s*not\s*correct/i,
      /let'?s\s*try\s*again/i,
      /close,?\s*but/i,
      /almost!?\s*but/i
    ];

    const isIncorrect = incorrectPatterns.some(pattern => pattern.test(klioMessage));

    if (!isIncorrect) return null;

    // Similar logic to extract problem context
    let problemContext = null;

    if (workspaceContext && workspaceContext.problems) {
      const activeProblem = workspaceContext.problems.find(p =>
        workspaceContext.problemStates?.[p.id] === 'checking'
      );

      if (activeProblem) {
        problemContext = {
          type: 'workspace_problem',
          problemId: activeProblem.id,
          problemText: activeProblem.text,
          detectedFrom: 'workspace_context'
        };
      }
    }

    return {
      isCorrect: false,
      confidence: 0.8,
      problemContext,
      triggerPhrase: klioMessage.substring(0, 50) + '...'
    };
  };

  // Main function to analyze Klio's response for progress updates
  export const analyzeKlioResponse = (klioMessage, workspaceContext = null) => {
    const correctResult = detectCorrectAnswer(klioMessage, workspaceContext);
    if (correctResult) return correctResult;

    const incorrectResult = detectIncorrectAnswer(klioMessage, workspaceContext);
    if (incorrectResult) return incorrectResult;

    return null; // No progress update detected
  };
