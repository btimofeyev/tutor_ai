// Simple Workspace - Like a teacher's whiteboard
import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import { 
  FiX, FiSend, FiEdit3, FiCheckCircle, FiRotateCcw 
} from 'react-icons/fi';

const SimpleWorkspace = forwardRef(({ workspaceContent, isExpanded, onClose, onSendToChat }, ref) => {
  const [problems, setProblems] = useState([]);
  const [workNotes, setWorkNotes] = useState({});
  const [problemStates, setProblemStates] = useState({}); // 'pending', 'correct', 'incorrect'

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    markProblemCorrect: (problemId) => markProblemCorrect(problemId),
    markProblemIncorrect: (problemId) => markProblemIncorrect(problemId)
  }));

  // Initialize workspace when content changes  
  useEffect(() => {
    if (workspaceContent && workspaceContent.problems?.length > 0) {
      console.log('📝 Loading', workspaceContent.problems.length, 'problems to workspace');
      
      setProblems(workspaceContent.problems);
      
      // Set initial states
      const initialStates = {};
      workspaceContent.problems.forEach(problem => {
        initialStates[problem.id] = problem.status || 'pending';
      });
      setProblemStates(initialStates);
      
      // Clear work notes
      setWorkNotes({});
    }
  }, [workspaceContent]);

  // Send work to chat for checking
  const sendWorkToChat = (problemIndex, problemText, workNote) => {
    if (!workNote.trim()) return;
    
    const problem = problems[problemIndex];
    const message = `Can you check my work on Problem ${problemIndex + 1}?\n\nProblem: ${problemText}\nMy work: ${workNote}\n\n[Problem Index: ${problemIndex}]`;
    
    // Set problem to checking state
    setProblemStates(prev => ({
      ...prev,
      [problem.id]: 'checking'
    }));
    
    if (onSendToChat) {
      onSendToChat(message);
    }
  };

  // Mark problem as correct
  const markProblemCorrect = (problemId) => {
    setProblemStates(prev => ({
      ...prev,
      [problemId]: 'correct'
    }));
  };

  // Mark problem as incorrect  
  const markProblemIncorrect = (problemId) => {
    setProblemStates(prev => ({
      ...prev,
      [problemId]: 'incorrect'
    }));
  };

  // Reset problem to try again
  const resetProblemState = (problemId) => {
    setProblemStates(prev => ({
      ...prev,
      [problemId]: 'pending'
    }));
    setWorkNotes(prev => ({
      ...prev,
      [problemId]: ''
    }));
  };

  // Get status indicator
  const getStatusIndicator = (problemId) => {
    const state = problemStates[problemId];
    
    switch (state) {
      case 'correct':
        return <FiCheckCircle className="text-green-500" size={20} />;
      case 'incorrect':
        return <FiX className="text-red-500" size={20} />;
      case 'checking':
        return <div className="loading-dots text-blue-500"><span></span><span></span><span></span></div>;
      default:
        return <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>;
    }
  };

  if (!workspaceContent || !problems.length) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-blue-50 border-b">
        <h2 className="text-lg font-semibold text-gray-800">
          📝 {workspaceContent.title || 'Practice Problems'}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <FiX size={20} />
        </button>
      </div>

      {/* Problems */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {problems.map((problem, index) => {
          const status = problemStates[problem.id];
          
          return (
            <motion.div
              key={problem.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-white border-2 rounded-xl p-4 mb-4 transition-all duration-300 ${
                status === 'correct' ? 'border-green-400 bg-green-50' : 
                status === 'incorrect' ? 'border-red-400 bg-red-50' : 
                'border-gray-200'
              }`}
            >
              {/* Problem Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  {getStatusIndicator(problem.id)}
                  <span className="text-lg font-bold text-gray-800">
                    Problem {index + 1}
                  </span>
                </div>
              </div>

              {/* Problem Text */}
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-xl font-bold text-gray-800">
                  {problem.text}
                </div>
              </div>

              {/* Work Area - show if not correctly completed */}
              {status !== 'correct' && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-600 flex items-center">
                      <FiEdit3 size={14} className="mr-2" />
                      Your Work:
                    </h4>
                    {workNotes[problem.id]?.trim() && status !== 'checking' && (
                      <button
                        onClick={() => sendWorkToChat(index, problem.text, workNotes[problem.id])}
                        className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full hover:bg-green-200 transition-colors flex items-center space-x-1 border border-green-300"
                      >
                        <FiSend size={12} />
                        <span>Check My Work</span>
                      </button>
                    )}
                  </div>

                  <textarea
                    value={workNotes[problem.id] || ''}
                    onChange={(e) => {
                      setWorkNotes(prev => ({ ...prev, [problem.id]: e.target.value }));
                    }}
                    placeholder="Show your work here..."
                    disabled={status === 'checking'}
                    className={`w-full h-24 p-3 border-2 rounded-lg bg-white font-mono text-gray-800 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      status === 'checking' ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
              )}

              {/* Feedback Areas */}
              {status === 'correct' && (
                <div className="p-3 bg-green-100 border border-green-300 rounded-lg text-green-800">
                  <FiCheckCircle className="inline-block mr-2" />
                  <strong>Correct! Great job! 🎉</strong>
                </div>
              )}
              
              {status === 'incorrect' && (
                <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-red-800">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <FiX className="inline-block mr-2" />
                      <strong>Not quite right. Think it through again! 💪</strong>
                    </div>
                    <button
                      onClick={() => resetProblemState(problem.id)}
                      className="ml-3 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full hover:bg-blue-200 transition-colors flex items-center space-x-1 border border-blue-300"
                    >
                      <FiRotateCcw size={12} />
                      <span>Try Again</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Hint */}
              {problem.hint && status !== 'correct' && (
                <div className="text-sm p-3 bg-blue-50 border-l-4 border-blue-400 rounded-lg mt-3">
                  <strong className="text-blue-600">💡 Hint:</strong> {problem.hint}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
      
      {/* Simple CSS for loading dots */}
      <style jsx>{`
        .loading-dots {
          display: inline-flex;
          align-items: center;
        }
        .loading-dots span {
          display: inline-block;
          width: 4px;
          height: 4px;
          margin: 0 1px;
          background-color: currentColor;
          border-radius: 50%;
          animation: loading-dots 1.4s infinite ease-in-out both;
        }
        .loading-dots span:nth-child(1) { animation-delay: -0.32s; }
        .loading-dots span:nth-child(2) { animation-delay: -0.16s; }
        .loading-dots span:nth-child(3) { animation-delay: 0s; }
        
        @keyframes loading-dots {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </motion.div>
  );
});

export default SimpleWorkspace;