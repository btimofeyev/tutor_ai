// klioai-frontend/src/app/chat/page.js - Enhanced with Structured Workspace and Progress Tracking
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
import SimpleWorkspace from '../../components/SimpleWorkspace';
import { useAuth } from '../../contexts/AuthContext'; 
import { useSubscription } from '../../contexts/SubscriptionContext';
import PaywallOverlay from '../../components/PaywallOverlay';
import { chatService } from '../../utils/chatService';
import { analyzeKlioResponse } from '../../utils/workspaceProgress';
import { WorkspaceActionProcessor } from '../../utils/workspaceActionProcessor';

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
  
  // Learning stats state
  const [learningStats, setLearningStats] = useState({
    streak: 0,
    todaysPracticeCount: 0,
    totalCorrectAnswers: 0
  });
  
  // Workspace state
  const [workspaceContent, setWorkspaceContent] = useState(null);
  const [isWorkspaceExpanded, setIsWorkspaceExpanded] = useState(false);
  const workspaceRef = useRef(null); // Reference to workspace component
  
  // 🧠 NEW: Adaptive Intelligence State - Focus on tutoring quality
  const [adaptiveData, setAdaptiveData] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [dynamicSuggestions, setDynamicSuggestions] = useState([]);
  
  // 🎯 Enhanced Workspace State
  const [workspaceActivity, setWorkspaceActivity] = useState(Date.now());
  const [workspacePreferences, setWorkspacePreferences] = useState({
    autoCollapse: true,
    preferredSize: 'adaptive'
  });
  
  // Add workspace action processor
  const workspaceActionProcessorRef = useRef(null);
  const currentChildIdRef = useRef(null);

  // Initialize workspace action processor
  useEffect(() => {
    workspaceActionProcessorRef.current = new WorkspaceActionProcessor(
      setWorkspaceContent,
      workspaceRef
    );
  }, []);

  // Clear session data when child changes (user switching)
  useEffect(() => {
    if (child?.id && currentChildIdRef.current && currentChildIdRef.current !== child.id) {
      console.log(`🔄 Child changed from ${currentChildIdRef.current} to ${child.id} - clearing chat`);
      // Reset chat state for new user
      setMessages([]);
      setWorkspaceContent(null);
      setCurrentLessonContext(null);
      setCurrentTopic("General Conversation");
      setShowSuggestions(true);
    }
    currentChildIdRef.current = child?.id;
  }, [child?.id]);

  // Load initial messages - FIXED: child-specific storage
  useEffect(() => {
    if (!child?.id) return; // Wait for child data
    
    const childSpecificKey = `klio_chat_history_${child.id}`;
    const savedMessages = sessionStorage.getItem(childSpecificKey);
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
  }, [child?.name, child?.id]);

  // Load suggestions and learning stats
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [suggestionsData, statsData] = await Promise.all([
          chatService.getSuggestions(),
          fetchLearningStats()
        ]);
        
        setSuggestions(suggestionsData.suggestions || INITIAL_SUGGESTIONS);
        if (statsData) setLearningStats(statsData);
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
        setSuggestions(INITIAL_SUGGESTIONS);
      }
    };
    
    if (child?.id) {
      fetchInitialData();
    }
  }, [child?.id]);

  // Fetch learning stats
  const fetchLearningStats = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/progress/lifetime`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('klio_access_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          streak: data.current_streak || 0,
          todaysPracticeCount: data.today_count || 0,
          totalCorrectAnswers: data.lifetime_correct || 0
        };
      }
    } catch (error) {
      console.error('Failed to fetch learning stats:', error);
    }
    return null;
  };

  // Save messages to session storage - FIXED: child-specific storage
  useEffect(() => {
    if (messages.length > 0 && child?.id) {
      const childSpecificKey = `klio_chat_history_${child.id}`;
      sessionStorage.setItem(childSpecificKey, JSON.stringify(messages));
    }
  }, [messages, child?.id]);

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

  // REMOVED: handleStructuredWorkspaceContent - now handled by function calling

  // LEGACY: Handle workspace content for backward compatibility
  const handleSendToWorkspace = (message, structuredContent = null) => {
    console.log('🔄 Processing legacy workspace request');
    
    // For function calling, this is mostly used for manual workspace creation
    const problems = [];
    
    // Look for simple patterns like "7 + 5" or "What is 7 + 5?"
    const simplePattern = /what\s+is\s+(\d+\s*[\+\-\*×÷\/]\s*\d+)/gi;
    const matches = message.content.match(simplePattern);
    
    if (matches) {
      matches.forEach((match, index) => {
        const cleanMatch = match.replace(/what\s+is\s+/i, '').trim();
        problems.push({
          id: `legacy-problem-${index}`,
          text: cleanMatch,
          type: 'arithmetic',
          hint: 'Work through this step by step!',
          isLegacy: true
        });
      });
    }

    if (problems.length > 0) {
      const legacyContent = {
        type: 'math_problems',
        problems: problems
      };
      console.log('📋 Setting legacy workspace content:', legacyContent);
      setWorkspaceContent(legacyContent);
    } else {
      console.log('❌ No workspace content found in any method');
    }
  };

  const handleWorkspaceToChat = (message) => {
    setWorkspaceActivity(Date.now()); // Track workspace activity
    handleSendMessage(message);
  };

  // 🎯 Auto-collapse workspace after inactivity
  useEffect(() => {
    if (!workspaceContent || !workspacePreferences.autoCollapse) return;

    const checkInactivity = () => {
      const timeSinceActivity = Date.now() - workspaceActivity;
      const inactivityThreshold = studentProfile?.confidence_level === 'low' ? 180000 : 300000; // 3-5 minutes
      
      if (timeSinceActivity > inactivityThreshold && !isWorkspaceExpanded) {
        setWorkspaceContent(null);
      }
    };

    const interval = setInterval(checkInactivity, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [workspaceContent, workspaceActivity, workspacePreferences.autoCollapse, studentProfile, isWorkspaceExpanded]);

  // Track workspace interaction
  const handleWorkspaceInteraction = () => {
    setWorkspaceActivity(Date.now());
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
      // ENHANCED: Use function calling chat service with expanded context
      const response = await chatService.sendMessage(messageText, messages.slice(-50), currentLessonContext);

      // Process response with adaptive intelligence

      // 🧠 Process Adaptive Intelligence Data - Focus on tutoring quality
      if (response.adaptiveIntelligence) {
        // Apply adaptive intelligence to UI
        
        setAdaptiveData(response.adaptiveIntelligence);
        setStudentProfile(response.adaptiveIntelligence.studentProfile);
        
        // Update dynamic suggestions based on student profile and needs
        if (response.adaptiveIntelligence.contextualSuggestions) {
          setDynamicSuggestions(response.adaptiveIntelligence.contextualSuggestions);
        }
      }

      const klioMessage = {
        id: `msg-${Date.now()}-klio`,
        role: 'klio',
        content: response.message,
        timestamp: response.timestamp || new Date().toISOString(),
        lessonContext: response.lessonContext || null,
        // NEW: Store function calling results
        workspaceActions: response.workspaceActions || [],
        currentWorkspace: response.currentWorkspace || null,
        // NEW: Store adaptive intelligence data
        adaptiveIntelligence: response.adaptiveIntelligence || null,
      };
      
      setMessages(prev => [...prev, klioMessage]);

      // Handle lesson context
      if (response.lessonContext) {
        setCurrentLessonContext(response.lessonContext);
      }

      // ENHANCED: Process function calling workspace actions
      if (response.workspaceActions && response.workspaceActions.length > 0) {
        console.log('🎯 Processing workspace actions from function calls');
        
        const processor = workspaceActionProcessorRef.current;
        if (processor) {
          const updatedWorkspace = processor.processWorkspaceActions(
            response.workspaceActions,
            response.currentWorkspace
          );
          
          // Update learning stats if any problems were marked correct
          const correctActions = response.workspaceActions.filter(action => action.action === 'mark_correct') || [];
          if (correctActions.length > 0) {
            console.log(`🎉 ${correctActions.length} problems marked correct - updating stats`);
            // Refresh stats to show progress
            fetchLearningStats().then(stats => {
              if (stats) setLearningStats(stats);
            });
          }
          
          console.log('✅ Workspace updated via function calls');
        }
      } else {
        console.log('📝 No workspace actions in response');
      }

      // REMOVED: Auto-progress detection (now handled by function calls)
      // The LLM now explicitly calls mark_problem_correct/incorrect functions

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

  const handleLessonHelp = async (lessonId, lessonTitle) => {
    setIsLoading(true);
    try {
      await handleSendMessage(`Can you help me with "${lessonTitle}"?`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => handleSendMessage(suggestion);

  // New Chat function - clears current chat and starts fresh
  const handleNewChat = () => {
    if (!child?.id) return;
    
    const welcomeMessage = {
      id: 'welcome-new',
      role: 'klio',
      content: `Hi ${child.name}! 👋 Ready for a new learning session? What would you like to explore today?`,
      timestamp: new Date().toISOString()
    };
    
    setMessages([welcomeMessage]);
    setShowSuggestions(true);
    setCurrentTopic("General Conversation");
    setCurrentLessonContext(null);
    setWorkspaceContent(null);
    
    // Clear child-specific storage
    const childSpecificKey = `klio_chat_history_${child.id}`;
    sessionStorage.setItem(childSpecificKey, JSON.stringify([welcomeMessage]));
    
    console.log('🆕 Started new chat session');
  };

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
      // Clear any sensitive session data before logout
      if (child?.id) {
        console.log(`🧹 Logging out child ${child.id}`);
        // Note: We keep chat history in sessionStorage so they can continue where they left off
        // If we wanted to clear it: sessionStorage.removeItem(`klio_chat_history_${child.id}`);
      }
      await logout();
    }
  };

  const handleToggleWorkspaceSize = () => {
    setIsWorkspaceExpanded(!isWorkspaceExpanded);
  };

  // 🧠 Adaptive workspace sizing based on student confidence and needs
  const getAdaptiveWorkspaceSize = () => {
    if (!workspaceContent) return { chat: 'w-full', workspace: 'w-1/3' };
    
    // Base size on manual expansion first
    if (isWorkspaceExpanded) {
      return { chat: 'w-1/2', workspace: 'w-1/2' };
    }
    
    // Adapt based on student profile
    if (studentProfile) {
      const { confidence_level, response_patterns } = studentProfile;
      
      // Low confidence students get more chat guidance, smaller workspace
      if (confidence_level === 'low' || response_patterns?.tends_to_give_up) {
        return { chat: 'w-3/4', workspace: 'w-1/4' };
      }
      
      // High confidence students get more workspace independence
      if (confidence_level === 'high' && !response_patterns?.asks_for_help) {
        return { chat: 'w-1/2', workspace: 'w-1/2' };
      }
    }
    
    // Default balanced layout
    return { chat: 'w-2/3', workspace: 'w-1/3' };
  };

  const { chat: chatWidth, workspace: workspaceWidth } = getAdaptiveWorkspaceSize();

  return (
    <ProtectedRoute>
      <PaywallOverlay feature="AI Tutoring">
        <div className="flex h-screen overflow-hidden bg-[var(--background-main)]">
        <Sidebar
          childName={child?.name}
          onLogout={handleLogoutConfirmed}
          onClearChat={handleClearChat}
          onQuickAction={handleSendMessage}
        />

        <main className={`flex-1 flex flex-col bg-[var(--background-card)] overflow-hidden transition-all duration-300 ${chatWidth}`}>
          <ChatHeader 
            learningStreak={learningStats.streak}
            todaysPracticeCount={learningStats.todaysPracticeCount}
          />

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
                  // NEW: Pass structured workspace content
                  hasStructuredWorkspace={!!message.workspaceContent}
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
          
          {showSuggestions && (suggestions.length > 0 || dynamicSuggestions.length > 0) && (
             <div className="w-full flex justify-center px-4 sm:px-6 pb-2 pt-1 border-t border-[var(--border-subtle)] bg-[var(--background-card)]">
                <div className="max-w-3xl w-full">
                    <SuggestionBubbles
                        suggestions={dynamicSuggestions.length > 0 ? dynamicSuggestions : suggestions}
                        onSuggestionClick={handleSuggestionClick}
                        isAdaptive={dynamicSuggestions.length > 0}
                        studentProfile={studentProfile}
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

        <AnimatePresence mode="wait">
          {workspaceContent && (
            <motion.div 
              initial={{ 
                x: '100%', 
                opacity: 0,
                scale: 0.95
              }}
              animate={{ 
                x: 0, 
                opacity: 1,
                scale: 1
              }}
              exit={{ 
                x: '100%', 
                opacity: 0,
                scale: 0.95
              }}
              transition={{ 
                type: 'spring', 
                stiffness: 200, 
                damping: 25,
                duration: 0.4
              }}
              className={`${workspaceWidth} bg-[var(--background-card)] border-l-2 border-[var(--accent-blue)] transition-all duration-500 ease-in-out shadow-xl`}
            >
              <SimpleWorkspace 
                workspaceContent={workspaceContent}
                isExpanded={isWorkspaceExpanded}
                onClose={() => setWorkspaceContent(null)}
                onSendToChat={handleWorkspaceToChat}
                onInteraction={handleWorkspaceInteraction}
                studentProfile={studentProfile}
                adaptiveData={adaptiveData}
                ref={workspaceRef}
              />
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </PaywallOverlay>
    </ProtectedRoute>
  );
}