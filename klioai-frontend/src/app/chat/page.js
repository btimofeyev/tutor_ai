'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProtectedRoute from '../../components/ProtectedRoute'; 
import Sidebar from '../../components/Sidebar'; 
import ChatHeader from '../../components/ChatHeader';
import ChatMessage from '../../components/ChatMessage'; 
import ChatInput from '../../components/ChatInput';
import SuggestionBubbles from '../../components/SuggestionBubbles'; 
import LessonContextBar from '../../components/LessonContextBar';
import WorkspacePanel from '../../components/WorkspacePanel';
import { useAuth } from '../../contexts/AuthContext'; 
import { chatService } from '../../utils/chatService';
import { parseWorkspaceContent, extractQuestionFromLesson } from '../../utils/workspaceParser';

const INITIAL_SUGGESTIONS = [
  "Can you help me with my homework? 📚", 
  "Let's practice math problems! 🧮", 
  "Tell me a fun fact! ☀️", 
  "Can we play a learning game? 🎮"
];

export default function ChatPage() {
  const { child, logout } = useAuth();
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isKlioTyping, setIsKlioTyping] = useState(false);
  const [currentTopic, setCurrentTopic] = useState("General Conversation");
  const [currentLessonContext, setCurrentLessonContext] = useState(null);
  
  // Workspace state
  const [workspaceContent, setWorkspaceContent] = useState(null);
  const [isWorkspaceExpanded, setIsWorkspaceExpanded] = useState(false);

  // Load initial messages
  useEffect(() => {
    const savedMessages = sessionStorage.getItem('klio_chat_history');
    let initialMessages = [];
    
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        if (parsed.length > 0) initialMessages = parsed;
      } catch (e) {
        console.error('Failed to load chat history:', e);
      }
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

  // Load suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const data = await chatService.getSuggestions();
        setSuggestions(data.suggestions || INITIAL_SUGGESTIONS);
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        setSuggestions(INITIAL_SUGGESTIONS);
      }
    };
    fetchSuggestions();
  }, []);

  // Save messages to session storage
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem('klio_chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (!chatContainerRef.current) return;
    
    const { scrollHeight, clientHeight, scrollTop } = chatContainerRef.current;
    const isScrolledToBottom = scrollHeight - clientHeight <= scrollTop + 150;
    const lastMessage = messages[messages.length - 1];
    const shouldScroll = isScrolledToBottom || 
                        (lastMessage && lastMessage.role === 'klio') || 
                        isKlioTyping;

    if (shouldScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isKlioTyping]);

  const handleSendToWorkspace = (message) => {
    const parsedContent = parseWorkspaceContent(message.content, currentLessonContext);
    if (parsedContent) {
      setWorkspaceContent(parsedContent);
    }
  };
  
  const handleQuestionRequest = (questionNumber, lessonContext) => {
    if (lessonContext?.lesson_json) {
      const questionContent = extractQuestionFromLesson(lessonContext.lesson_json, questionNumber);
      if (questionContent) {
        setWorkspaceContent(questionContent);
      }
    }
  };

  const handleWorkspaceToChat = (message) => {
    handleSendMessage(message);
  };

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
      const response = await chatService.sendMessage(messageText, messages.slice(-10), currentLessonContext);

      const klioMessage = {
        id: `msg-${Date.now()}-klio`,
        role: 'klio',
        content: response.message,
        timestamp: response.timestamp || new Date().toISOString(),
        lessonContext: response.lessonContext || null,
        workspaceHint: response.workspaceHint || null,
      };
      
      setMessages(prev => [...prev, klioMessage]);

      if (response.lessonContext) {
        setCurrentLessonContext(response.lessonContext);
      }

      if (response.workspaceHint) {
        handleWorkspaceHint(response.workspaceHint, klioMessage);
      }

      // Auto-detect workspace content
      setTimeout(() => {
        const autoDetectedContent = parseWorkspaceContent(response.message, currentLessonContext);
        if (autoDetectedContent && !response.workspaceHint) {
          setWorkspaceContent(autoDetectedContent);
        }
      }, 500);

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

  const handleWorkspaceHint = (workspaceHint, klioMessage) => {
    switch (workspaceHint.type) {
      case 'assignment_hint':
        if (workspaceHint.lessonContext) {
          setWorkspaceContent({
            type: 'assignment',
            data: {
              title: workspaceHint.lessonContext.title || 'Current Assignment',
              type: workspaceHint.lessonContext.content_type || 'lesson',
              learningGoals: workspaceHint.lessonContext.lesson_json?.learning_objectives || [],
              problems: workspaceHint.lessonContext.lesson_json?.tasks_or_questions?.slice(0, 8) || [],
              estimatedTime: workspaceHint.lessonContext.lesson_json?.estimated_completion_time_minutes
            }
          });
        }
        break;
        
      case 'specific_question':
        handleQuestionRequest(workspaceHint.questionNumber, workspaceHint.lessonContext);
        break;
        
      case 'math_problems':
        if (workspaceHint.problems) {
          setWorkspaceContent({
            type: 'math_problems',
            problems: workspaceHint.problems
          });
        }
        break;
        
      default:
        const parsedContent = parseWorkspaceContent(klioMessage.content, currentLessonContext);
        if (parsedContent) {
          setWorkspaceContent(parsedContent);
        }
    }
  };

  const handleLessonHelp = async (lessonId, lessonTitle) => {
    setIsLoading(true);
    try {
      await handleSendMessage(`Can you help me with "${lessonTitle}"?`);
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
      setWorkspaceContent(null);
    }
  };

  const handleLogoutConfirmed = async () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      await logout();
    }
  };

  const handleToggleWorkspaceSize = () => {
    setIsWorkspaceExpanded(!isWorkspaceExpanded);
  };

  const chatWidth = workspaceContent 
    ? (isWorkspaceExpanded ? 'w-1/2' : 'w-2/3') 
    : 'w-full';

  const workspaceWidth = isWorkspaceExpanded ? 'w-1/2' : 'w-1/3';

  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden bg-[var(--background-main)]">
        <Sidebar
          childName={child?.name}
          onLogout={handleLogoutConfirmed}
          onClearChat={handleClearChat}
        />

        <main className={`flex-1 flex flex-col bg-[var(--background-card)] overflow-hidden transition-all duration-300 ${chatWidth}`}>
          <ChatHeader currentTopic={currentTopic} />

          {currentLessonContext && (
            <LessonContextBar
              lessonContext={currentLessonContext}
              onClose={() => setCurrentLessonContext(null)}
              onGetHelp={() => handleLessonHelp(currentLessonContext.lessonId, currentLessonContext.lessonTitle)}
            />
          )}

          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[var(--background-main)]">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  lessonContext={message.lessonContext}
                  onLessonClick={handleLessonHelp}
                  onSendToWorkspace={handleSendToWorkspace} 
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
                <div className="p-3 rounded-lg rounded-bl-md bg-[var(--accent-blue)]/20 text-[var(--text-primary)] shadow-sm">
                  <div className="loading-dots text-[var(--accent-blue)]">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} className="h-1"/>
          </div>
          
          {showSuggestions && suggestions.length > 0 && (
             <div className="w-full flex justify-center px-4 sm:px-6 pb-2 pt-1 border-t border-[var(--border-subtle)] bg-[var(--background-card)]">
                <div className="max-w-3xl w-full">
                    <SuggestionBubbles
                        suggestions={suggestions}
                        onSuggestionClick={handleSuggestionClick}
                    />
                </div>
            </div>
          )}

          <div className="bg-[var(--background-card)] p-3 sm:p-4 border-t border-[var(--border-subtle)]">
            <div className="max-w-3xl mx-auto">
                <ChatInput
                    onSendMessage={handleSendMessage}
                    isLoading={isLoading}
                />
            </div>
          </div>
        </main>

        <AnimatePresence>
          {workspaceContent && (
            <motion.div 
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`${workspaceWidth} bg-[var(--background-card)] border-l border-[var(--border-subtle)] transition-all duration-300`}
            >
              <WorkspacePanel 
                workspaceContent={workspaceContent}
                onToggleSize={handleToggleWorkspaceSize}
                isExpanded={isWorkspaceExpanded}
                onClose={() => setWorkspaceContent(null)}
                onSendToChat={handleWorkspaceToChat}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ProtectedRoute>
  );
}