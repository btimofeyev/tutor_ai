// klioai-frontend/src/utils/workspaceParser.js - ENHANCED VERSION
// Supports ALL math problems, not just fractions

export const parseWorkspaceContent = (message, lessonContext = null) => {
    if (!message || typeof message !== 'string') return null;
    
    const content = message.toLowerCase();
    
    console.log('🔍 Parsing workspace content:', message.substring(0, 100) + '...');
    
    // Enhanced detection patterns for ALL math problems
    const mathIndicators = [
        // Basic math operations
        /\d+\s*[\+\-\*×÷\/]\s*\d+/g,
        // Word problems with numbers
        /what\s+is\s+\d+[\+\-\*×÷\/]\d+/gi,
        // Fraction operations
        /\d+\/\d+\s*[×\*]\s*\d+\/\d+/g,
        // LaTeX fractions
        /\\frac\{\d+\}\{\d+\}/g,
        // Decimal operations
        /\d+\.\d+\s*[\+\-\*×÷\/]\s*\d+\.?\d*/g,
        // Problem numbers
        /(?:problem|question)\s*\d+[:\.]?\s*[^\n]+/gi,
        // Explicit math problems in messages
        /\*\*[^*]+\*\*/g // Bold text often contains problems
    ];
    
    // Check if this contains any math content
    const hasMathContent = mathIndicators.some(pattern => pattern.test(message));
    
    if (!hasMathContent) {
        console.log('❌ No math content detected');
        return null;
    }
    
    console.log('✅ Math content detected!');
    
    // Extract different types of problems
    const problems = [];
    
    // 1. Extract bold problems (like **What is 27 + 15?**)
    const boldProblems = message.match(/\*\*([^*]+)\*\*/g);
    if (boldProblems) {
        boldProblems.forEach(boldText => {
            const cleanText = boldText.replace(/\*\*/g, '').trim();
            if (/\d+\s*[\+\-\*×÷\/]\s*\d+/.test(cleanText)) {
                problems.push({
                    text: cleanText,
                    type: 'arithmetic',
                    hint: getHintForOperation(cleanText)
                });
            }
        });
    }
    
    // 2. Extract numbered problems
    const numberedProblems = message.match(/(?:problem|question)\s*\d+[:\.]?\s*([^\n.!?]+)/gi);
    if (numberedProblems) {
        numberedProblems.forEach(problem => {
            const cleanText = problem.replace(/(?:problem|question)\s*\d+[:\.]?\s*/i, '').trim();
            if (/\d/.test(cleanText)) {
                problems.push({
                    text: cleanText,
                    type: determineProblemType(cleanText),
                    hint: getHintForOperation(cleanText)
                });
            }
        });
    }
    
    // 3. Extract fraction problems
    const fractionProblems = message.match(/(?:\\frac\{\d+\}\{\d+\}|\d+\/\d+)\s*[×\*]\s*(?:\\frac\{\d+\}\{\d+\}|\d+\/\d+)/g);
    if (fractionProblems) {
        fractionProblems.forEach(fraction => {
            problems.push({
                text: fraction,
                type: 'fraction_multiplication',
                hint: "Multiply numerators together, then denominators together"
            });
        });
    }
    
    // 4. Extract simple arithmetic from text
    const arithmeticMatches = message.match(/\d+\s*[\+\-\*×÷\/]\s*\d+(?:\s*=\s*\?)?/g);
    if (arithmeticMatches) {
        arithmeticMatches.forEach(math => {
            // Don't duplicate if already found in bold or numbered problems
            const isDuplicate = problems.some(p => p.text.includes(math.replace(/\s*=\s*\?/, '')));
            if (!isDuplicate) {
                problems.push({
                    text: math.replace(/\s*=\s*\?/, ''),
                    type: determineProblemType(math),
                    hint: getHintForOperation(math)
                });
            }
        });
    }
    
    // If we found problems, create workspace content
    if (problems.length > 0) {
        console.log(`📝 Found ${problems.length} problems:`, problems.map(p => p.text));
        
        // Check if this is part of an explanation (has steps or instructions)
        const hasExplanation = content.includes('steps') || 
                              content.includes('multiply') && content.includes('together') ||
                              content.includes('first') || content.includes('second') ||
                              /\d+\.\s*\*\*/.test(message);
        
        if (hasExplanation && problems.length > 0) {
            return {
                type: 'mixed',
                content: [
                    {
                        type: 'explanation',
                        content: message,
                        title: getExplanationTitle(message)
                    },
                    ...problems.map(problem => ({
                        type: 'math_problem',
                        ...problem
                    }))
                ]
            };
        } else {
            return {
                type: 'math_problems',
                problems: problems
            };
        }
    }
    
    // Check for assignment content as fallback
    const hasAssignmentContent = content.includes('assignment') || 
                                content.includes('learning goals') ||
                                content.includes('tackle');
    
    if (lessonContext && hasAssignmentContent) {
        return {
            type: 'assignment',
            data: {
                title: lessonContext.title || 'Current Assignment',
                type: lessonContext.content_type || 'lesson',
                learningGoals: lessonContext.lesson_json?.learning_objectives || [],
                problems: lessonContext.lesson_json?.tasks_or_questions?.slice(0, 8) || [],
                estimatedTime: lessonContext.lesson_json?.estimated_completion_time_minutes
            }
        };
    }
    
    console.log('❌ No structured content detected');
    return null;
};

