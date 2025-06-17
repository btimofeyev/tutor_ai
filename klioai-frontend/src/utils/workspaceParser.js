// klioai-frontend/src/utils/workspaceParser.js - ENHANCED VERSION

export const parseWorkspaceContent = (message, lessonContext = null) => {
    if (!message || typeof message !== 'string') return null;
    
    const content = message.toLowerCase();
    
    console.log('🔍 Parsing workspace content:', message.substring(0, 100) + '...');
    
    // Enhanced detection patterns for ALL math problems including LaTeX
    const mathIndicators = [
        // LaTeX expressions
        /\\?\(\s*[^)]*[\+\-\*×÷\/\\]\s*[^)]*\s*\\?\)/g, // \( 7 + 5 \) or ( 7 + 5 )
        /\\frac\{[^}]+\}\{[^}]+\}/g, // \frac{2}{3}
        /\\\(\s*\\?\s*\d+[^)]*\\\)/g, // \( 4 \times \frac{2}{5} \)
        
        // Basic math operations
        /\d+\s*[\+\-\*×÷\/]\s*\d+/g,
        // Word problems with numbers
        /what\s+is\s+\d+[\+\-\*×÷\/]\d+/gi,
        // Regular fraction operations
        /\d+\/\d+\s*[×\*]\s*\d+\/\d+/g,
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
    
    // 1. Extract LaTeX expressions (PRIORITY - handle these first)
    const latexMatches = message.match(/\\?\(\s*([^)]+)\s*\\?\)/g);
    if (latexMatches) {
        latexMatches.forEach(latexExpr => {
            // Clean up the LaTeX expression
            let cleanExpr = latexExpr.replace(/\\?\(|\\\)/g, '').trim();
            
            // Check if it contains math operations
            if (/[\+\-\*×÷\/]|\\frac|\\times/.test(cleanExpr)) {
                problems.push({
                    text: cleanExpr,
                    type: determineProblemType(cleanExpr),
                    hint: getHintForOperation(cleanExpr),
                    isLatex: true
                });
            }
        });
    }
    
    // 2. Extract numbered problems from list format
    const numberedListMatches = message.match(/^\s*\d+\.\s*(.+)$/gm);
    if (numberedListMatches) {
        numberedListMatches.forEach(listItem => {
            const cleanText = listItem.replace(/^\s*\d+\.\s*/, '').trim();
            
            // Check if it's a math problem
            if (/[\+\-\*×÷\/]|\\frac|\\times|\d/.test(cleanText)) {
                problems.push({
                    text: cleanText,
                    type: determineProblemType(cleanText),
                    hint: getHintForOperation(cleanText),
                    isLatex: cleanText.includes('\\')
                });
            }
        });
    }
    
    // 3. Extract bold problems (like **What is 27 + 15?**)
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
    
    // 4. Extract fraction problems
    const fractionProblems = message.match(/(?:\\frac\{\d+\}\{\d+\}|\d+\/\d+)\s*[×\*]\s*(?:\\frac\{\d+\}\{\d+\}|\d+\/\d+)/g);
    if (fractionProblems) {
        fractionProblems.forEach(fraction => {
            problems.push({
                text: fraction,
                type: 'fraction_multiplication',
                hint: "Multiply numerators together, then denominators together",
                isLatex: fraction.includes('\\frac')
            });
        });
    }
    
    // 5. Extract simple arithmetic from text (if no other problems found)
    if (problems.length === 0) {
        const arithmeticMatches = message.match(/\d+\s*[\+\-\*×÷\/]\s*\d+(?:\s*=\s*\?)?/g);
        if (arithmeticMatches) {
            arithmeticMatches.forEach(math => {
                problems.push({
                    text: math.replace(/\s*=\s*\?/, ''),
                    type: determineProblemType(math),
                    hint: getHintForOperation(math)
                });
            });
        }
    }
    
    // If we found problems, create workspace content
    if (problems.length > 0) {
        console.log(`📝 Found ${problems.length} problems:`, problems.map(p => p.text));
        
        // Check if this is part of an explanation (has steps or instructions)
        const hasExplanation = content.includes('steps') || 
                              content.includes('multiply') && content.includes('together') ||
                              content.includes('first') || content.includes('second') ||
                              /\d+\.\s*\*\*/.test(message) ||
                              content.includes('work through') ||
                              content.includes('let me know what');
        
        if (hasExplanation && problems.length > 0) {
            return {
                type: 'mixed',
                content: [
                    {
                        type: 'explanation',
                        content: message,
                        title: getExplanationTitle(message)
                    },
                    ...problems.map((problem, index) => ({
                        type: 'math_problem',
                        id: `problem-${index}`,
                        ...problem
                    }))
                ]
            };
        } else {
            return {
                type: 'math_problems',
                problems: problems.map((problem, index) => ({
                    ...problem,
                    id: `problem-${index}`
                }))
            };
        }
    }
    
    // Check for assignment content as fallback
    const hasAssignmentContent = content.includes('assignment') || 
                                content.includes('learning goals') ||
                                content.includes('tackle') ||
                                content.includes('practice');
    
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
    if (/[\*×]|\\times/.test(text)) return 'multiplication';
    if (/[÷\/]/.test(text)) return 'division';
    if (/\\frac|\d+\/\d+/.test(text)) return 'fractions';
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
    if (/[\*×]|\\times/.test(text)) {
        if (/\\frac|\d+\/\d+/.test(text)) {
            return "Multiply numerators together, then denominators together";
        }
        return "Multiply the numbers. Think of it as repeated addition!";
    }
    if (/[÷\/]/.test(text)) {
        return "Divide the first number by the second. How many times does it go in?";
    }
    if (/\\frac/.test(text)) {
        return "Work with the fractions step by step - multiply numerators, then denominators";
    }
    return "Take your time and work step by step!";
}


