'use client';

import { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import Image from 'next/image';
import MathScratchpad from './MathScratchpad';
import HistoryScratchpad from './HistoryScratchpad';

// Memoized ReactMarkdown component to prevent re-rendering
const MemoizedMarkdown = memo(function MemoizedMarkdown({ content }) {
  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

// Optimized input component to prevent parent re-renders
const ChatInput = memo(function ChatInput({ 
  value, 
  onChange, 
  onSubmit, 
  loading, 
  placeholder = "Type your question here..." 
}) {
  return (
    <div className="border-t border-gray-200 p-4 bg-white">
      <form onSubmit={onSubmit} className="flex space-x-3">
        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-accent-blue focus:border-accent-blue outline-none"
          disabled={loading}
          autoComplete="off"
          spellCheck="false"
        />
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="bg-accent-blue hover:bg-accent-blue-hover text-gray-900 px-6 py-3 rounded-2xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-xl">🚀</span>
        </button>
      </form>
    </div>
  );
});

// Memoized Message Component for better performance
const ChatMessage = memo(function ChatMessage({ message }) {
  const formattedTime = useMemo(() => {
    return new Date(message.timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }, [message.timestamp]);

  const isUser = message.type === 'user';
  const messageClass = isUser ? 'bg-accent-blue text-gray-900' : 'bg-gray-100 text-gray-900';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-sm md:max-w-lg lg:max-w-2xl px-5 py-4 rounded-2xl ${messageClass} shadow-sm`}
      >
        <div className="chat-message-content">
          {!isUser ? (
            <MemoizedMarkdown content={message.content} />
          ) : (
            message.content
          )}
        </div>
        <div className="text-xs opacity-60 mt-1">
          {formattedTime}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return prevProps.message.id === nextProps.message.id && 
         prevProps.message.content === nextProps.message.content &&
         prevProps.message.timestamp === nextProps.message.timestamp;
});

export default function TutorPage() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastResponseId, setLastResponseId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [hasHistory, setHasHistory] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [activeScratchpad, setActiveScratchpad] = useState('none');
  const [curriculumSuggestions, setCurriculumSuggestions] = useState(null);
  const messagesEndRef = useRef(null);
  const mathScratchpadRef = useRef(null);
  const historyScratchpadRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const userScrolling = useRef(false);
  const { child, logout, getAuthHeaders } = useAuth();

  // Memoize visible messages to prevent expensive filtering on every render
  const visibleMessages = useMemo(() => {
    return messages.filter(msg => !msg.hidden);
  }, [messages]);

  // Memoize input change handler to prevent unnecessary re-renders
  const handleInputChange = useCallback((e) => {
    setInputMessage(e.target.value);
  }, []);

  // Detect manual scrolling to avoid interference
  const handleScroll = useCallback(() => {
    userScrolling.current = true;
    // Reset after a delay
    setTimeout(() => {
      userScrolling.current = false;
    }, 1000);
  }, []);

  const scrollToBottom = useCallback(() => {
    // Don't auto-scroll if user is manually scrolling
    if (userScrolling.current) return;
    
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, []);

  // Optimize scrolling - only scroll when messages length changes and user isn't scrolling
  useEffect(() => {
    if (userScrolling.current) return;
    
    const timeoutId = setTimeout(() => {
      requestAnimationFrame(scrollToBottom);
    }, 50); // Reduced delay for better responsiveness
    
    return () => clearTimeout(timeoutId);
  }, [messages.length, scrollToBottom]);

  // Load session history on component mount - but skip if this is a fresh login
  useEffect(() => {
    const loadSessionHistory = async () => {
      try {
        // Check if this is a fresh login (no session ID stored)
        const storedSessionId = localStorage.getItem('session_id');
        if (!storedSessionId) {
          console.log('Fresh login detected - starting with clean session');
          setInitialLoading(false);
          return;
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tutor/session`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
        });

        // Handle network errors
        if (!response.ok) {
          if (response.status === 401) {
            const data = await response.json().catch(() => ({}));
            if (data.code === 'TOKEN_EXPIRED' || data.code === 'INVALID_TOKEN' || data.code === 'MISSING_TOKEN') {
              console.log('Token expired during session load, logging out user');
              logout();
              return;
            }
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.success && data.messages && data.messages.length > 0) {
          // Restore session messages only if we have valid session data
          setMessages(data.messages);
          setHasHistory(data.hasHistory);
          setSessionId(data.sessionId);
          
          // Restore last response ID for chain-of-thought continuity
          if (data.lastResponseId) {
            setLastResponseId(data.lastResponseId);
          }
          
          console.log(`Restored ${data.messages.length} messages from session ${data.sessionId}`);
        } else {
          console.log('No previous session found or session expired');
          // Clear any stale session data
          localStorage.removeItem('session_id');
        }
        
        setInitialLoading(false);
      } catch (error) {
        console.error('Error loading session history:', error);
        // Don't block the UI if session loading fails
        setInitialLoading(false);
        // Clear potentially corrupt session data
        localStorage.removeItem('session_id');
      }
    };

    if (child) {
      loadSessionHistory();
    } else {
      setInitialLoading(false);
    }
  }, [child, getAuthHeaders]);

  // Generate dynamic curriculum suggestions based on student's current status
  const generateCurriculumSuggestions = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tutor/curriculum-suggestions`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      const data = await response.json();
      if (data.success && data.suggestions) {
        setCurriculumSuggestions(data.suggestions);
      } else {
        // Use fallback suggestions
        setCurriculumSuggestions({
          subjects: [
            "Help me with Math 🧮",
            "Let's work on English ✍️", 
            "Review Literature 📖",
            "What should we work on? 💡"
          ],
          specific: [
            { text: "What's coming up next?", type: "general" },
            { text: "Show me what needs review", type: "general" },
            { text: "Help me study", type: "general" },
            { text: "Practice problems", type: "general" }
          ]
        });
      }
    } catch (error) {
      console.error('Error generating curriculum suggestions:', error);
      // Use fallback suggestions
      setCurriculumSuggestions({
        subjects: [
          "Help me with Math 🧮",
          "Let's work on English ✍️", 
          "Review Literature 📖",
          "What should we work on? 💡"
        ],
        specific: [
          { text: "What's coming up next?", type: "general" },
          { text: "Show me what needs review", type: "general" },
          { text: "Help me study", type: "general" },
          { text: "Practice problems", type: "general" }
        ]
      });
    }
  };

  // Load curriculum suggestions when component mounts
  useEffect(() => {
    if (child && !hasHistory) {
      generateCurriculumSuggestions();
    }
  }, [child, hasHistory]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    // Use the simplified message function
    await sendMessageToAI(userMessage);
  };


  // Simplified sendMessage function
  const sendMessageToAI = async (messageText) => {
    const userMessage = messageText.trim();
    
    // Add user message immediately
    setMessages(prev => [...prev, {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    }]);

    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tutor/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ 
          message: userMessage,
          sessionHistory: messages,
          previousResponseId: lastResponseId
        }),
      });

      const data = await response.json();

      // Handle token expiration
      if (response.status === 401 && (data.code === 'TOKEN_EXPIRED' || data.code === 'INVALID_TOKEN' || data.code === 'MISSING_TOKEN')) {
        console.log('Token expired or invalid, logging out user');
        logout();
        return;
      }

      if (data.success) {
        // Smart scratchpad opening for math problems
        const containsMathProblem = data.response.match(/(?:What are the factors of|Find the prime factorization of|Divide:|True or False:|List the factors|Calculate|Solve|how many|Show your thinking|Show your work|step by step|multiplication|division|addition|subtraction|\d+\s*[\+\-\×\÷\*\/]\s*\d+|groups.*apples|factor|prime|equation|practice.*math|math.*practice|problem|challenge|total|in your own words.*number)/i);
        
        // Smart scratchpad opening for history content
        const containsHistoryContent = data.response.match(/(?:timeline|when did|what year|causes.*effects|cause.*effect|resulted in|led to|because of|consequence|explorers?|colonies|colonial|New World|history|historical|era|period|century|revolution|war|battle|treaty|empire|civilization|ancient|medieval|compare.*contrast|significance|key terms?|vocabulary|define|who was|important people|important events)/i);
        
        // Auto-open appropriate scratchpad based on content
        if (containsMathProblem && activeScratchpad === 'none') {
          setActiveScratchpad('math');
        }
        
        if (containsHistoryContent && activeScratchpad === 'none') {
          setActiveScratchpad('history');
        }
        
        // Add tutor response
        setMessages(prev => [...prev, {
          id: `tutor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'tutor',
          content: data.response,
          timestamp: data.timestamp,
          responseId: data.responseId
        }]);

        setLastResponseId(data.responseId);
        
        if (data.sessionId) {
          setSessionId(data.sessionId);
        }
        if (data.hasHistory !== undefined) {
          setHasHistory(data.hasHistory);
        }
      } else if (response.status === 403 && data.code === 'AI_ACCESS_REQUIRED') {
        setMessages(prev => [...prev, {
          id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'tutor',
          content: `🔒 **Subscription Required**\n\n${data.error}\n\n${data.upgradeMessage}\n\nAsk your parent to visit [klioai.com](${process.env.NODE_ENV === 'production' ? 'https://klioai.com' : 'http://localhost:3000'}) to upgrade your plan!`,
          timestamp: new Date().toISOString(),
          isSubscriptionError: true
        }]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = error.message.includes('AI features not available') 
        ? `🔒 **AI Tutor Access Required**\n\nYour parent needs to upgrade to an AI plan to use the tutor. Ask them to visit [klioai.com](${process.env.NODE_ENV === 'production' ? 'https://klioai.com' : 'http://localhost:3000'}) to upgrade!`
        : 'Sorry, I had trouble understanding that. Can you try asking in a different way?';
        
      setMessages(prev => [...prev, {
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'tutor',
        content: errorMessage,
        timestamp: new Date().toISOString()
      }]);
    }

    setLoading(false);
  };

  // Handle work submission from scratchpad
  const handleWorkSubmission = async (work, problem) => {
    console.log('Work submitted from scratchpad:', { work, problem });
    
    const studentMessage = `Here's my work:\n\n${work}`;

    // Send to AI for evaluation automatically
    await sendMessageToAI(studentMessage);
  };


  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="bg-accent-blue border-b border-accent-blue-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              <Image
                src="/klio_logo.png"
                alt="Klio AI"
                width={24}
                height={24}
                className="rounded-full"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 font-fredoka">
                Klio Tutor
              </h1>
              <p className="text-sm text-gray-600">
                Hi {child?.first_name}! Ready to learn?
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            {/* Scratchpad Selector Dropdown */}
            <div className="relative">
              <select
                value={activeScratchpad}
                onChange={(e) => {
                  const newScratchpad = e.target.value;
                  // Clear previous scratchpad if switching
                  if (activeScratchpad !== newScratchpad) {
                    if (mathScratchpadRef.current) mathScratchpadRef.current.clear();
                    if (historyScratchpadRef.current) historyScratchpadRef.current.clear();
                  }
                  setActiveScratchpad(newScratchpad);
                }}
                className={`text-sm px-3 py-2 rounded-lg border font-medium transition-colors appearance-none cursor-pointer ${
                  activeScratchpad !== 'none'
                    ? 'bg-green-500 text-white border-green-500' 
                    : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                <option value="none">📝 Scratchpad</option>
                <option value="math">🧮 Math</option>
                <option value="history">🏛️ History</option>
              </select>
            </div>
            <button
              onClick={async () => {
                try {
                  // End current session on backend
                  await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tutor/session/end`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      ...getAuthHeaders(),
                    },
                    body: JSON.stringify({ reason: 'new_chat' })
                  });

                  // Start new session on backend
                  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tutor/session/new`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      ...getAuthHeaders(),
                    },
                    body: JSON.stringify({ reason: 'new_chat' })
                  });

                  const data = await response.json();

                  // Clear frontend state
                  setMessages([]);
                  setLastResponseId(null);
                  setSessionId(data.sessionId || null);
                  setHasHistory(false);
                  setActiveScratchpad('none');
                  // Clear all scratchpad work
                  if (mathScratchpadRef.current) {
                    mathScratchpadRef.current.clear();
                  }
                  if (historyScratchpadRef.current) {
                    historyScratchpadRef.current.clear();
                  }

                  console.log('New chat session started:', data.sessionId);
                } catch (error) {
                  console.error('Error starting new chat session:', error);
                  // Still clear frontend state even if backend call fails
                  setMessages([]);
                  setLastResponseId(null);
                  setSessionId(null);
                  setHasHistory(false);
                  setActiveScratchpad('none');
                  if (mathScratchpadRef.current) {
                    mathScratchpadRef.current.clear();
                  }
                  if (historyScratchpadRef.current) {
                    historyScratchpadRef.current.clear();
                  }
                }
              }}
              className="text-sm bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg border border-gray-200 font-medium"
            >
              New Chat
            </button>
            <button
              onClick={logout}
              className="text-sm bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg border border-gray-200 font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Split Screen Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Panel */}
        <div className={`flex flex-col transition-all duration-300 ${
          activeScratchpad !== 'none' ? 'w-1/2 border-r border-gray-200' : 'w-full'
        }`}>

      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-container"
        onScroll={handleScroll}
        style={{ scrollBehavior: 'auto' }}
      >
        {initialLoading ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-accent-blue rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-gentle">
              <span className="text-3xl">🎓</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2 font-fredoka">
              Loading your session...
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              Checking for previous conversations
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-accent-blue rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-gentle">
              <span className="text-3xl">🎓</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2 font-fredoka">
              {hasHistory ? "Welcome back! Let's continue learning!" : "Let's start learning!"}
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              {hasHistory 
                ? "I remember our previous conversation. What would you like to work on next?"
                : "Ask me anything you'd like to learn about. I can help with math, science, reading, and more!"
              }
            </p>
            {hasHistory && (
              <div className="mt-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-green-100 text-green-800">
                  ✨ Session continued
                </span>
              </div>
            )}
            <div className="mt-6 space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 font-semibold mb-3">📚 Your Subjects:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {(curriculumSuggestions?.subjects || [
                    "Help me with Math 🧮",
                    "Let's work on English ✍️", 
                    "Review Literature 📖",
                    "What should we work on? 💡"
                  ]).map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => setInputMessage(suggestion)}
                      className="text-sm bg-accent-yellow hover:bg-accent-yellow-hover text-gray-700 px-4 py-2 rounded-full border font-medium transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-600 font-semibold mb-3">🎯 Based on Your Current Work:</p>
                <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
                  {(curriculumSuggestions?.specific || [
                    { text: "What should we work on?", type: "general" },
                    { text: "What's coming up next?", type: "general" },
                    { text: "Show me what needs review", type: "general" },
                    { text: "Help me study", type: "general" }
                  ]).map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => setInputMessage(suggestion.text)}
                      className={`text-sm px-3 py-2 rounded-lg border transition-colors ${
                        suggestion.type === 'math' ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200' :
                        suggestion.type === 'literature' ? 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200' :
                        suggestion.type === 'english' ? 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200' :
                        suggestion.type === 'history' ? 'bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200' :
                        'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                      }`}
                    >
                      {suggestion.text}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Klio helps you learn by guiding you through problems step by step! 🌟
                </p>
              </div>
            </div>
          </div>
        ) : (
          visibleMessages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))
        )}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 px-4 py-3 rounded-2xl">
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

          {/* Message Input */}
          <ChatInput
            value={inputMessage}
            onChange={handleInputChange}
            onSubmit={sendMessage}
            loading={loading}
          />
        </div>

        {/* Scratchpad Panel */}
        {activeScratchpad !== 'none' && (
          <div className="w-1/2 flex flex-col">
            {activeScratchpad === 'math' && (
              <MathScratchpad
                ref={mathScratchpadRef}
                onSubmitWork={handleWorkSubmission}
                onClose={() => setActiveScratchpad('none')}
                isVisible={activeScratchpad === 'math'}
              />
            )}
            {activeScratchpad === 'history' && (
              <HistoryScratchpad
                ref={historyScratchpadRef}
                onSubmitWork={handleWorkSubmission}
                onClose={() => setActiveScratchpad('none')}
                isVisible={activeScratchpad === 'history'}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}