// Enhanced WorkspacePanel with Session Management and Progress Tracking
import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiMaximize2, FiMinimize2, FiCopy, FiCheck, FiBookOpen, 
  FiGrid, FiPenTool, FiTrash2, FiEdit3, FiPlus, FiMinus, 
  FiX, FiDivide, FiSend, FiHelpCircle, FiRotateCcw, 
  FiCheckCircle, FiTarget, FiTrendingUp, FiAward 
} from 'react-icons/fi';
import { progressService } from '../utils/progressService';
import { lifetimeProgressService } from '../utils/lifetimeProgressService';

const WorkspacePanel = forwardRef(({ workspaceContent, onToggleSize, isExpanded, onClose, onSendToChat }, ref) => {
  const [sessionState, setSessionState] = useState({
    sessionId: null,
    problems: [],
    completedProblems: new Set(),
    currentProblemIndex: 0,
    sessionStartTime: null,
    totalCorrect: 0,
    totalAttempts: 0,
    streak: 0,
    bestStreak: 0
  });
  
  const [workNotes, setWorkNotes] = useState({});
  const [problemStates, setProblemStates] = useState({});
  const [lifetimeStats, setLifetimeStats] = useState({
    lifetime_correct: 0,
    current_streak: 0,
    best_streak: 0,
    weekly_correct: 0
  });

  // Function to fetch and update lifetime progress
  const fetchLifetimeStats = async () => {
    try {
      const stats = await lifetimeProgressService.getLifetimeStats();
      console.log('📊 Fetched lifetime stats:', stats);
      if (stats?.stats) {
        console.log('📊 Setting lifetime stats:', stats.stats);
        setLifetimeStats(stats.stats);
      }
    } catch (error) {
      console.error('Failed to fetch lifetime stats:', error);
    }
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    markProblemCorrect: (problemId) => markProblemCorrect(problemId),
    markProblemIncorrect: (problemId) => markProblemIncorrect(problemId),
    getProblemStates: () => problemStates,
    getSessionState: () => sessionState
  }));

  // NEW: Detect function-controlled workspace
  const isFunctionControlled = workspaceContent?.type === 'function_calling_workspace';
  
  // Initialize session when workspace content changes
  useEffect(() => {
    if (workspaceContent && workspaceContent.problems?.length > 0) {
      if (isFunctionControlled) {
        console.log('🎯 Initializing function-controlled workspace session...');
        
        // Use existing session data from function calls
        setSessionState({
          sessionId: workspaceContent.sessionId,
          problems: workspaceContent.problems,
          completedProblems: new Set(
            workspaceContent.problems
              .filter(p => p.status === 'correct')
              .map(p => p.id)
          ),
          currentProblemIndex: workspaceContent.problems.findIndex(p => p.status === 'pending') || 0,
          sessionStartTime: new Date(workspaceContent.createdAt).getTime(),
          totalCorrect: workspaceContent.stats.correct,
          totalAttempts: workspaceContent.stats.completed,
          streak: workspaceContent.stats.streak,
          bestStreak: workspaceContent.stats.bestStreak
        });
        
        // Set problem states from function call data
        const initialStates = {};
        workspaceContent.problems.forEach(problem => {
          initialStates[problem.id] = problem.status;
        });
        setProblemStates(initialStates);
        
        // Fetch lifetime stats
        fetchLifetimeStats();
        
      } else {
        // Legacy workspace initialization
        const startNewSession = async () => {
          try {
            console.log('🎯 Starting new practice session...');
            
            const response = await progressService.startSession('practice', workspaceContent.problems.length);
            const newSessionId = response.session.id;
            
            const problems = workspaceContent.problems.map((problem, index) => ({
              ...problem,
              id: problem.id || `problem-${index}`,
              sessionIndex: index
            }));

            console.log('✅ Practice session started:', newSessionId);
            
            setSessionState({
              sessionId: newSessionId,
              problems: problems,
              completedProblems: new Set(),
              currentProblemIndex: 0,
              sessionStartTime: Date.now(),
              totalCorrect: 0,
              totalAttempts: 0,
              streak: 0,
              bestStreak: 0
            });
            
            // Fetch lifetime stats for fallback case too
            fetchLifetimeStats();
            
            // Reset problem states
            const initialStates = {};
            problems.forEach(problem => {
              initialStates[problem.id] = 'pending';
            });
            setProblemStates(initialStates);
            setWorkNotes({});
            
            // Fetch lifetime stats for legacy workspaces too
            fetchLifetimeStats();
            
          } catch (error) {
            console.error('Failed to start practice session:', error);
            // Fallback to local-only tracking
            const fallbackSessionId = `local-session-${Date.now()}`;
            const problems = workspaceContent.problems.map((problem, index) => ({
              ...problem,
              id: problem.id || `problem-${index}`,
              sessionIndex: index
            }));

            setSessionState({
              sessionId: fallbackSessionId,
              problems: problems,
              completedProblems: new Set(),
              currentProblemIndex: 0,
              sessionStartTime: Date.now(),
              totalCorrect: 0,
              totalAttempts: 0,
              streak: 0,
              bestStreak: 0
            });
            
            const initialStates = {};
            problems.forEach(problem => {
              initialStates[problem.id] = 'pending';
            });
            setProblemStates(initialStates);
            setWorkNotes({});
          }
        };
        startNewSession();
      }
    }
  }, [workspaceContent, isFunctionControlled]);

  // Check if all problems are completed
  const isSessionComplete = sessionState.completedProblems.size === sessionState.problems.length && sessionState.problems.length > 0;
  
  // Calculate progress percentage
  const progressPercentage = sessionState.problems.length > 0 
    ? (sessionState.completedProblems.size / sessionState.problems.length) * 100 
    : 0;

  // Enhanced send work to chat for function calling
  const sendWorkToChat = (problemIndex, problemText, workNote) => {
    if (!workNote.trim()) return;
    
    const problem = sessionState.problems[problemIndex];
    
    // Enhanced message for function calling system
    const message = isFunctionControlled 
      ? `Can you check my work on Problem ${problemIndex + 1}?\n\nProblem: ${problemText}\nMy work: ${workNote}\n\n[Problem Index: ${problemIndex}]`
      : `Can you check my work on Problem ${problemIndex + 1} from this session?\n\nProblem: ${problemText}\nMy work: ${workNote}`;
    
    // Update state to show we're checking
    setProblemStates(prev => ({
      ...prev,
      [problem.id]: 'checking'
    }));
    
    if (onSendToChat) {
      onSendToChat(message, {
        type: 'check_work',
        sessionId: sessionState.sessionId,
        problemId: problem.id,
        problemIndex: problemIndex,
        studentWork: workNote,
        problemText: problemText,
        isFunctionControlled: isFunctionControlled
      });
    }
  };

  // Mark problem as correct (called when AI confirms correct answer)
  const markProblemCorrect = async (problemId) => {
    const problem = sessionState.problems.find(p => p.id === problemId);
    if (!problem) return;

    try {
      // For function-controlled workspaces, don't record attempts as backend already handles progress
      if (!isFunctionControlled) {
        // Record the correct attempt
        console.log('✅ Recording correct attempt for problem:', problemId);
        
        const attemptResponse = await progressService.recordAttempt(
          sessionState.sessionId,
          problem.text,
          true, // is_correct
          workNotes[problemId] || '',
          problem.type || 'general'
        );

        if (attemptResponse.success) {
          const stats = attemptResponse.session_stats;
          
          setSessionState(prev => {
            const newCompleted = new Set(prev.completedProblems);
            newCompleted.add(problemId);
            
            return {
              ...prev,
              completedProblems: newCompleted,
              totalCorrect: stats.totalCorrect,
              totalAttempts: stats.totalAttempts,
              streak: stats.currentStreak,
              bestStreak: stats.bestStreak,
              currentProblemIndex: Math.min(prev.currentProblemIndex + 1, prev.problems.length - 1)
            };
          });
          
          console.log('📊 Updated session stats:', stats);
        }
      } else {
        // For function-controlled workspaces, just update local state without recording
        setSessionState(prev => {
          const newCompleted = new Set(prev.completedProblems);
          newCompleted.add(problemId);
          
          return {
            ...prev,
            completedProblems: newCompleted,
            totalCorrect: prev.totalCorrect + 1,
            currentProblemIndex: Math.min(prev.currentProblemIndex + 1, prev.problems.length - 1)
          };
        });
      }
      
      // Always refresh lifetime stats after marking correct
      fetchLifetimeStats();
    } catch (error) {
      console.error('Failed to record correct attempt:', error);
      // Fallback to local tracking
      setSessionState(prev => {
        const newCompleted = new Set(prev.completedProblems);
        newCompleted.add(problemId);
        
        const newStreak = prev.streak + 1;
        const newBestStreak = Math.max(newStreak, prev.bestStreak);
        
        return {
          ...prev,
          completedProblems: newCompleted,
          totalCorrect: prev.totalCorrect + 1,
          totalAttempts: prev.totalAttempts + 1,
          streak: newStreak,
          bestStreak: newBestStreak,
          currentProblemIndex: Math.min(prev.currentProblemIndex + 1, prev.problems.length - 1)
        };
      });
    }

    setProblemStates(prev => ({
      ...prev,
      [problemId]: 'correct'
    }));

    // Celebration effect
    setTimeout(() => {
      const problemElement = document.getElementById(`problem-${problemId}`);
      if (problemElement) {
        problemElement.classList.add('celebrate');
        setTimeout(() => problemElement.classList.remove('celebrate'), 1000);
      }
    }, 100);
  };

  // Reset problem state to allow retry
  const resetProblemState = (problemId) => {
    console.log('🔄 Resetting problem state for:', problemId);
    
    // Reset the problem state to pending
    setProblemStates(prev => ({
      ...prev,
      [problemId]: 'pending'
    }));
    
    // Clear the work notes for this problem
    setWorkNotes(prev => ({
      ...prev,
      [problemId]: ''
    }));
    
    // Remove from completed problems if it's there
    setSessionState(prev => {
      const newCompleted = new Set(prev.completedProblems);
      newCompleted.delete(problemId);
      return {
        ...prev,
        completedProblems: newCompleted
      };
    });
    
    console.log('✅ Problem reset - ready for retry');
  };

  // Mark problem as incorrect
  const markProblemIncorrect = async (problemId) => {
    const problem = sessionState.problems.find(p => p.id === problemId);
    if (!problem) return;

    try {
      // For function-controlled workspaces, don't record attempts as backend already handles progress
      if (!isFunctionControlled) {
        // Record the incorrect attempt
        console.log('❌ Recording incorrect attempt for problem:', problemId);
        
        const attemptResponse = await progressService.recordAttempt(
          sessionState.sessionId,
          problem.text,
          false, // is_correct
          workNotes[problemId] || '',
          problem.type || 'general'
        );

        if (attemptResponse.success) {
          const stats = attemptResponse.session_stats;
          
          setSessionState(prev => ({
            ...prev,
            totalCorrect: stats.totalCorrect,
            totalAttempts: stats.totalAttempts,
            streak: stats.currentStreak, // This will be 0 due to incorrect answer
            bestStreak: stats.bestStreak
          }));
          
          console.log('📊 Updated session stats after incorrect:', stats);
        }
      } else {
        // For function-controlled workspaces, just update local state
        setSessionState(prev => ({
          ...prev,
          totalAttempts: prev.totalAttempts + 1
        }));
      }
      
      // Always refresh lifetime stats after marking incorrect
      fetchLifetimeStats();
    } catch (error) {
      console.error('Failed to record incorrect attempt:', error);
      // Fallback to local tracking
      setSessionState(prev => ({
        ...prev,
        totalAttempts: prev.totalAttempts + 1,
        streak: 0 // Reset streak on incorrect answer
      }));
    }

    setProblemStates(prev => ({
      ...prev,
      [problemId]: 'incorrect'
    }));
  };

  // Mark problem as helped (when student asks for help)
  const markProblemHelped = (problemId) => {
    setProblemStates(prev => ({
      ...prev,
      [problemId]: 'helped'
    }));
  };

  // Ask for help with specific problem
  const askForHelp = (problemIndex, problemText) => {
    const problem = sessionState.problems[problemIndex];
    const message = `I need help with Problem ${problemIndex + 1}: ${problemText}`;
    
    markProblemHelped(problem.id);
    
    if (onSendToChat) {
      onSendToChat(message, {
        type: 'request_help',
        sessionId: sessionState.sessionId,
        problemId: problem.id,
        problemIndex: problemIndex,
        problemText: problemText
      });
    }
  };

  // Skip to next problem
  const skipToNextProblem = () => {
    if (sessionState.currentProblemIndex < sessionState.problems.length - 1) {
      setSessionState(prev => ({
        ...prev,
        currentProblemIndex: prev.currentProblemIndex + 1
      }));
    }
  };

  // Request more similar problems
  const requestMoreProblems = () => {
    const completedTypes = sessionState.problems
      .filter(p => sessionState.completedProblems.has(p.id))
      .map(p => p.type);
    
    const message = `Great job! Can you give me more ${completedTypes.join(' and ')} problems to practice?`;
    
    if (onSendToChat) {
      onSendToChat(message, {
        type: 'request_more_problems',
        sessionId: sessionState.sessionId,
        completedTypes: completedTypes,
        sessionStats: {
          totalCorrect: sessionState.totalCorrect,
          totalAttempts: sessionState.totalAttempts,
          bestStreak: sessionState.bestStreak
        }
      });
    }
  };

  // Progress Bar Component
  const ProgressBar = () => (
    <div className="mb-6 p-4 bg-white rounded-xl border-2 border-blue-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <FiTarget className="mr-2 text-blue-500" />
          Session Progress
        </h3>
        <span className="text-sm font-medium text-gray-600">
          {sessionState.completedProblems.size} of {sessionState.problems.length} completed
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-3 mb-3 overflow-hidden">
        <motion.div
          className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      
      <div className="grid grid-cols-4 gap-3 text-center">
        <div className="p-2 bg-green-50 rounded-lg">
          <div className="text-lg font-bold text-green-600">{sessionState.totalCorrect}</div>
          <div className="text-xs text-green-600">Session Correct</div>
        </div>
        <div className="p-2 bg-orange-50 rounded-lg">
          <div className="text-lg font-bold text-orange-600">{lifetimeStats.current_streak}</div>
          <div className="text-xs text-orange-600">Current Streak</div>
        </div>
        <div className="p-2 bg-blue-50 rounded-lg">
          <div className="text-lg font-bold text-blue-600">{lifetimeStats.weekly_correct}</div>
          <div className="text-xs text-blue-600">This Week</div>
        </div>
        <div className="p-2 bg-purple-50 rounded-lg">
          <div className="text-lg font-bold text-purple-600">{lifetimeStats.best_streak}</div>
          <div className="text-xs text-purple-600">Best Streak</div>
        </div>
      </div>
      
      {isSessionComplete && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-gradient-to-r from-green-400 to-blue-500 rounded-lg text-white text-center"
        >
          <FiAward className="inline-block mr-2" size={20} />
          <span className="font-semibold">Session Complete! Great work! 🎉</span>
        </motion.div>
      )}
    </div>
  );

  // Problem status indicator
  const getStatusIndicator = (problemId) => {
    const state = problemStates[problemId];
    
    switch (state) {
      case 'correct':
        return <FiCheckCircle className="text-green-500" size={20} />;
      case 'incorrect':
        return <FiX className="text-red-500" size={20} />;
      case 'checking':
        return <div className="loading-dots text-blue-500"><span></span><span></span><span></span></div>;
      case 'helped':
        return <FiHelpCircle className="text-orange-500" size={20} />;
      default:
        return <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>;
    }
  };

  // Enhanced problem rendering with session context
  const renderMathProblem = (problem, index) => {
    const isCompleted = sessionState.completedProblems.has(problem.id);
    const isCurrent = index === sessionState.currentProblemIndex;
    const status = problemStates[problem.id];
    
    return (
      <motion.div
        key={problem.id}
        id={`problem-${problem.id}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className={`bg-white border-2 rounded-xl p-6 mb-4 shadow-lg transition-all duration-300 ${
          isCurrent ? 'ring-2 ring-blue-400 border-blue-400' : 
          isCompleted ? 'border-green-400 bg-green-50' : 'border-gray-200'
        }`}
      >
        {/* Problem Header with Function Call Status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {getStatusIndicator(problem.id)}
              <span className={`text-lg font-bold ${isCompleted ? 'text-green-600' : 'text-gray-800'}`}>
                Problem {index + 1}
              </span>
              {isFunctionControlled && (
                <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                  AI Managed
                </span>
              )}
            </div>
            {isCurrent && !isCompleted && (
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                Current
              </span>
            )}
            {isCompleted && (
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                ✓ Complete
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            {!isCompleted && (
              <button
                onClick={() => askForHelp(index, problem.text)}
                className="text-gray-400 hover:text-orange-500 transition-colors p-1"
                title="Ask Klio for help"
              >
                <FiHelpCircle size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Problem Statement */}
        <div className="mb-6">
          <div className={`p-6 rounded-xl border-2 text-center ${
            isCompleted ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="text-4xl font-bold text-gray-800">
              {problem.text}
            </div>
          </div>
        </div>

        {/* Work Area - show if not correctly completed (allow retry for incorrect) */}
        {status !== 'correct' && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-600 flex items-center">
                <FiEdit3 size={14} className="mr-2" />
                Your Work:
              </h4>
              <div className="flex items-center space-x-2">
                {workNotes[problem.id]?.trim() && status !== 'checking' && (
                  <button
                    onClick={() => sendWorkToChat(index, problem.text, workNotes[problem.id])}
                    className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full hover:bg-green-200 transition-colors flex items-center space-x-1 border border-green-300"
                    title="Send your work to Klio for checking"
                  >
                    <FiSend size={12} />
                    <span>Check My Work</span>
                  </button>
                )}
              </div>
            </div>

            <textarea
              value={workNotes[problem.id] || ''}
              onChange={(e) => {
                setWorkNotes(prev => ({ ...prev, [problem.id]: e.target.value }));
                // Update student work in function calling system
                if (isFunctionControlled) {
                  // This could trigger a backend update if needed
                }
              }}
              placeholder="Show your work here..."
              disabled={status === 'checking'}
              className={`w-full h-32 p-4 border-2 rounded-lg bg-white font-mono text-gray-800 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                status === 'checking' ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            />
          </div>
        )}

        {/* Enhanced Feedback Area with Function Call Results */}
        {status === 'correct' && problem.feedback && (
          <div className="p-4 bg-green-100 border border-green-300 rounded-lg text-green-800">
            <FiCheckCircle className="inline-block mr-2" />
            <strong>{problem.feedback}</strong>
          </div>
        )}
        
        {status === 'correct' && !problem.feedback && (
          <div className="p-4 bg-green-100 border border-green-300 rounded-lg text-green-800">
            <FiCheckCircle className="inline-block mr-2" />
            <strong>Correct! Great job! 🎉</strong>
          </div>
        )}
        
        {status === 'incorrect' && problem.feedback && (
          <div className="p-4 bg-red-100 border border-red-300 rounded-lg text-red-800">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <FiX className="inline-block mr-2" />
                <strong>{problem.feedback}</strong>
              </div>
              <button
                onClick={() => resetProblemState(problem.id)}
                className="ml-3 text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-200 transition-colors flex items-center space-x-1 border border-blue-300"
                title="Clear and try again"
              >
                <FiRotateCcw size={12} />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        )}
        
        {status === 'incorrect' && !problem.feedback && (
          <div className="p-4 bg-red-100 border border-red-300 rounded-lg text-red-800">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <FiX className="inline-block mr-2" />
                <strong>Not quite right. Try again or ask for help! 💪</strong>
              </div>
              <button
                onClick={() => resetProblemState(problem.id)}
                className="ml-3 text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-200 transition-colors flex items-center space-x-1 border border-blue-300"
                title="Clear and try again"
              >
                <FiRotateCcw size={12} />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        )}

        {/* Hint */}
        {problem.hint && status !== 'correct' && (
          <div className="text-sm p-4 bg-blue-50 border-l-4 border-blue-400 rounded-lg mt-4">
            <strong className="text-blue-600">💡 Hint:</strong> {problem.hint}
          </div>
        )}
      </motion.div>
    );
  };

  // Session Complete Actions
  const SessionCompleteActions = () => (
    <div className="mb-6 p-6 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl border-2 border-green-200">
      <div className="text-center mb-4">
        <FiAward className="text-4xl text-yellow-500 mx-auto mb-2" />
        <h3 className="text-xl font-bold text-gray-800">Fantastic Work!</h3>
        <p className="text-gray-600">You completed all {sessionState.problems.length} problems!</p>
      </div>
      
      <div className="flex flex-col gap-3">
        <button
          onClick={requestMoreProblems}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
        >
          <FiPlus className="mr-2" />
          Practice More Similar Problems
        </button>
        
        <button
          onClick={() => onSendToChat("What other topics can we practice?")}
          className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
        >
          <FiTrendingUp className="mr-2" />
          Try Different Topics
        </button>
      </div>
    </div>
  );

  if (!workspaceContent) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <h3 className="font-semibold text-gray-800 flex items-center">
            <FiPenTool className="mr-2 text-blue-500" size={18} />
            Practice Workspace
          </h3>
          <button
            onClick={onToggleSize}
            className="text-gray-500 hover:text-blue-500 transition-colors p-2 rounded-lg hover:bg-blue-50"
          >
            {isExpanded ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />}
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div className="text-gray-400">
            <FiTarget size={64} className="mx-auto mb-6 opacity-30" />
            <h4 className="text-lg font-medium mb-2 text-gray-600">Ready to Practice!</h4>
            <p className="text-sm">Math problems and progress tracking will appear here</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <h3 className="font-semibold text-gray-800 flex items-center">
          <FiPenTool className="mr-2 text-blue-500" size={18} />
          Practice Session
        </h3>
        <div className="flex items-center space-x-2">
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
              title="Close workspace"
            >
              <FiTrash2 size={14} />
            </button>
          )}
          <button
            onClick={onToggleSize}
            className="text-gray-500 hover:text-blue-500 transition-colors p-2 rounded-lg hover:bg-blue-50"
          >
            {isExpanded ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />}
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {sessionState.problems.length > 0 && <ProgressBar />}
        
        {isSessionComplete && <SessionCompleteActions />}
        
        <AnimatePresence>
          {sessionState.problems.map((problem, i) => renderMathProblem(problem, i))}
        </AnimatePresence>
      </div>
    </div>
  );
});

WorkspacePanel.displayName = 'WorkspacePanel';

export default WorkspacePanel;