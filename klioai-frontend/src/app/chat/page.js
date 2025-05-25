'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProtectedRoute from '../../components/ProtectedRoute';
import Sidebar from '../../components/Sidebar';
import ChatAreaHeader from '../../components/ChatAreaHeader';
import ChatMessage from '../../components/ChatMessage';
import ChatInput from '../../components/ChatInput';
import SuggestionBubbles from '../../components/SuggestionBubbles';
import LessonContextBar from '../../components/LessonContextBar'; 
import { useAuth } from '../../contexts/AuthContext';
import { chatService } from '../../utils/chatService';

const KLIO_AVATAR_EMOJI = '🤖';

export default function ChatPage() {
  const { child, logout } = useAuth();
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isKlioTyping, setIsKlioTyping] = useState(false);
  const [currentTopic, setCurrentTopic] = useState("General Conversation");
  const [currentLessonContext, setCurrentLessonContext] = useState(null);

  useEffect(() => {
    const savedMessages = sessionStorage.getItem('klio_chat_history');
    let initialMessages = [];
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        if (parsed.length > 0) initialMessages = parsed;
      } catch (e) { console.error('Failed to load chat history:', e); }
    }

    if (initialMessages.length === 0) {
      initialMessages = [{
        id: 'welcome-initial',
        role: 'klio',
        content: `Hi ${child?.name || 'Explorer'}! 👋 I'm Klio. How can I help you learn today?`,
        timestamp: new Date().toISOString()
      }];
    }
    setMessages(initialMessages);
    setShowSuggestions(initialMessages.length <= 1);

  }, [child?.name]);

  useEffect(() => {
    const fetchSuggestions = async () => {
        try {
            const data = await (chatService.getSuggestions ? chatService.getSuggestions() : Promise.resolve({suggestions: ["Can you help me with my homework? 📚", "Let's practice math problems! 🧮", "Tell me a fun fact! ☀️", "Can we play a learning game? 🎮"]}));
            setSuggestions(data.suggestions || []);
        } catch (error) {
            console.error('Failed to fetch suggestions:', error);
            setSuggestions(["Explore space", "Learn about animals", "Discover history"]);
        }
    };
    fetchSuggestions();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem('klio_chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (chatContainerRef.current) {
        const { scrollHeight, clientHeight, scrollTop } = chatContainerRef.current;
        const isScrolledToBottom = scrollHeight - clientHeight <= scrollTop + 150;
        const lastMessage = messages[messages.length - 1];

        if (isScrolledToBottom || (lastMessage && lastMessage.role === 'klio') || isKlioTyping) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }
  }, [messages, isKlioTyping]);

  // Main chat send handler, now handles lessonContext in backend reply
  const handleSendMessage = async (messageText) => {
    if (!messageText.trim() || isLoading) return;
    setShowSuggestions(false);
    const userMessage = {
      id: `msg-${Date.now()}-child`,
      role: 'child',
      content: messageText,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsKlioTyping(true);
    setIsLoading(true);

    try {
      // Pass currentLessonContext if needed in future
      const response = await chatService.sendMessage(messageText, messages.slice(-10), currentLessonContext);

      const klioMessage = {
        id: `msg-${Date.now()}-klio`,
        role: 'klio',
        content: response.message,
        timestamp: response.timestamp || new Date().toISOString(),
        lessonContext: response.lessonContext || null,
      };
      setMessages(prev => [...prev, klioMessage]);

      // If backend signals a new/updated lesson context, set it for UI
      if (response.lessonContext) {
        setCurrentLessonContext(response.lessonContext);
      }

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}-error`,
        role: 'klio',
        content: error.message || "I'm having a little trouble. Please try again. 🛠️",
        timestamp: new Date().toISOString(),
        isError: true,
      }]);
    } finally {
      setIsKlioTyping(false);
      setIsLoading(false);
    }
  };

  // Lesson help action (optional, e.g., a "Get Tips" button in LessonContextBar)
  const handleLessonHelp = async (lessonId, lessonTitle) => {
    setIsLoading(true);
    try {
      // You can use a service call or construct a message to Klio to get lesson tips
      await handleSendMessage(`Can you help me with "${lessonTitle}"?`);
    } catch (error) {
      // error handling as needed
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => handleSendMessage(suggestion);

  const handleClearChat = () => {
    if (window.confirm('Start a new chat? This will clear your current conversation.')) {
      setMessages([{
        id: 'welcome-cleared',
        role: 'klio',
        content: `Okay, let's start fresh! What's on your mind? ✨`,
        timestamp: new Date().toISOString(),
      }]);
      sessionStorage.removeItem('klio_chat_history');
      setShowSuggestions(true);
      setCurrentLessonContext(null);
    }
  };

  const handleLogoutConfirmed = async () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      await logout();
    }
  };

  // --- ENHANCED LESSON BAR AND MESSAGES SUPPORT ---
  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden bg-slate-100 font-fredoka text-slate-800">
        <Sidebar
          childName={child?.name}
          onLogout={handleLogoutConfirmed}
          onClearChat={handleClearChat}
        />

        <main className="flex-1 flex flex-col bg-white overflow-hidden">
          <ChatAreaHeader currentTopic={currentTopic} />

          {/* Enhanced: show lesson context bar if lesson context is active */}
          {currentLessonContext && (
            <LessonContextBar
              lessonContext={currentLessonContext}
              onClose={() => setCurrentLessonContext(null)}
              onGetHelp={() =>
                handleLessonHelp(currentLessonContext.lessonId, currentLessonContext.lessonTitle)
              }
            />
          )}

          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  lessonContext={message.lessonContext}
                  onLessonClick={handleLessonHelp}
                />
              ))}
            </AnimatePresence>

            {isKlioTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-end py-1"
              >
                <div className="p-3 rounded-lg rounded-bl-md bg-slate-100 text-slate-700 shadow-sm">
                  <div className="loading-dots text-purple-500">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} className="h-1"/>
          </div>
          
          {/* Suggestion Bubbles */}
          {showSuggestions && suggestions.length > 0 && (
             <div className="w-full flex justify-center px-4 sm:px-6 pb-2 pt-1 border-t border-slate-100">
                <div className="max-w-3xl w-full">
                    <SuggestionBubbles
                        suggestions={suggestions}
                        onSuggestionClick={handleSuggestionClick}
                    />
                </div>
            </div>
          )}

          <div className="bg-white p-3 sm:p-4 border-t border-slate-200">
            <div className="max-w-3xl mx-auto">
                <ChatInput
                    onSendMessage={handleSendMessage}
                    isLoading={isLoading}
                />
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}