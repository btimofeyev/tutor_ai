// Simple Workspace - Like a teacher's whiteboard
import React, { useState, useEffect, forwardRef, useImperativeHandle, memo, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiX, FiSend, FiEdit3, FiCheckCircle, FiRotateCcw, FiAward, FiStar, FiZap
} from 'react-icons/fi';

// Helper function to get emoji for different subjects
const getSubjectEmoji = (subject) => {
  const emojiMap = {
    'math': '🧮',
    'science': '🔬',
    'history': '📜',
    'language arts': '📚',
    'social studies': '🗺️'
  };
  return emojiMap[subject] || '📝';
};

// Achievement Notification Component
const AchievementNotification = ({ achievement, show, onClose }) => (
  <AnimatePresence>
    {show && achievement && (
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: -50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: -50 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="fixed top-4 right-4 z-50 bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-4 rounded-lg shadow-xl border-2 border-yellow-300"
      >
        <div className="flex items-center space-x-3">
          <div className="text-3xl">{achievement.icon}</div>
          <div className="flex-1">
            <h3 className="font-bold text-lg">{achievement.name}</h3>
            <p className="text-sm opacity-90">{achievement.description}</p>
            <p className="text-xs font-semibold">+{achievement.points} points!</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-yellow-200 transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

// Creative Writing Tools Component
const CreativeWritingToolkit = ({ toolkit, onSendToChat }) => {
  const [responses, setResponses] = useState({});

  const handleResponseChange = (questionId, value) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const sendResponse = (questionId, question, response) => {
    if (!response.trim()) return;

    const message = `Here's my response to "${question}":\n\n${response}`;
    onSendToChat(message);
  };

  return (
    <div className="space-y-6">
      {/* Brainstorming Section */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200 p-4">
        <h3 className="font-bold text-purple-800 mb-4 flex items-center text-lg">
          <FiStar className="mr-2" />
          {toolkit.brainstorming_section.title}
        </h3>

        <div className="space-y-4">
          {toolkit.brainstorming_section.questions.map((q, index) => (
            <div key={q.id} className="bg-white rounded-lg p-4 border border-purple-200">
              <div className="mb-2">
                <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full mb-2">
                  {q.category}
                </span>
                <h4 className="font-medium text-gray-800">{q.question}</h4>
                {q.hint && (
                  <p className="text-sm text-gray-600 mt-1 italic">💡 {q.hint}</p>
                )}
              </div>

              <div className="flex gap-2">
                <textarea
                  value={responses[q.id] || ''}
                  onChange={(e) => handleResponseChange(q.id, e.target.value)}
                  placeholder="Type your ideas here..."
                  className="flex-1 p-3 border border-gray-300 rounded-lg resize-none h-20 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                <button
                  onClick={() => sendResponse(q.id, q.question, responses[q.id])}
                  disabled={!responses[q.id]?.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <FiSend size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Planning Sections */}
      {toolkit.planning_sections.map((section, sectionIndex) => (
        <div key={section.id} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 p-4">
          <h3 className="font-bold text-blue-800 mb-4 flex items-center text-lg">
            <FiEdit3 className="mr-2" />
            {section.section_name}
          </h3>

          <div className="space-y-3">
            {section.prompts.map((prompt, promptIndex) => (
              <div key={prompt.id} className="bg-white rounded-lg p-3 border border-blue-200">
                <p className="font-medium text-gray-800 mb-2">{prompt.prompt}</p>
                <div className="flex gap-2">
                  <textarea
                    value={responses[prompt.id] || ''}
                    onChange={(e) => handleResponseChange(prompt.id, e.target.value)}
                    placeholder="Write your response..."
                    className="flex-1 p-2 border border-gray-300 rounded resize-none h-16 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={() => sendResponse(prompt.id, prompt.prompt, responses[prompt.id])}
                    disabled={!responses[prompt.id]?.trim()}
                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiSend size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Progress Indicator */}
      <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-lg border-2 border-green-200 p-4">
        <h3 className="font-bold text-green-800 mb-2 flex items-center">
          <FiCheckCircle className="mr-2" />
          Your Progress
        </h3>
        <div className="bg-white rounded-full h-4 overflow-hidden">
          <div
            className="bg-gradient-to-r from-green-500 to-teal-500 h-full transition-all duration-500"
            style={{ width: `${(toolkit.progress.completed / toolkit.progress.total_questions) * 100}%` }}
          />
        </div>
        <p className="text-sm text-green-700 mt-2">
          {toolkit.progress.completed} of {toolkit.progress.total_questions} questions completed
        </p>
      </div>
    </div>
  );
};

const CreativeWritingTools = ({ onSendToChat }) => (
  <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200 mb-4">
    <h4 className="font-bold text-purple-800 mb-3 flex items-center">
      <FiStar className="mr-2" />
      Creative Writing Toolkit
    </h4>
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={() => onSendToChat("Help me brainstorm character ideas")}
        className="p-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors text-sm"
      >
        Character Builder 👤
      </button>
      <button
        onClick={() => onSendToChat("Help me develop my story setting")}
        className="p-2 bg-pink-100 text-pink-700 rounded hover:bg-pink-200 transition-colors text-sm"
      >
        Setting Creator 🏞️
      </button>
      <button
        onClick={() => onSendToChat("Help me plan my story plot")}
        className="p-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-sm"
      >
        Plot Planner 📈
      </button>
      <button
        onClick={() => onSendToChat("Help me revise and improve my writing")}
        className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors text-sm"
      >
        Revision Helper ✏️
      </button>
    </div>
  </div>
);

// Helper function to get appropriate item label based on subject
const getItemLabel = (subject, itemNumber) => {
  const labelMap = {
    'math': `Problem ${itemNumber}`,
    'science': `Activity ${itemNumber}`,
    'history': `Question ${itemNumber}`,
    'language arts': `Exercise ${itemNumber}`,
    'social studies': `Task ${itemNumber}`
  };
  return labelMap[subject] || `Item ${itemNumber}`;
};

// ProblemItem Component - Separated to fix hooks issue
const ProblemItem = memo(function ProblemItem({
  problem,
  index,
  status,
  workspaceContent,
  workNotes,
  feedbacks,
  getStatusIndicator,
  handleAnswerChange,
  handleCheckAnswer,
  handleReset,
  selectedVoice,
  isSpeaking,
  currentSpeakingId,
  handleSpeak,
  handleStopSpeaking,
  studentProfile,
  sendWorkToChat,
  setWorkNotes,
  onInteraction,
  setFeedback
}) {
  // Now useMemo is called at the component level, not inside a map
  const { bgColor, borderClass } = useMemo(() => {
    switch (status) {
      case 'correct':
      case 'excellent':
      case 'good':
        return { bgColor: 'rgba(34, 197, 94, 0.05)', borderClass: 'border-green-400 shadow-green-100' };
      case 'incorrect':
        return { bgColor: 'rgba(239, 68, 68, 0.05)', borderClass: 'border-red-400 shadow-red-100' };
      case 'needs_improvement':
        return { bgColor: 'rgba(245, 158, 11, 0.05)', borderClass: 'border-yellow-400 shadow-yellow-100' };
      case 'checking':
        return { bgColor: 'rgba(59, 130, 246, 0.05)', borderClass: 'border-blue-400 shadow-blue-100' };
      default:
        return { bgColor: 'rgba(255, 255, 255, 1)', borderClass: 'border-gray-200 hover:border-gray-300' };
    }
  }, [status]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: 1,
        y: 0,
        backgroundColor: bgColor
      }}
      transition={{
        delay: index * 0.05,
        type: "tween",
        duration: 0.3
      }}
      className={`bg-white border-2 rounded-xl p-3 sm:p-4 mb-3 sm:mb-4 transition-all duration-300 shadow-sm ${borderClass}`}
    >
      {/* Problem Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          {getStatusIndicator(problem.id)}
          <span className="text-lg font-bold text-gray-800">
            {getItemLabel(workspaceContent.subject, index + 1)}
          </span>
        </div>
      </div>

      {/* Reading Passage - show for reading comprehension */}
      {problem.reading_passage && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center mb-2">
            <span className="text-sm font-semibold text-amber-700 bg-amber-200 px-2 py-1 rounded-full">
              📖 Reading Passage
            </span>
          </div>
          <div className="text-gray-800 leading-relaxed">
            {problem.reading_passage}
          </div>
        </div>
      )}

      {/* Problem Text */}
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-xl font-bold text-gray-800">
          {problem.text}
        </div>
      </div>

      {/* Work Area - show if not successfully completed */}
      {status !== 'correct' && status !== 'excellent' && status !== 'good' && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-600 flex items-center">
              <FiEdit3 size={14} className="mr-2" />
              Your Work:
            </h4>
            {workNotes[problem.id]?.trim() && status !== 'checking' && (
              <button
                onClick={() => sendWorkToChat(index, problem.text, workNotes[problem.id])}
                className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full hover:bg-green-200 transition-colors flex items-center space-x-1 border border-green-300 touch-manipulation"
                aria-label="Submit work for checking"
              >
                <FiSend size={12} />
                <span>Check My Work</span>
              </button>
            )}
          </div>

          <textarea
            value={workNotes[problem.id] || ''}
            onChange={(e) => handleAnswerChange(problem.id, e.target.value)}
            className="w-full p-3 border-2 border-gray-300 rounded-lg resize-none min-h-[120px] sm:min-h-[150px] focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-colors font-medium text-gray-800"
            placeholder="Show your work here, step by step..."
            disabled={status === 'checking'}
          />

          {/* Speaking controls */}
          <div className="mt-2 flex justify-end">
            <button
              onClick={() => isSpeaking && currentSpeakingId === problem.id ? handleStopSpeaking() : handleSpeak(problem.text, problem.id)}
              className="text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full hover:bg-purple-200 transition-colors flex items-center space-x-1 border border-purple-300"
              disabled={isSpeaking && currentSpeakingId !== problem.id}
            >
              {isSpeaking && currentSpeakingId === problem.id ? (
                <>
                  <span className="animate-pulse">🔊</span>
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <span>🔊</span>
                  <span>Read to me</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Feedback Display */}
      {status === 'excellent' && (
        <div className="p-3 bg-purple-100 border border-purple-300 rounded-lg text-purple-800">
          <FiAward className="inline-block mr-2" />
          <strong>Excellent work! Outstanding! 🌟</strong>
          {feedbacks[problem.id] && <div className="mt-2 text-sm">{feedbacks[problem.id]}</div>}
        </div>
      )}

      {status === 'good' && (
        <div className="p-3 bg-blue-100 border border-blue-300 rounded-lg text-blue-800">
          <FiStar className="inline-block mr-2" />
          <strong>Good job! Well done! ⭐</strong>
          {feedbacks[problem.id] && <div className="mt-2 text-sm">{feedbacks[problem.id]}</div>}
        </div>
      )}

      {status === 'correct' && (
        <div className="p-3 bg-green-100 border border-green-300 rounded-lg text-green-800">
          <FiCheckCircle className="inline-block mr-2" />
          <strong>Correct! Great job! 🎉</strong>
          {feedbacks[problem.id] && <div className="mt-2 text-sm">{feedbacks[problem.id]}</div>}
        </div>
      )}

      {status === 'needs_improvement' && (
        <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-lg text-yellow-800">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-yellow-500 inline-block mr-2 font-bold">⚠</div>
              <strong>Good effort! Let&apos;s work on this together. 💪</strong>
              {feedbacks[problem.id] && <div className="mt-2 text-sm">{feedbacks[problem.id]}</div>}
            </div>
            <button
              onClick={() => handleReset(problem.id)}
              className="ml-3 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full hover:bg-blue-200 transition-colors flex items-center space-x-1 border border-blue-300"
            >
              <FiRotateCcw size={12} />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      )}

      {status === 'incorrect' && (
        <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-red-800">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <FiX className="inline-block mr-2" />
              <strong>Not quite right. Think it through again! 💪</strong>
              {feedbacks[problem.id] && <div className="mt-2 text-sm">{feedbacks[problem.id]}</div>}
            </div>
            <button
              onClick={() => handleReset(problem.id)}
              className="ml-3 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full hover:bg-blue-200 transition-colors flex items-center space-x-1 border border-blue-300"
            >
              <FiRotateCcw size={12} />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      )}

      {status === 'incomplete' && (
        <div className="p-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-800">
          <div className="text-gray-500 inline-block mr-2 font-bold">○</div>
          <strong>Keep working on this! 📝</strong>
          {feedbacks[problem.id] && <div className="mt-2 text-sm">{feedbacks[problem.id]}</div>}
        </div>
      )}

      {/* Adaptive Hint System */}
      {problem.hint && status !== 'correct' && status !== 'excellent' && status !== 'good' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
          className="text-sm p-3 bg-blue-50 border-l-4 border-blue-400 rounded-lg mt-3"
        >
          <strong className="text-blue-600">💡 Hint:</strong> {problem.hint}
        </motion.div>
      )}

      {/* Adaptive Encouragement based on student profile */}
      {studentProfile?.response_patterns?.tends_to_give_up &&
       status === 'pending' &&
       workNotes[problem.id]?.length > 10 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm p-3 bg-green-50 border-l-4 border-green-400 rounded-lg mt-3"
        >
          <strong className="text-green-600">🌟 You&apos;re doing great!</strong> Keep working through it step by step!
        </motion.div>
      )}

      {/* Challenge encouragement for confident students */}
      {studentProfile?.confidence_level === 'high' &&
       status === 'correct' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg mt-3"
        >
          <strong className="text-yellow-600">🚀 Ready for more?</strong> Ask for a harder challenge!
        </motion.div>
      )}
    </motion.div>
  );
});

const SimpleWorkspace = forwardRef(function SimpleWorkspace({
  workspaceContent,
  isExpanded,
  onClose,
  onSendToChat,
  onInteraction,
  studentProfile,
  adaptiveData
}, ref) {
  const [problems, setProblems] = useState([]);
  const [workNotes, setWorkNotes] = useState({});
  const [problemStates, setProblemStates] = useState({}); // 'pending', 'correct', 'incorrect'
  const [feedbacks, setFeedbacks] = useState({}); // Store feedback for each problem
  const [currentAchievement, setCurrentAchievement] = useState(null);
  const [showAchievement, setShowAchievement] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('en-US-Standard-A');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeakingId, setCurrentSpeakingId] = useState(null);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    markProblemCorrect: (problemId) => markProblemCorrect(problemId),
    markProblemIncorrect: (problemId) => markProblemIncorrect(problemId)
  }));

  // Initialize workspace when content changes
  useEffect(() => {
    // Handle creative writing toolkit differently
    if (workspaceContent?.type === 'creative_writing_toolkit') {
      setProblems([]); // Clear problems for creative writing
      setWorkNotes({});
      setProblemStates({});
      setFeedbacks({});
      return;
    }

    // Handle both new subject workspaces (content) and legacy math workspaces (problems)
    const items = workspaceContent?.content || workspaceContent?.problems;

    if (workspaceContent && items?.length > 0) {

      setProblems(items);

      // Set initial states
      const initialStates = {};
      items.forEach(item => {
        initialStates[item.id] = item.status || 'pending';
      });
      setProblemStates(initialStates);

      // Clear work notes and feedbacks
      setWorkNotes({});
      setFeedbacks({});
    }
  }, [workspaceContent]);

  // Send work to chat for checking - memoized for better performance
  const sendWorkToChat = useCallback((problemIndex, problemText, workNote) => {
    if (!workNote.trim()) return;

    // Track interaction for auto-collapse timing
    if (onInteraction) onInteraction();

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
  }, [problems, onInteraction, onSendToChat]);

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

  // Set feedback for a problem
  const setFeedback = (problemId, feedback) => {
    setFeedbacks(prev => ({
      ...prev,
      [problemId]: feedback
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
    setFeedbacks(prev => ({
      ...prev,
      [problemId]: ''
    }));
  };

  // Handle answer change
  const handleAnswerChange = (problemId, value) => {
    setWorkNotes(prev => ({
      ...prev,
      [problemId]: value
    }));
    // Track interaction for auto-collapse timing
    if (onInteraction) onInteraction();
  };

  // Handle check answer (currently not used but needed for prop)
  const handleCheckAnswer = (problemId) => {
    // This function is passed to ProblemItem but not currently used
    // It's here to prevent errors
  };

  // Handle text-to-speech
  const handleSpeak = (text, id) => {
    if ('speechSynthesis' in window) {
      // Stop any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = window.speechSynthesis.getVoices().find(voice => voice.name === selectedVoice) || null;
      utterance.rate = 0.9;
      utterance.pitch = 1;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setCurrentSpeakingId(id);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setCurrentSpeakingId(null);
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        setCurrentSpeakingId(null);
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  // Stop speaking
  const handleStopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setCurrentSpeakingId(null);
    }
  };

  // Get status indicator with optimized animations
  const getStatusIndicator = useCallback((problemId) => {
    const state = problemStates[problemId];

    const StatusIcon = ({ children, color = "text-gray-400" }) => (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "tween", duration: 0.2 }}
        className={color}
      >
        {children}
      </motion.div>
    );

    switch (state) {
      case 'excellent':
        return (
          <StatusIcon color="text-green-600">
            <div className="text-2xl">⭐</div>
          </StatusIcon>
        );
      case 'good':
        return (
          <StatusIcon color="text-green-500">
            <FiCheckCircle size={20} />
          </StatusIcon>
        );
      case 'correct':
        return (
          <StatusIcon color="text-green-500">
            <FiCheckCircle size={20} />
          </StatusIcon>
        );
      case 'needs_improvement':
        return (
          <StatusIcon color="text-yellow-500">
            <div className="text-xl font-bold">⚠</div>
          </StatusIcon>
        );
      case 'incorrect':
        return (
          <StatusIcon color="text-red-500">
            <FiX size={20} />
          </StatusIcon>
        );
      case 'incomplete':
        return (
          <StatusIcon color="text-gray-500">
            <div className="text-xl font-bold">○</div>
          </StatusIcon>
        );
      case 'checking':
        return (
          <StatusIcon color="text-blue-500">
            <div className="loading-dots">
              <span></span><span></span><span></span>
            </div>
          </StatusIcon>
        );
      default:
        return (
          <StatusIcon>
            <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
          </StatusIcon>
        );
    }
  }, [problemStates]);

  // Handle creative writing toolkit separately
  if (workspaceContent?.type === 'creative_writing_toolkit') {
    return (
      <>
        {/* Achievement Notification */}
        <AchievementNotification
          achievement={currentAchievement}
          show={showAchievement}
          onClose={() => setShowAchievement(false)}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="h-full flex flex-col bg-white border-l border-gray-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 bg-purple-50 border-b flex-shrink-0">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 truncate mr-2">
              ✍️ {workspaceContent.title}
              <span className="ml-2 text-xs sm:text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                {workspaceContent.prompt_type}
              </span>
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors p-1 touch-manipulation"
              aria-label="Close workspace"
            >
              <FiX size={20} />
            </button>
          </div>

          {/* Creative Writing Toolkit Content */}
          <div className="flex-1 p-4 overflow-y-auto">
            <CreativeWritingToolkit
              toolkit={workspaceContent}
              onSendToChat={onSendToChat}
            />
          </div>
        </motion.div>
      </>
    );
  }

  if (!workspaceContent || !problems.length) {
    return null;
  }

  return (
    <>
      {/* Achievement Notification */}
      <AchievementNotification
        achievement={currentAchievement}
        show={showAchievement}
        onClose={() => setShowAchievement(false)}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-full flex flex-col bg-white border-l border-gray-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 bg-blue-50 border-b flex-shrink-0">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 truncate mr-2">
            {getSubjectEmoji(workspaceContent.subject)} {workspaceContent.title || 'Practice Activities'}
            {workspaceContent.subject && (
              <span className="ml-2 text-xs sm:text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                {workspaceContent.subject}
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors p-1 touch-manipulation"
            aria-label="Close workspace"
          >
            <FiX size={20} />
          </button>
        </div>

      {/* Problems */}
      <div className="flex-1 p-3 sm:p-4 overflow-y-auto overscroll-behavior-contain">
        {/* Creative Writing Tools - Only for actual creative writing activities */}
        {workspaceContent.subject === 'language arts' &&
         problems.some(problem => ['creative_writing', 'story_elements', 'brainstorming', 'writing_prompt'].includes(problem.type)) && (
          <CreativeWritingTools onSendToChat={onSendToChat} />
        )}

        {problems.map((problem, index) => {
          const status = problemStates[problem.id];

          return (
            <ProblemItem
              key={problem.id}
              problem={problem}
              index={index}
              status={status}
              workspaceContent={workspaceContent}
              workNotes={workNotes}
              feedbacks={feedbacks}
              getStatusIndicator={getStatusIndicator}
              handleAnswerChange={handleAnswerChange}
              handleCheckAnswer={handleCheckAnswer}
              handleReset={resetProblemState}
              selectedVoice={selectedVoice}
              isSpeaking={isSpeaking}
              currentSpeakingId={currentSpeakingId}
              handleSpeak={handleSpeak}
              handleStopSpeaking={handleStopSpeaking}
              studentProfile={studentProfile}
              sendWorkToChat={sendWorkToChat}
              setWorkNotes={setWorkNotes}
              onInteraction={onInteraction}
              setFeedback={setFeedback}
            />
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
    </>
  );
});

export default SimpleWorkspace;