// Helper function to determine problem type
function determineProblemType(text) {
    if (/[\+]/.test(text)) return 'addition';
    if (/[\-]/.test(text)) return 'subtraction';
    if (/[\*×]/.test(text)) return 'multiplication';
    if (/[÷\/]/.test(text)) return 'division';
    if (/\d+\/\d+/.test(text)) return 'fractions';
    if (/\d+\.\d+/.test(text)) return 'decimals';
    return 'arithmetic';
}

// Helper function to get appropriate hints
function getHintForOperation(text) {
    const textLower = text.toLowerCase();
    
    if (/[\+]/.test(text)) {
        return "Add the numbers together. Start with the ones place if needed!";
    }
    if (/[\-]/.test(text)) {
        return "Subtract the second number from the first. Borrow if needed!";
    }
    if (/[\*×]/.test(text)) {
        if (/\d+\/\d+/.test(text)) {
            return "Multiply numerators together, then denominators together";
        }
        return "Multiply the numbers. Think of it as repeated addition!";
    }
    if (/[÷\/]/.test(text)) {
        return "Divide the first number by the second. How many times does it go in?";
    }
    return "Take your time and work step by step!";
}

// Helper function to get explanation title
function getExplanationTitle(message) {
    if (message.includes('fraction')) return 'How to Multiply Fractions';
    if (message.includes('addition')) return 'Addition Practice';
    if (message.includes('subtraction')) return 'Subtraction Practice';
    if (message.includes('multiplication')) return 'Multiplication Practice';
    if (message.includes('division')) return 'Division Practice';
    return 'Math Explanation';
}

// Enhanced function to detect structured content in chat messages
export const hasStructuredContent = (content) => {
    if (!content || typeof content !== 'string') return false;
    
    const indicators = [
        // Math problems
        /\d+\s*[\+\-\*×÷\/]\s*\d+/,
        /what\s+is\s+\d+/i,
        /\*\*[^*]*\d+[^*]*\*\*/,
        
        // Fractions
        /\\frac\{.*\}\{.*\}/,
        /\d+\/\d+.*×.*\d+\/\d+/,
        /multiply.*numerator/i,
        
        // Learning content
        /learning goals/i,
        /assignment/i,
        /problem.*\d+/i,
        /question.*\d+/i,
        
        // Step-by-step content
        /step.*\d+/i,
        /first.*second/i,
        /\d+\.\s*\*\*/,
        
        // Educational patterns
        /tackle.*together/i,
        /let's.*solve/i,
        /practice.*problem/i
    ];
    
    return indicators.some(pattern => pattern.test(content));
};

// Extract specific question from lesson JSON
export const extractQuestionFromLesson = (lessonJson, questionNumber) => {
    if (!lessonJson?.tasks_or_questions) return null;
    
    const questions = lessonJson.tasks_or_questions;
    const questionPattern = new RegExp(`^${questionNumber}\\.\\s`);
    
    const matchedQuestion = questions.find(q => 
        questionPattern.test(q.toString().trim())
    );
    
    if (matchedQuestion) {
        const cleanText = matchedQuestion.replace(/^\d+\.\s*/, '').trim();
        return {
            type: 'math_problems',
            problems: [{
                text: cleanText,
                type: determineProblemType(cleanText),
                hint: getHintForOperation(cleanText),
                questionNumber: questionNumber
            }]
        };
    }
    
    return null;
};

// Quick test function to validate parsing
export const testWorkspaceParser = () => {
    const testMessages = [
        "**What is 27 + 15?**",
        "Let's multiply fractions: \\frac{2}{3} \\times \\frac{4}{5}",
        "Here are some practice problems: 45 + 23 and 67 - 34",
        "Problem 1: Solve 125 × 4",
        "What is 84 ÷ 7? Take your time!"
    ];
    
    console.log('🧪 Testing workspace parser:');
    testMessages.forEach((msg, i) => {
        const result = parseWorkspaceContent(msg);
        console.log(`Test ${i + 1}:`, result ? '✅ Parsed' : '❌ Not parsed', result);
    });
};