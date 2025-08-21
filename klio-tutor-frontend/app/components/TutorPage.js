'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import Image from 'next/image';
import MathScratchpad from './MathScratchpad';

export default function TutorPage() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastResponseId, setLastResponseId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [hasHistory, setHasHistory] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [currentProblemText, setCurrentProblemText] = useState('');
  const messagesEndRef = useRef(null);
  const mathScratchpadRef = useRef(null);
  const { child, logout, getAuthHeaders } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  // Load session history on component mount
  useEffect(() => {
    const loadSessionHistory = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tutor/session`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
        });

        const data = await response.json();
        
        // Handle token expiration during session loading
        if (response.status === 401 && (data.code === 'TOKEN_EXPIRED' || data.code === 'INVALID_TOKEN' || data.code === 'MISSING_TOKEN')) {
          console.log('Token expired during session load, logging out user');
          logout();
          return;
        }
        
        if (data.success && data.messages && data.messages.length > 0) {
          // Restore session messages
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
        }
        
        setInitialLoading(false);
      } catch (error) {
        console.error('Error loading session history:', error);
        setInitialLoading(false);
      }
    };

    if (child) {
      loadSessionHistory();
    }
  }, [child, getAuthHeaders]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    // Use the simplified message function
    await sendMessageToAI(userMessage);
  };

  // Extract current problem text for scratchpad reference
  const extractProblemReference = (aiResponse) => {
    // Look for math problems in the AI's response to reference in scratchpad
    const mathPatterns = [
      /What (?:is|are) (?:the )?(?:factors of |all factors of )?(.+?)\?/i,
      /(?:Find|Calculate|Solve) (.+?)(?:\?|$)/i,
      /(.+?) [=÷×+\-] (.+?)(?:\?|$)/i
    ];
    
    for (const pattern of mathPatterns) {
      const match = aiResponse.match(pattern);
      if (match) {
        return match[0].trim();
      }
    }
    
    // If no specific problem found, check if this is math-related
    const mathKeywords = ['factor', 'multiply', 'divide', 'add', 'subtract', 'solve', 'calculate'];
    if (mathKeywords.some(keyword => aiResponse.toLowerCase().includes(keyword))) {
      return 'Math problem from chat';
    }
    
    return '';
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
        // Extract problem reference for scratchpad
        const problemRef = extractProblemReference(data.response);
        if (problemRef) {
          setCurrentProblemText(problemRef);
          // Auto-open scratchpad for math problems if not already open
          if (!showScratchpad && problemRef !== 'Math problem from chat') {
            setShowScratchpad(true);
          }
        }
        
        // Clean the response by removing workspace markers for display
        const cleanedResponse = data.response.replace(/\[WORKSPACE_START\].*?\[WORKSPACE_END\]/gs, '').trim();
        
        // Add tutor response (cleaned)
        setMessages(prev => [...prev, {
          id: `tutor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'tutor',
          content: cleanedResponse,
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

    // Send to AI for evaluation (this will add the message automatically)
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
            <button
              onClick={() => setShowScratchpad(!showScratchpad)}
              className={`text-sm px-3 py-2 rounded-lg border font-medium transition-colors ${
                showScratchpad 
                  ? 'bg-green-500 text-white border-green-500' 
                  : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
              }`}
            >
              📝 Scratchpad
            </button>
            <button
              onClick={() => {
                setMessages([]);
                setLastResponseId(null);
                setSessionId(null);
                setHasHistory(false);
                setShowScratchpad(false);
                setCurrentProblemText('');
                // Clear scratchpad work
                if (mathScratchpadRef.current) {
                  mathScratchpadRef.current.clear();
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
          showScratchpad ? 'w-1/2 border-r border-gray-200' : 'w-full'
        }`}>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                <p className="text-sm text-gray-600 font-semibold mb-3">📚 Learning Helper:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    "Help me with math problems 🧮",
                    "Help me with writing ✍️",
                    "Can you explain this? 💡",
                    "I need help understanding 📝"
                  ].map((suggestion, index) => (
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
                <p className="text-sm text-gray-600 font-semibold mb-3">🚀 Quick Start Questions:</p>
                <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
                  {[
                    { text: "What's 15 × 7?", type: "math" },
                    { text: "Tell me about space", type: "science" },
                    { text: "How do I write a story?", type: "writing" },
                    { text: "What are fractions?", type: "math" },
                    { text: "Help me spell difficult words", type: "writing" },
                    { text: "What's the water cycle?", type: "science" }
                  ].map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => setInputMessage(suggestion.text)}
                      className={`text-sm px-3 py-2 rounded-lg border transition-colors ${
                        suggestion.type === 'math' ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200' :
                        suggestion.type === 'science' ? 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200' :
                        'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
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
          messages.filter(msg => !msg.hidden).map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl ${
                  message.type === 'user'
                    ? 'bg-accent-blue text-gray-900'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="chat-message-content">
                  {message.type === 'tutor' ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    message.content
                  )}
                </div>
                <div className="text-xs opacity-60 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            </div>
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
          <div className="border-t border-gray-200 p-4 bg-white">
            <form onSubmit={sendMessage} className="flex space-x-3">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your question here..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-accent-blue focus:border-accent-blue outline-none"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !inputMessage.trim()}
                className="bg-accent-blue hover:bg-accent-blue-hover text-gray-900 px-6 py-3 rounded-2xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-xl">🚀</span>
              </button>
            </form>
          </div>
        </div>

        {/* Math Scratchpad Panel */}
        {showScratchpad && (
          <div className="w-1/2 flex flex-col">
            <MathScratchpad
              ref={mathScratchpadRef}
              currentProblemText={currentProblemText}
              onSubmitWork={handleWorkSubmission}
              onClose={() => setShowScratchpad(false)}
              isVisible={showScratchpad}
            />
          </div>
        )}
      </div>
    </div>
  );
}