// Helper function to get explanation title
function getExplanationTitle(message) {
    if (/fraction|\\frac/.test(message)) return 'How to Work with Fractions';
    if (message.includes('addition')) return 'Addition Practice';
    if (message.includes('subtraction')) return 'Subtraction Practice';
    if (message.includes('multiplication') || message.includes('\\times')) return 'Multiplication Practice';
    if (message.includes('division')) return 'Division Practice';
    if (message.includes('warm up')) return 'Warm-up Problems';
    if (message.includes('practice')) return 'Practice Problems';
    return 'Math Practice';
}
// Enhanced function to detect structured content in chat messages across ALL subjects
export const hasStructuredContent = (content) => {
    if (!content || typeof content !== 'string') return false;
    
    const indicators = [
        // Math content (LaTeX expressions, arithmetic)
        /\\?\(\s*[^)]*[\+\-\*×÷\/\\]\s*[^)]*\s*\\?\)/,
        /\\frac\{[^}]+\}\{[^}]+\}/,
        /\\times/,
        /\d+\s*[\+\-\*×÷\/]\s*\d+/,
        /what\s+is\s+\d+/i,
        /\*\*[^*]*\d+[^*]*\*\*/,
        /^\s*\d+\.\s*[^.]*[\+\-\*×÷\/\\]/m,
        /\d+\/\d+.*×.*\d+\/\d+/,
        /multiply.*numerator/i,
        
        // Science content
        /hypothesis/i,
        /experiment/i,
        /observe|observation/i,
        /predict/i,
        /lab.*activity/i,
        /scientific.*method/i,
        /data.*collection/i,
        /conclusion/i,
        /variables/i,
        /if.*then.*because/i,
        
        // History content
        /timeline/i,
        /cause.*effect/i,
        /primary.*source/i,
        /historical/i,
        /when.*did.*happen/i,
        /civil.*war|revolution|independence/i,
        /compare.*contrast/i,
        /evidence.*from.*history/i,
        
        // Language Arts content
        /reading.*comprehension/i,
        /main.*idea/i,
        /supporting.*details/i,
        /vocabulary/i,
        /grammar/i,
        /writing.*prompt/i,
        /essay|paragraph/i,
        /literary.*analysis/i,
        /character.*motivation/i,
        
        // Social Studies content
        /government/i,
        /democracy/i,
        /civic|citizen/i,
        /map.*analysis/i,
        /geography/i,
        /culture|cultural/i,
        /economics|economy/i,
        
        // General learning content
        /learning goals/i,
        /assignment/i,
        /problem.*\d+/i,
        /question.*\d+/i,
        /step.*\d+/i,
        /first.*second/i,
        /\d+\.\s*\*\*/,
        
        // Educational patterns (any subject)
        /tackle.*together/i,
        /let's.*solve/i,
        /practice.*problem/i,
        /warm.*up/i,
        /work through/i,
        /give.*try/i,
        /let me know what.*come up with/i,
        /let's.*practice/i,
        /help.*me.*with/i,
        /work.*on/i
    ];
    
    const hasIndicator = indicators.some(pattern => pattern.test(content));
    
    if (hasIndicator) {
        console.log('✅ Structured content detected in:', content.substring(0, 100));
    }
    
    return hasIndicator;
};

// NEW: Detect subject from message content
export const detectSubjectFromMessage = (content) => {
    if (!content || typeof content !== 'string') return 'math';
    
    const text = content.toLowerCase();
    
    // Science indicators
    if (text.includes('science') || text.includes('experiment') || text.includes('hypothesis') ||
        text.includes('lab') || text.includes('observe') || text.includes('data') ||
        text.includes('scientific method') || text.includes('conclusion')) {
        return 'science';
    }
    
    // History indicators
    if (text.includes('history') || text.includes('historical') || text.includes('timeline') ||
        text.includes('civil war') || text.includes('revolution') || text.includes('primary source') ||
        text.includes('cause and effect') || text.includes('when did')) {
        return 'history';
    }
    
    // Language Arts indicators
    if (text.includes('reading') || text.includes('writing') || text.includes('english') ||
        text.includes('language arts') || text.includes('grammar') || text.includes('vocabulary') ||
        text.includes('essay') || text.includes('paragraph') || text.includes('main idea')) {
        return 'language arts';
    }
    
    // Social Studies indicators
    if (text.includes('social studies') || text.includes('government') || text.includes('civic') ||
        text.includes('democracy') || text.includes('geography') || text.includes('economics') ||
        text.includes('culture') || text.includes('society')) {
        return 'social studies';
    }
    
    // Default to math if no other subject detected
    return 'math';
};

// NEW: Detect workspace type from subject and content
export const getWorkspaceTypeForSubject = (subject) => {
    const workspaceTypes = {
        'math': 'math_problems',
        'science': 'science_investigation', 
        'history': 'history_analysis',
        'language arts': 'language_practice',
        'social studies': 'social_investigation'
    };
    
    return workspaceTypes[subject] || 'math_problems';
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
                questionNumber: questionNumber,
                id: `question-${questionNumber}`
            }]
        };
    }
    
    return null;
};

// Quick test function to validate parsing
export const testWorkspaceParser = () => {
    const testMessages = [
        "What is \\( 7 + 5 \\)?",
        "Let's try these problems:\n1. \\( 4 \\times \\frac{2}{5} \\)\n2. \\( 7 \\times \\frac{3}{8} \\)\n3. \\( 5 \\times \\frac{1}{2} \\)",
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