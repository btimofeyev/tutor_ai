'use client';

import React, { useState, useEffect } from 'react';
import { FiX, FiArrowRight, FiArrowLeft, FiCheck, FiXCircle, FiHelpCircle, FiRefreshCw } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

/**
 * QuizPanel - Interactive quiz interface that slides out from the right
 * Features: Multiple question types, real-time feedback, progress tracking
 */
const QuizPanel = ({ 
  isVisible, 
  onClose, 
  quizData, 
  onHintRequest, 
  childData,
  assignment 
}) => {
  // Quiz state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [feedback, setFeedback] = useState({});
  const [score, setScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState('');

  // Timer state
  const [timeSpent, setTimeSpent] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  // Reset quiz when new quiz data arrives
  useEffect(() => {
    if (quizData) {
      setCurrentQuestion(0);
      setAnswers({});
      setFeedback({});
      setScore(0);
      setIsCompleted(false);
      setShowFeedback(false);
      setCurrentAnswer('');
      setTimeSpent(0);
      setQuestionStartTime(Date.now());
    }
  }, [quizData]);

  // Timer effect
  useEffect(() => {
    let interval;
    if (isVisible && !isCompleted) {
      interval = setInterval(() => {
        setTimeSpent(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isVisible, isCompleted]);

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle answer submission
  const handleSubmitAnswer = async () => {
    if (!currentAnswer.trim()) return;

    const question = quizData.questions[currentQuestion];
    
    // Debug logging to understand the validation issue
    console.log('🔍 Quiz Answer Debug:', {
      userAnswer: currentAnswer,
      correctAnswer: question.correctAnswer,
      questionType: question.type,
      options: question.options
    });
    
    const isCorrect = validateAnswer(currentAnswer, question);
    
    // Calculate time spent on this question
    const questionTime = Math.round((Date.now() - questionStartTime) / 1000);
    
    // Store answer and feedback
    const newAnswers = {
      ...answers,
      [currentQuestion]: {
        answer: currentAnswer,
        isCorrect,
        timeSpent: questionTime,
        timestamp: new Date().toISOString()
      }
    };
    
    const newFeedback = {
      ...feedback,
      [currentQuestion]: {
        isCorrect,
        explanation: question.explanation || generateExplanation(question, isCorrect),
        encouragement: isCorrect ? getCorrectEncouragement() : getIncorrectEncouragement()
      }
    };

    setAnswers(newAnswers);
    setFeedback(newFeedback);
    setShowFeedback(true);
    
    if (isCorrect) {
      setScore(prev => prev + 1);
    }

    // Save progress to localStorage
    saveQuizProgress(newAnswers, newFeedback, score + (isCorrect ? 1 : 0));
  };

  // Validate answer based on question type
  const validateAnswer = (answer, question) => {
    if (!answer || !question || !question.correctAnswer) {
      return false;
    }
    
    const normalizedAnswer = answer.toString().toLowerCase().trim();
    const correctAnswer = question.correctAnswer.toString().toLowerCase().trim();
    
    switch (question.type) {
      case 'multiple_choice':
        // For multiple choice, the answer could be:
        // 1. The selected option text (e.g., "Deserving respect due to age or wisdom")
        // 2. The letter choice (e.g., "B")
        // 3. The correct answer could be stored as either format
        
        // Direct text comparison
        if (normalizedAnswer === correctAnswer) {
          return true;
        }
        
        // Check if user selected the option text that matches correct answer
        if (question.options) {
          const selectedOptionIndex = question.options.findIndex(opt => 
            opt.toLowerCase().trim() === normalizedAnswer
          );
          
          if (selectedOptionIndex !== -1) {
            // User selected an option, check if it matches the correct answer text
            const selectedOption = question.options[selectedOptionIndex].toLowerCase().trim();
            if (selectedOption === correctAnswer) {
              return true;
            }
            
            // Also check if correct answer is stored as a letter (A, B, C, D)
            const correctLetter = String.fromCharCode(65 + selectedOptionIndex).toLowerCase();
            if (correctLetter === correctAnswer) {
              return true;
            }
          }
        }
        
        // Check if correct answer is stored as option text, and user selected the right letter
        if (question.options && /^[a-d]$/i.test(normalizedAnswer)) {
          const letterIndex = normalizedAnswer.charCodeAt(0) - 97; // Convert a-d to 0-3
          if (letterIndex >= 0 && letterIndex < question.options.length) {
            const optionText = question.options[letterIndex].toLowerCase().trim();
            return optionText === correctAnswer;
          }
        }
        
        return false;
      
      case 'numeric':
        // Handle numeric comparisons with tolerance for decimals
        const userNum = parseFloat(normalizedAnswer);
        const correctNum = parseFloat(correctAnswer);
        return Math.abs(userNum - correctNum) < 0.001;
      
      case 'fill_in_blank':
      case 'short_answer':
        // Allow for minor variations in text answers
        return normalizedAnswer === correctAnswer || 
               normalizedAnswer.includes(correctAnswer) || 
               correctAnswer.includes(normalizedAnswer);
      
      default:
        return normalizedAnswer === correctAnswer;
    }
  };

  // Generate explanation for wrong answers
  const generateExplanation = (question, isCorrect) => {
    if (isCorrect) {
      return "Great job! That's correct.";
    }
    
    switch (question.type) {
      case 'numeric':
        return `The correct answer is ${question.correctAnswer}. ${question.hint || 'Try reviewing the steps to solve this type of problem.'}`;
      case 'multiple_choice':
        return `The correct answer is ${question.correctAnswer}. ${question.hint || 'Consider the key concepts we just discussed.'}`;
      default:
        return `The correct answer is "${question.correctAnswer}". ${question.hint || 'Don\'t worry, this is a tricky one!'}`;
    }
  };

  // Encouragement messages
  const getCorrectEncouragement = () => {
    const messages = [
      "Excellent work! 🎉",
      "Perfect! You've got it! ⭐",
      "Outstanding! Keep it up! 🚀",
      "Brilliant! You're doing great! ✨",
      "Fantastic job! 🌟"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const getIncorrectEncouragement = () => {
    const messages = [
      "Don't worry, learning takes practice! 💪",
      "Close! Let's try another approach. 🤔",
      "That's okay, mistakes help us learn! 📚",
      "No problem! Let's work through this together. 🤝",
      "Good try! Practice makes perfect! ⭐"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  // Move to next question
  const handleNextQuestion = () => {
    if (currentQuestion < quizData.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setCurrentAnswer('');
      setShowFeedback(false);
      setQuestionStartTime(Date.now());
    } else {
      // Quiz completed
      setIsCompleted(true);
      saveQuizCompletion();
    }
  };

  // Go to previous question
  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
      setCurrentAnswer(answers[currentQuestion - 1]?.answer || '');
      setShowFeedback(!!feedback[currentQuestion - 1]);
    }
  };

  // Request hint from chat with full question context
  const handleHintRequest = () => {
    const questionData = quizData.questions[currentQuestion];
    const hintMessage = `I need help with question ${currentQuestion + 1}: ${questionData.question}`;
    
    // Pass both the message and the full question data for context
    onHintRequest(hintMessage, questionData);
  };

  // Save quiz progress
  const saveQuizProgress = (newAnswers, newFeedback, currentScore) => {
    if (typeof window !== 'undefined') {
      const progressData = {
        assignmentId: assignment?.id,
        currentQuestion,
        answers: newAnswers,
        feedback: newFeedback,
        score: currentScore,
        timeSpent,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(`quiz_progress_${assignment?.id}`, JSON.stringify(progressData));
    }
  };

  // Save completed quiz
  const saveQuizCompletion = async () => {
    try {
      console.log('💾 Saving quiz completion...', {
        quizId: quizData.id,
        assignmentId: assignment?.id,
        score,
        totalQuestions: quizData.questions.length,
        timeSpent
      });

      // Submit quiz results to backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tutor/quiz/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('child_token')}`
        },
        body: JSON.stringify({
          quizId: quizData.id,
          assignmentId: assignment?.id,
          answers,
          score,
          totalQuestions: quizData.questions.length,
          timeSpent
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Quiz submission failed:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Quiz results saved successfully:', data);
        // Show success message to user
        if (typeof window !== 'undefined') {
          // Could show a toast or notification here
        }
      } else {
        console.error('❌ Backend returned error:', data.error);
        throw new Error(data.error || 'Unknown error from backend');
      }
      
      // Clear progress from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`quiz_progress_${assignment?.id}`);
      }
    } catch (error) {
      console.error('💥 Error saving quiz completion:', error);
      // Don't block the user experience - they can still see their results
      // Just log the error for debugging
    }
  };

  // Restart quiz
  const handleRestartQuiz = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setFeedback({});
    setScore(0);
    setIsCompleted(false);
    setShowFeedback(false);
    setCurrentAnswer('');
    setTimeSpent(0);
    setQuestionStartTime(Date.now());
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`quiz_progress_${assignment?.id}`);
    }
  };

  // Handle back to chat - pass quiz results if quiz was completed
  const handleBackToChat = () => {
    if (isCompleted) {
      // Build detailed quiz results including questions and answers
      const correctAnswers = [];
      const incorrectAnswers = [];
      
      quizData.questions.forEach((question, index) => {
        const userAnswer = answers[index];
        if (userAnswer) {
          const questionData = {
            questionNumber: index + 1,
            question: question.question,
            userAnswer: userAnswer.answer,
            correctAnswer: question.correctAnswer,
            isCorrect: userAnswer.isCorrect
          };
          
          if (userAnswer.isCorrect) {
            correctAnswers.push(questionData);
          } else {
            incorrectAnswers.push(questionData);
          }
        }
      });
      
      // Pass comprehensive quiz results to parent
      const quizResults = {
        score: Object.values(answers).filter(a => a.isCorrect).length,
        totalQuestions: quizData.questions.length,
        timeSpent,
        assignmentTitle: assignment?.title || 'Quiz',
        correctAnswers,
        incorrectAnswers
      };
      onClose(quizResults);
    } else {
      // No results if quiz wasn't completed
      onClose();
    }
  };

  if (!isVisible || !quizData) return null;

  const currentQuestionData = quizData.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quizData.questions.length) * 100;
  const finalScore = Math.round((score / quizData.questions.length) * 100);

  return (
    <div className={`h-full w-1/2 bg-white shadow-2xl transform transition-all duration-300 flex flex-col ${isVisible ? 'translate-x-0' : 'translate-x-full'} border-l border-amber-200`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-[#7FB069] to-[#6BA05C] text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Practice Quiz 🧠</h2>
            <p className="text-green-100 text-sm">{assignment?.title || 'Quiz Mode'}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            title="Close Quiz"
          >
            <FiX size={24} />
          </button>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>Question {currentQuestion + 1} of {quizData.questions.length}</span>
            <span>Score: {score}/{quizData.questions.length} ⭐</span>
            <span>Time: {formatTime(timeSpent)} ⏱️</span>
          </div>
          <div className="w-full bg-green-400 bg-opacity-30 rounded-full h-3 shadow-inner">
            <div 
              className="bg-white rounded-full h-3 transition-all duration-500 ease-out shadow-sm"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Quiz Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {!isCompleted ? (
          <div>
            {/* Question Display */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-[#7FB069] bg-opacity-10 text-[#7FB069] px-4 py-2 rounded-xl font-semibold border border-[#7FB069] border-opacity-20">
                  Question {currentQuestion + 1}
                </span>
                <span className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-lg">
                  {currentQuestionData?.type?.replace('_', ' ') || 'Question'}
                </span>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 shadow-sm">
                <div className="prose prose-lg max-w-none text-gray-800">
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {currentQuestionData?.question}
                  </ReactMarkdown>
                </div>
              </div>
            </div>

            {/* Answer Input */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Your Answer:</h3>
              {currentQuestionData?.type === 'multiple_choice' ? (
                <div className="space-y-3">
                  {currentQuestionData.options?.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentAnswer(option)}
                      disabled={showFeedback}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                        currentAnswer === option
                          ? 'border-[#7FB069] bg-green-50 shadow-md'
                          : 'border-gray-200 hover:border-[#7FB069] hover:bg-green-50 hover:bg-opacity-30'
                      } ${showFeedback ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center">
                        <span className={`font-bold mr-3 w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                          currentAnswer === option
                            ? 'bg-[#7FB069] text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="flex-1">{option}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="relative">
                  <input
                    type={currentQuestionData?.type === 'numeric' ? 'number' : 'text'}
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    placeholder={currentQuestionData?.type === 'numeric' ? 'Enter a number...' : 'Type your answer...'}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-[#7FB069] focus:outline-none text-lg transition-colors duration-200 disabled:bg-gray-50 disabled:cursor-not-allowed"
                    onKeyPress={(e) => e.key === 'Enter' && !showFeedback && currentAnswer.trim() && handleSubmitAnswer()}
                    disabled={showFeedback}
                  />
                  {currentQuestionData?.type === 'numeric' && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      🔢
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Feedback */}
            {showFeedback && feedback[currentQuestion] && (
              <div className={`mb-6 p-5 rounded-xl border-2 shadow-sm ${
                feedback[currentQuestion].isCorrect 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-orange-200 bg-orange-50'
              } animate-fade-in`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    feedback[currentQuestion].isCorrect
                      ? 'bg-green-100 text-green-600'
                      : 'bg-orange-100 text-orange-600'
                  }`}>
                    {feedback[currentQuestion].isCorrect ? (
                      <FiCheck size={20} />
                    ) : (
                      <FiXCircle size={20} />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-bold text-lg ${
                      feedback[currentQuestion].isCorrect ? 'text-green-700' : 'text-orange-700'
                    }`}>
                      {feedback[currentQuestion].encouragement}
                    </h4>
                    <p className={`mt-2 ${
                      feedback[currentQuestion].isCorrect ? 'text-green-700' : 'text-orange-700'
                    }`}>
                      {feedback[currentQuestion].explanation}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-4">
              <div className="flex gap-2">
                <button
                  onClick={handleHintRequest}
                  className="flex items-center gap-2 px-4 py-2 text-[#7FB069] hover:bg-green-50 rounded-lg transition-colors border border-[#7FB069] border-opacity-30 font-medium"
                  title="Ask Klio for help with this question"
                >
                  <FiHelpCircle size={18} />
                  Ask Klio for Help
                </button>
              </div>

              <div className="flex gap-3">
                {currentQuestion > 0 && (
                  <button
                    onClick={handlePreviousQuestion}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                  >
                    <FiArrowLeft size={16} />
                    Previous
                  </button>
                )}
                
                {!showFeedback ? (
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={!currentAnswer.trim()}
                    className="flex items-center gap-2 px-6 py-3 bg-[#7FB069] text-white rounded-lg hover:bg-[#6BA05C] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none"
                  >
                    Submit Answer ✓
                  </button>
                ) : (
                  <button
                    onClick={handleNextQuestion}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#7FB069] to-[#6BA05C] text-white rounded-lg hover:from-[#6BA05C] hover:to-[#5A8F4F] transition-all duration-200 font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    {currentQuestion < quizData.questions.length - 1 ? (
                      <>Next Question <FiArrowRight size={16} /></>
                    ) : (
                      <>Complete Quiz 🎉</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Quiz Completion */
          <div className="text-center py-8">
            <div className="mb-8">
              <div className="relative mb-6">
                <div className="w-32 h-32 mx-auto mb-4 bg-gradient-to-br from-[#7FB069] to-[#6BA05C] rounded-full flex items-center justify-center shadow-2xl animate-bounce-gentle">
                  <FiCheck size={64} className="text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-xl animate-bounce">
                  🎉
                </div>
              </div>
              <h3 className="text-3xl font-bold mb-3 text-gray-800">Quiz Complete!</h3>
              <p className="text-gray-600 text-lg mb-4">Amazing work on finishing the practice quiz!</p>
            </div>

            {/* Final Score */}
            <div className="bg-gradient-to-br from-green-50 to-amber-50 border border-green-200 p-6 rounded-xl mb-8 shadow-sm">
              <div className="grid grid-cols-3 gap-6 text-center">
                <div className="bg-white bg-opacity-60 rounded-lg p-4">
                  <div className="text-3xl font-bold text-[#7FB069] mb-1">{score}/{quizData.questions.length}</div>
                  <div className="text-sm text-gray-600 font-medium">Correct Answers</div>
                </div>
                <div className="bg-white bg-opacity-60 rounded-lg p-4">
                  <div className="text-3xl font-bold text-amber-600 mb-1">{finalScore}%</div>
                  <div className="text-sm text-gray-600 font-medium">Final Score</div>
                </div>
                <div className="bg-white bg-opacity-60 rounded-lg p-4">
                  <div className="text-3xl font-bold text-blue-600 mb-1">{formatTime(timeSpent)}</div>
                  <div className="text-sm text-gray-600 font-medium">Time Spent</div>
                </div>
              </div>
            </div>

            {/* Performance Message */}
            <div className={`mb-8 p-4 rounded-xl border-2 ${
              finalScore >= 90 
                ? 'bg-green-50 border-green-200' 
                : finalScore >= 70 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-orange-50 border-orange-200'
            }`}>
              {finalScore >= 90 ? (
                <div className="text-green-700">
                  <div className="text-2xl mb-2">🌟 Outstanding!</div>
                  <p className="font-semibold">You've mastered this topic! Excellent work!</p>
                </div>
              ) : finalScore >= 70 ? (
                <div className="text-blue-700">
                  <div className="text-2xl mb-2">👍 Great Job!</div>
                  <p className="font-semibold">You're really getting the hang of this!</p>
                </div>
              ) : (
                <div className="text-orange-700">
                  <div className="text-2xl mb-2">💪 Keep Going!</div>
                  <p className="font-semibold">Practice makes perfect! You're making great progress!</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleRestartQuiz}
                className="flex items-center gap-2 px-6 py-3 bg-[#7FB069] text-white rounded-lg hover:bg-[#6BA05C] transition-all duration-200 font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <FiRefreshCw size={18} />
                Try Again
              </button>
              <button
                onClick={() => handleBackToChat()}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Back to Chat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizPanel;