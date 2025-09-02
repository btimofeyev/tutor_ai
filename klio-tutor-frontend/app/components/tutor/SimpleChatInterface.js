'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FiSend, FiBook, FiUser, FiMessageCircle, FiLogOut, FiPlus, FiMenu, FiX, FiClock, FiTrash2 } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useAuth } from '../../contexts/AuthContext';

/**
 * SimpleChatInterface - Clean ChatGPT-like study assistant
 * Simple conversation interface focused on educational help
 */
const SimpleChatInterface = ({ childData }) => {
  const { logout } = useAuth();  // Add logout function
  const [messages, setMessages] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);
  const [lastResponseId, setLastResponseId] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  
  // Sidebar and conversation history state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, conversationId: null, conversationTitle: null });

  const messagesContainerRef = useRef(null);
  const sessionStartTime = useRef(Date.now());
  const initializingRef = useRef(false); // Prevent double initialization

  /**
   * Format relative time for conversation timestamps
   */
  const formatRelativeTime = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now - date) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    return date.toLocaleDateString();
  };

  // Add chat interface class to body to prevent page scrolling
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.body.classList.add('chat-interface');
      return () => {
        document.body.classList.remove('chat-interface');
      };
    }
  }, []);

  // Initialize session on mount - check for existing session first
  useEffect(() => {
    if (childData && typeof window !== 'undefined' && !initializingRef.current && !sessionId) {
      const token = localStorage.getItem('child_token');
      if (token) {
        console.log('Initializing session for child:', childData.name);
        initializingRef.current = true;
        
        // Check for existing session first
        const existingSessionId = sessionStorage.getItem('current_session_id');
        if (existingSessionId) {
          console.log('Restoring existing session:', existingSessionId);
          setSessionId(existingSessionId);
          // Restore conversation history
          restoreConversationHistory(existingSessionId);
          console.log('Session restored:', existingSessionId);
        } else {
          console.log('Creating new session');
          initializeSession();
        }
      } else {
        console.log('No token found, logging out...');
        logout();
      }
    }
  }, [childData]);

  // Restore session data on component mount
  useEffect(() => {
    if (sessionId && typeof window !== 'undefined') {
      // Restore response ID and conversation ID from session storage
      const storedResponseId = sessionStorage.getItem(`response_${sessionId}`);
      const storedConversationId = sessionStorage.getItem(`conversation_${sessionId}`);
      
      if (storedResponseId) {
        setLastResponseId(storedResponseId);
        console.log('Restored response ID:', storedResponseId);
      }
      
      if (storedConversationId) {
        setConversationId(storedConversationId);
        console.log('Restored conversation ID:', storedConversationId);
      }
    }
  }, [sessionId]);

  // Auto-scroll to bottom on new messages (but not when loading conversations)
  useEffect(() => {
    if (!loadingConversation) {
      scrollToBottom();
    }
  }, [messages, loadingConversation]);

  // Load conversation history when child data is available
  useEffect(() => {
    if (childData?.id && typeof window !== 'undefined') {
      loadConversationHistory();
      
      // Set current session as active if available
      const currentSessionId = sessionStorage.getItem('current_session_id');
      if (currentSessionId) {
        setActiveConversationId(currentSessionId);
      }
    }
  }, [childData]);

  const scrollToBottom = (smooth = true) => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      if (smooth) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      } else {
        container.scrollTop = container.scrollHeight;
      }
    }
  };

  /**
   * Restore conversation history from backend
   */
  const restoreConversationHistory = async (sessionId) => {
    try {
      console.log('🔄 Starting restoration for session:', sessionId);
      console.log('🔑 Token available:', !!localStorage.getItem('child_token'));
      console.log('🌍 API URL:', process.env.NEXT_PUBLIC_API_URL);
      
      // Set loading state to prevent auto-scroll interference
      setLoadingConversation(true);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tutor/session/${sessionId}/history`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('child_token')}`
        }
      });

      console.log('📡 API Response status:', response.status);
      console.log('📡 API Response ok:', response.ok);

      if (!response.ok) {
        if (response.status === 401) {
          console.log('🚫 Authentication failed during history restore, logging out...');
          setLoadingConversation(false);
          await logout();
          return;
        }
        const errorText = await response.text();
        console.error('❌ API Error response:', errorText);
        throw new Error(`API responded with ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('📦 API Response data:', data);
      console.log('📦 Conversation object:', data.conversation);
      console.log('📦 Messages array:', data.conversation?.messages);
      
      if (data.success && data.conversation && data.conversation.messages) {
        console.log(`📝 Restoring ${data.conversation.messages.length} messages`);
        console.log('📝 First message preview:', data.conversation.messages[0]);
        
        // Convert backend message format to frontend format
        const restoredMessages = data.conversation.messages.map((msg, index) => ({
          id: msg.id || `restored_${index}_${Date.now()}`,
          role: msg.role,
          content: msg.content,
          responseId: msg.responseId || null,
          timestamp: msg.timestamp || new Date().toISOString()
        }));
        
        console.log('🎯 Setting messages to state with length:', restoredMessages.length);
        console.log('🎯 Current messages state before set:', messages.length);
        setMessages(restoredMessages);
        
        // Scroll to bottom instantly after restoring conversation
        setTimeout(() => {
          scrollToBottom(false);
          setLoadingConversation(false);
        }, 100);
        
        console.log('✅ Successfully restored conversation history');
      } else {
        console.log('⚠️ No conversation history found or invalid format for session:', sessionId);
        console.log('⚠️ Data structure:', { success: data.success, hasConversation: !!data.conversation, hasMessages: !!data.conversation?.messages });
        setLoadingConversation(false);
      }
      
    } catch (error) {
      console.error('💥 Error restoring conversation history:', error);
      console.error('💥 Error details:', error.message);
      setLoadingConversation(false);
      // Don't show error to user - just start with empty conversation
    }
  };

  /**
   * Initialize chat session
   */
  const initializeSession = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tutor/session/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('child_token')}`
        },
        body: JSON.stringify({
          childId: childData.id
        })
      });

      if (!response.ok) {
        // If unauthorized, logout to return to login page
        if (response.status === 401) {
          console.log('Authentication failed, logging out...');
          await logout();
          return;
        }
        throw new Error('Failed to start session');
      }

      const data = await response.json();
      setSessionId(data.session_id);
      
      // Store session ID for persistence across refreshes
      sessionStorage.setItem('current_session_id', data.session_id);

      // Add welcome message from backend
      if (data.welcome_message) {
        addMessage('assistant', data.welcome_message, null);
      }

      console.log('Session initialized successfully:', data.session_id);

    } catch (error) {
      console.error('Error initializing session:', error);
      setError('Failed to start chat session. Please refresh the page.');
      initializingRef.current = false; // Reset flag on error
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Send message to AI
   */
  const sendMessage = async (message) => {
    if (!message.trim() || isLoading || !sessionId) return;

    try {
      setIsLoading(true);
      setError(null);
      
      // Add user message
      addMessage('user', message);
      setCurrentInput('');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tutor/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('child_token')}`
        },
        body: JSON.stringify({
          sessionId,
          message,
          childId: childData.id
        })
      });

      if (!response.ok) {
        // If unauthorized, logout to return to login page
        if (response.status === 401) {
          console.log('Authentication expired, logging out...');
          await logout();
          return;
        }
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      if (data.success && data.response) {
        addMessage('assistant', data.response, data.response_id);
        
        // Store response ID for chaining
        if (data.response_id) {
          setLastResponseId(data.response_id);
          sessionStorage.setItem(`response_${sessionId}`, data.response_id);
        }
        
        // Store conversation ID
        if (data.conversation_id) {
          setConversationId(data.conversation_id);
          sessionStorage.setItem(`conversation_${sessionId}`, data.conversation_id);
        }
      } else {
        throw new Error('Invalid response from AI');
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setError('I had trouble processing that. Could you try again?');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Add message to conversation with response ID tracking
   */
  const addMessage = (role, content, responseId = null) => {
    const message = {
      id: Date.now() + Math.random(),
      role,
      content,
      responseId,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, message]);
  };

  /**
   * Handle form submission
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(currentInput);
  };

  /**
   * Handle quick suggestion clicks
   */
  const handleSuggestion = (suggestion) => {
    sendMessage(suggestion);
  };

  /**
   * Toggle sidebar open/close
   */
  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  /**
   * Load conversation history for sidebar
   */
  const loadConversationHistory = async () => {
    if (!childData?.id) return;
    
    try {
      setLoadingHistory(true);
      console.log('📚 Loading conversation history...');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tutor/conversations/${childData.id}/recent`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('child_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setConversationHistory(data.conversations || []);
          console.log(`📚 Loaded ${data.conversations?.length || 0} conversation(s)`);
        }
      } else if (response.status !== 404) {
        console.warn('Failed to load conversation history:', response.status);
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  /**
   * Load a specific conversation
   */
  const loadConversation = async (conversationSessionId) => {
    try {
      console.log(`🔄 Loading conversation: ${conversationSessionId}`);
      
      // Set loading state to prevent auto-scroll interference
      setLoadingConversation(true);
      
      // Set as active
      setActiveConversationId(conversationSessionId);
      
      // Load the conversation messages
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tutor/session/${conversationSessionId}/history`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('child_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.conversation?.messages) {
          // Set messages and update current session
          setMessages(data.conversation.messages);
          setSessionId(conversationSessionId);
          
          // Update session storage
          sessionStorage.setItem('current_session_id', conversationSessionId);
          
          // Scroll to bottom instantly after loading conversation
          setTimeout(() => {
            scrollToBottom(false);
            setLoadingConversation(false);
          }, 100);
          
          console.log(`✅ Loaded ${data.conversation.messages.length} messages`);
        } else {
          setLoadingConversation(false);
        }
      } else {
        setLoadingConversation(false);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      setLoadingConversation(false);
    }
  };

  /**
   * Delete a conversation
   */
  const deleteConversation = async (conversationSessionId, conversationTitle, event) => {
    // Stop event propagation to prevent loading the conversation
    event.stopPropagation();
    
    // Show custom confirmation modal
    setDeleteModal({
      isOpen: true,
      conversationId: conversationSessionId,
      conversationTitle: conversationTitle
    });
  };

  const confirmDelete = async () => {
    const { conversationId } = deleteModal;
    
    try {
      console.log(`🗑️ Deleting conversation: ${conversationId}`);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tutor/conversation/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('child_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Remove from conversation history state
          setConversationHistory(prev => 
            prev.filter(conv => conv.session_id !== conversationId)
          );
          
          // If the deleted conversation was active, reset to current session
          if (activeConversationId === conversationId) {
            const currentSessionId = sessionStorage.getItem('current_session_id');
            setActiveConversationId(currentSessionId);
          }
          
          console.log('✅ Conversation deleted successfully');
        }
      } else {
        console.error('Failed to delete conversation:', response.status);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    } finally {
      // Close modal
      setDeleteModal({ isOpen: false, conversationId: null, conversationTitle: null });
    }
  };

  const cancelDelete = () => {
    setDeleteModal({ isOpen: false, conversationId: null, conversationTitle: null });
  };;

  /**
   * Start a new chat session
   */
  const startNewChat = async () => {
    try {
      console.log('🔄 Starting new chat...');
      
      // Clear current session state
      setMessages([]);
      setCurrentInput('');
      setError(null);
      setLastResponseId(null);
      setConversationId(null);
      
      // Clear session storage
      sessionStorage.removeItem('current_session_id');
      sessionStorage.removeItem(`response_${sessionId}`);
      sessionStorage.removeItem(`conversation_${sessionId}`);
      
      // Reset session ID to trigger new session creation
      setSessionId(null);
      
      // Reset active conversation
      setActiveConversationId(null);
      
      // Create a new session
      console.log('🆕 Creating fresh session...');
      await initializeSession();
      
      // Refresh conversation history to show the new chat
      await loadConversationHistory();
      
    } catch (error) {
      console.error('Error starting new chat:', error);
      setError('Failed to start new chat. Please refresh the page.');
    }
  };

  /**
   * Render individual message
   */
  const renderMessage = (message) => {
    const { role, content } = message;
    const isUser = role === 'user';

    return (
      <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
        <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Avatar */}
          <div className={`flex-shrink-0 ${isUser ? 'ml-3' : 'mr-3'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isUser ? 'bg-[#E88873]' : 'bg-[#7FB069]'
            }`}>
              {isUser ? (
                <FiUser className="text-white" size={16} />
              ) : (
                <FiMessageCircle className="text-white" size={16} />
              )}
            </div>
          </div>

          {/* Message bubble */}
          <div className={`px-4 py-3 rounded-2xl shadow-sm border ${
            isUser 
              ? 'bg-[#E88873] text-white rounded-br-md border-[#E88873]/20' 
              : 'bg-white text-[#4A4A4A] rounded-bl-md border-[#7FB069]/20'
          }`}>
            {isUser ? (
              <div className="whitespace-pre-wrap">{content}</div>
            ) : (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    // Style code blocks
                    code: ({ node, inline, className, children, ...props }) => {
                      if (inline) {
                        return (
                          <code className="bg-[#F0F8ED] px-1 py-0.5 rounded text-sm font-mono" {...props}>
                            {children}
                          </code>
                        );
                      }
                      return (
                        <pre className="bg-[#4A4A4A] text-[#7FB069] p-3 rounded-xl overflow-x-auto">
                          <code {...props}>{children}</code>
                        </pre>
                      );
                    },
                    // Style blockquotes
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-blue-400 pl-4 italic text-gray-600">
                        {children}
                      </blockquote>
                    ),
                    // Style lists
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside space-y-1">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside space-y-1">{children}</ol>
                    )
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Quick suggestions for new chats
  const quickSuggestions = [
    "Help me with my math homework",
    "Explain this science concept",
    "Check my writing",
    "Practice problems for history"
  ];

  if (error && !sessionId) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-2">⚠️ Connection Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={initializeSession}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen max-h-screen bg-[#F5F2ED] overflow-hidden">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 overflow-hidden bg-[#EDE8E3] border-r border-[#D4CAC4] flex-shrink-0`}>
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-[#D4CAC4]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#4A4A4A]">Chats</h2>
              <button
                onClick={toggleSidebar}
                className="p-1 rounded-md hover:bg-gray-100 transition-colors"
              >
                <FiX size={18} className="text-[#7A7A7A]" />
              </button>
            </div>
          </div>

          {/* New Chat Button */}
          <div className="p-3">
            <button
              onClick={startNewChat}
              className="w-full flex items-center space-x-2 px-3 py-2 text-[#7FB069] hover:text-[#6B9A56] hover:bg-[#F0F8ED] rounded-xl transition-colors"
              disabled={isLoading}
            >
              <FiPlus size={16} />
              <span className="text-sm font-medium">New Chat</span>
            </button>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {loadingHistory ? (
              <div className="p-4">
                <div className="animate-pulse space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 bg-[#E5DDD6] rounded-xl"></div>
                  ))}
                </div>
              </div>
            ) : conversationHistory.length > 0 ? (
              <div className="p-2">
                {conversationHistory.map((conversation) => (
                  <div
                    key={conversation.session_id}
                    className={`group relative rounded-xl mb-2 transition-colors shadow-sm ${
                      activeConversationId === conversation.session_id
                        ? 'bg-white border border-[#7FB069]/20 shadow-md'
                        : 'bg-white/70 hover:bg-white hover:shadow-md'
                    }`}
                  >
                    <button
                      onClick={() => loadConversation(conversation.session_id)}
                      className="w-full text-left p-3 pr-10 rounded-xl"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-[#7FB069]"></div>
                        <div className="text-sm font-medium text-[#4A4A4A] truncate">
                          {conversation.title || 'Chat'}
                        </div>
                      </div>
                      <div className="text-xs text-[#8A8A8A] mt-1 flex items-center space-x-2 ml-4">
                        <FiClock size={12} />
                        <span>{formatRelativeTime(conversation.last_active)}</span>
                      </div>
                    </button>
                    
                    {/* Delete button - appears on hover */}
                    <button
                      onClick={(e) => deleteConversation(conversation.session_id, conversation.title, e)}
                      className="absolute top-3 right-3 p-1 rounded-md hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete conversation"
                    >
                      <FiTrash2 size={14} className="text-red-500 hover:text-red-700" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500 text-sm">
                No previous conversations
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#F5F2ED] min-h-0">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-[#D4CAC4] px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {!sidebarOpen && (
                <button
                  onClick={toggleSidebar}
                  className="p-2 rounded-md hover:bg-gray-100 transition-colors mr-3"
                  title="Show Chat History"
                >
                  <FiMenu size={20} className="text-gray-600" />
                </button>
              )}
              <FiBook className="text-[#7FB069] mr-3" size={24} />
              <div>
                <h1 className="text-xl font-bold text-[#4A4A4A]">
                  Study Chat with Klio
                </h1>
                <p className="text-[#7A7A7A] text-sm">
                  Your AI study assistant • Hi {childData.name}!
                </p>
              </div>
            </div>
            
            {/* Logout Button */}
            <button
              onClick={logout}
              className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Logout"
            >
              <FiLogOut size={18} />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 min-h-0">
          {messages.length === 0 && !isLoading ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎓</div>
              <h2 className="text-2xl font-bold text-[#4A4A4A] mb-2">Ready to Study!</h2>
              <p className="text-[#7A7A7A] mb-6">Ask me anything about your homework or schoolwork.</p>
              
              {/* Quick suggestions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg mx-auto">
                {quickSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestion(suggestion)}
                    className="p-3 text-left bg-white text-[#7FB069] rounded-xl hover:bg-[#F0F8ED] transition-colors shadow-sm border border-[#7FB069]/20"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map(renderMessage)}
              {isLoading && (
                <div className="flex justify-start mb-6">
                  <div className="flex max-w-[80%]">
                    <div className="flex-shrink-0 mr-3">
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                        <FiMessageCircle className="text-white" size={16} />
                      </div>
                    </div>
                    <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <div className="animate-pulse flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                        <span className="text-gray-500 text-sm">Klio is thinking...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          
          {error && sessionId && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg mb-4 text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-white/80 backdrop-blur-sm border-t border-[#D4CAC4] px-6 py-4 shadow-sm">
          <form onSubmit={handleSubmit} className="flex items-center space-x-3">
            <input
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              placeholder="Ask me about your homework..."
              className="flex-1 border border-[#D4CAC4] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#7FB069] focus:border-[#7FB069] disabled:bg-[#F0F0F0] bg-white shadow-sm"
              disabled={isLoading || !sessionId}
            />
            <button
              type="submit"
              disabled={isLoading || !currentInput.trim() || !sessionId}
              className="bg-[#7FB069] text-white p-3 rounded-xl hover:bg-[#6B9A56] disabled:bg-[#D4CAC4] transition-colors shadow-sm"
            >
              <FiSend size={20} />
            </button>
          </form>
          
          <div className="text-xs text-[#8A8A8A] mt-2 text-center">
            Klio can help with math, science, writing, history, and more!
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-xl border border-[#D4CAC4]">
            <h3 className="text-lg font-semibold text-[#4A4A4A] mb-2">
              Delete Conversation
            </h3>
            <p className="text-[#7A7A7A] mb-4">
              Are you sure you want to delete "<span className="font-medium">{deleteModal.conversationTitle}</span>"?
            </p>
            <p className="text-sm text-[#8A8A8A] mb-6">
              This action cannot be undone.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-[#7A7A7A] hover:text-[#4A4A4A] hover:bg-[#F0F8ED] rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-[#E88873] text-white hover:bg-[#D6776B] rounded-xl transition-colors shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleChatInterface;
