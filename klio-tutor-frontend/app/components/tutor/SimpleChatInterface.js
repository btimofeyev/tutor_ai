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

  // Learning context state for enhanced AI tutoring
  const [learningContext, setLearningContext] = useState(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const [contextError, setContextError] = useState(null);
  
  // Dynamic quick suggestions based on learning context
  const [quickSuggestions, setQuickSuggestions] = useState([
    "Help me with my homework",
    "Explain this concept",
    "Practice problems",
    "Check my progress"
  ]);

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

  // Load conversation history and learning context when child data is available
  useEffect(() => {
    if (childData?.id && typeof window !== 'undefined') {
      loadConversationHistory();
      fetchLearningContext();
      
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

      // Skip welcome message - let ReadyToStudyInterface handle initial display
      // The welcome_message from backend is no longer needed as we show assignment cards instead

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

      // Detect if student is asking about a specific problem
      const problemNumber = detectProblemReference(message);
      if (problemNumber && learningContext?.hasActiveWork) {
        // Find the first available assignment to track problem attempts
        let currentMaterial = null;
        if (learningContext.upcoming && learningContext.upcoming.length > 0) {
          currentMaterial = learningContext.upcoming[0];
        } else if (learningContext.currentWork && learningContext.currentWork.length > 0) {
          currentMaterial = learningContext.currentWork[0];
        } else if (learningContext.needsReview && learningContext.needsReview.length > 0) {
          currentMaterial = learningContext.needsReview[0];
        }
        
        if (currentMaterial?.id) {
          markProblemAttempted(currentMaterial.id, problemNumber);
        }
      }

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
   * Fetch learning context for the current child
   */
  const fetchLearningContext = async () => {
    if (!childData?.id) return;
    
    try {
      setLoadingContext(true);
      setContextError(null);
      console.log('🎓 Loading learning context...');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tutor/context/${childData.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('child_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('🔍 DEBUG: Raw context data received:', JSON.stringify(data.context, null, 2));
          console.log('🔍 DEBUG: Context structure:', {
            hasActiveWork: data.context?.hasActiveWork,
            upcoming: data.context?.upcoming?.length || 0,
            currentWork: data.context?.currentWork?.length || 0,
            needsReview: data.context?.needsReview?.length || 0,
            nextAssignments: data.context?.nextAssignments?.length || 0,
            rawUpcoming: data.context?.upcoming,
            rawCurrentWork: data.context?.currentWork,
            rawNeedsReview: data.context?.needsReview
          });
          
          setLearningContext(data.context);
          const totalAssignments = (data.context.upcoming?.length || 0) + (data.context.currentWork?.length || 0) + (data.context.needsReview?.length || 0);
          console.log(`🎓 Loaded learning context: ${totalAssignments} assignments (${data.context.upcoming?.length || 0} upcoming, ${data.context.currentWork?.length || 0} current, ${data.context.needsReview?.length || 0} review)`);
          
          // Update quick suggestions based on context
          updateQuickSuggestionsFromContext(data.context);
        }
      } else if (response.status === 404) {
        // No assignments found - this is normal
        console.log('📝 No current assignments found');
        setLearningContext(null);
      } else {
        console.warn('Failed to load learning context:', response.status);
        setContextError('Failed to load assignments');
      }
    } catch (error) {
      console.error('Error loading learning context:', error);
      setContextError('Error loading assignments');
    } finally {
      setLoadingContext(false);
    }
  };

  /**
   * Update quick suggestions based on learning context
   */
  const updateQuickSuggestionsFromContext = (context) => {
    if (context && context.hasActiveWork) {
      // Prioritize upcoming assignments for suggestions
      let current = null;
      if (context.upcoming && context.upcoming.length > 0) {
        current = context.upcoming[0];
      } else if (context.currentWork && context.currentWork.length > 0) {
        current = context.currentWork[0];
      } else if (context.needsReview && context.needsReview.length > 0) {
        current = context.needsReview[0];
      }
      
      if (current) {
        const assignmentTitle = current.title || 'Current Assignment';
        
        setQuickSuggestions([
          `Help with ${assignmentTitle}`,
          "What's my next assignment?",
          "I'm stuck on a problem",
          "Explain this lesson's concept"
        ]);
      } else {
        // Fallback when has active work but no specific assignments
        setQuickSuggestions([
          "Help me with my homework",
          "What should I work on?",
          "I need help with a problem",
          "Check my progress"
        ]);
      }
    } else {
      // Fallback to generic suggestions when no assignments
      setQuickSuggestions([
        "Help me with my homework",
        "Explain this concept", 
        "Practice problems",
        "Check my progress"
      ]);
    }
  };

  /**
   * Detect when student asks about specific problems
   */
  const detectProblemReference = (message) => {
    const problemPatterns = [
      /question (\d+)/i,
      /problem (\d+)/i,
      /number (\d+)/i,
      /#(\d+)/
    ];
    
    for (const pattern of problemPatterns) {
      const match = message.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }
    return null;
  };

  /**
   * Track when students attempt problems
   */
  const markProblemAttempted = async (materialId, problemNumber, isCorrect = null) => {
    if (!materialId || !problemNumber) return;
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tutor/problem-attempt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('child_token')}`
        },
        body: JSON.stringify({
          materialId,
          problemNumber,
          isCorrect,
          timeSpent: null, // Could be tracked with timestamps
          studentWork: null // Could include the actual work
        })
      });

      if (response.ok) {
        console.log(`📝 Tracked problem attempt: material ${materialId}, problem ${problemNumber}`);
      } else {
        console.warn('Failed to track problem attempt:', response.status);
      }
    } catch (error) {
      console.error('Error tracking problem attempt:', error);
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

  /**
   * AssignmentCard - Individual assignment display with modern styling
   */
  const AssignmentCard = ({ assignment, onSelect }) => {
    const subject = assignment.child_subjects?.subjects?.name || 'Unknown Subject';
    const lesson = assignment.lessons?.title || 'Assignment';
    
    // Simple muted pastel cards like reference image
    const getCardStyle = (status) => {
      switch (status) {
        case 'completed_today':
          return 'bg-green-50 border border-green-100/50';
        case 'need_review':
          return 'bg-orange-50 border border-orange-100/50';
        case 'available':
          return 'bg-blue-50 border border-blue-100/50';
        default:
          return 'bg-slate-50 border border-slate-100/50';
      }
    };

    const getStatusBadge = (status) => {
      switch (status) {
        case 'completed_today':
          return 'text-green-700 text-xs font-normal';
        case 'need_review':
          return 'text-orange-700 text-xs font-normal';
        case 'available':
          return 'text-blue-700 text-xs font-normal';
        default:
          return 'text-slate-600 text-xs font-normal';
      }
    };
    
    const getStatusText = (status) => {
      switch (status) {
        case 'completed_today': return 'Completed';
        case 'working_on': return 'In Progress';
        case 'need_review': return assignment.percentage ? `${assignment.percentage}%` : 'Review';
        case 'available': return 'Ready';
        default: return 'Available';
      }
    };

    const getActionButton = (status) => {
      switch (status) {
        case 'completed_today':
          return 'bg-green-100 hover:bg-green-200 text-green-700 border border-green-200';
        case 'need_review':
          return 'bg-orange-100 hover:bg-orange-200 text-orange-700 border border-orange-200';
        case 'available':
          return 'bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-200';
        default:
          return 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200';
      }
    };
    
    const getActionText = (status) => {
      switch (status) {
        case 'completed_today': return 'Review';
        case 'working_on': return 'Continue';
        case 'need_review': return 'Improve';
        case 'available': return 'Start';
        default: return 'Start';
      }
    };

    return (
      <div className={`rounded-lg p-3 transition-all duration-200 cursor-pointer group ${getCardStyle(assignment.status)}`}>
        {/* Header with status and subject badges */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`${getStatusBadge(assignment.status)}`}>
                {getStatusText(assignment.status)}
              </span>
              <span className="text-xs font-normal text-gray-500">
                {subject}
              </span>
            </div>
            <h3 className="font-normal text-gray-800 text-sm leading-tight">
              {assignment.title}
            </h3>
          </div>
        </div>
        
        {/* Grade display for review items */}
        {assignment.grade_value && assignment.grade_max_value && assignment.status === 'need_review' && (
          <div className="text-xs text-gray-600 mb-2">
            {assignment.grade_value}/{assignment.grade_max_value} ({Math.round((assignment.grade_value / assignment.grade_max_value) * 100)}%)
          </div>
        )}
        
        {/* Action button */}
        <button
          onClick={() => onSelect(assignment)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium ${getActionButton(assignment.status)} transition-colors`}
        >
          {getActionText(assignment.status)}
        </button>
      </div>
    );
  };

  /**
   * ReadyToStudyInterface - Shows assignments organized by status-based categories
   */
  const ReadyToStudyInterface = ({ learningContext, handleSuggestion, quickSuggestions }) => {
    // Handle both new and old data formats
    const upcomingAssignments = learningContext?.upcoming || [];
    const currentWorkAssignments = learningContext?.currentWork || [];
    const needsReviewAssignments = learningContext?.needsReview || [];
    
    // Fallback to old format if new format is empty
    const fallbackAssignments = learningContext?.nextAssignments || [];
    const hasNewFormat = upcomingAssignments.length > 0 || currentWorkAssignments.length > 0 || needsReviewAssignments.length > 0;
    const hasFallbackData = fallbackAssignments.length > 0;
    
    const hasUpcoming = upcomingAssignments.length > 0;
    const hasCurrentWork = currentWorkAssignments.length > 0;
    const hasNeedsReview = needsReviewAssignments.length > 0;
    const hasAssignments = hasNewFormat || hasFallbackData;
    
    console.log('🎨 DEBUG: ReadyToStudyInterface render data:', {
      hasNewFormat,
      hasFallbackData,
      hasAssignments,
      hasUpcoming,
      hasCurrentWork,
      hasNeedsReview,
      upcomingCount: upcomingAssignments.length,
      currentWorkCount: currentWorkAssignments.length,
      needsReviewCount: needsReviewAssignments.length,
      fallbackCount: fallbackAssignments.length
    });
    
    const handleAssignmentSelect = (assignment) => {
      const suggestion = `Help with ${assignment.title}`;
      handleSuggestion(suggestion);
    };

    return (
      <div className="py-8 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🎓</span>
          </div>
          <h2 className="text-2xl font-normal text-gray-700 mb-3">Ready to Study, {childData?.name || 'Student'}!</h2>
          <p className="text-slate-600 text-lg">What would you like to work on today?</p>
        </div>

        {hasAssignments ? (
          <>
            {/* Show new format if available, otherwise show fallback */}
            {hasNewFormat ? (
              <>
                {/* Upcoming Assignments - Next work to do */}
                {hasUpcoming && (
                  <div className="mb-10">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                        <span className="text-white text-lg">📅</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-normal text-gray-700">Upcoming Assignments</h3>
                        <p className="text-sm text-slate-500">Ready to start</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                      {upcomingAssignments.slice(0, 6).map((assignment, index) => (
                        <AssignmentCard 
                          key={assignment.id || index} 
                          assignment={{...assignment, status: 'available'}} 
                          onSelect={handleAssignmentSelect}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Fallback to old format */
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-600 mb-4 px-2 flex items-center">
                  <span className="text-blue-600 mr-2">📋</span>
                  Your Assignments
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {fallbackAssignments.slice(0, 6).map((assignment, index) => (
                    <AssignmentCard 
                      key={assignment.id || index} 
                      assignment={{...assignment, status: assignment.completed_at ? 'completed_today' : 'available'}} 
                      onSelect={handleAssignmentSelect}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Current Work - Recently completed */}
            {hasCurrentWork && (
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-white text-lg">✓</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-normal text-gray-700">Current Work (Recently Completed)</h3>
                    <p className="text-sm text-slate-500">Review and continue learning</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                  {learningContext.currentWork.slice(0, 4).map((assignment, index) => (
                    <AssignmentCard 
                      key={assignment.id || index} 
                      assignment={{...assignment, status: 'completed_today'}} 
                      onSelect={handleAssignmentSelect}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Needs Review - Low grades */}
            {hasNeedsReview && (
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <span className="text-white text-lg">⚠️</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-normal text-gray-700">Needs Review (Grades &lt; 80%)</h3>
                    <p className="text-sm text-slate-500">Let's improve these together</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {learningContext.needsReview.slice(0, 4).map((assignment, index) => {
                    const percentage = assignment.grade_value && assignment.grade_max_value 
                      ? Math.round((assignment.grade_value / assignment.grade_max_value) * 100)
                      : null;
                    return (
                      <AssignmentCard 
                        key={assignment.id || index} 
                        assignment={{...assignment, status: 'need_review', percentage}} 
                        onSelect={handleAssignmentSelect}
                      />
                    );
                  })}
                </div>
              </div>
            )}

          </>
        ) : (
          /* Fallback for no assignments */
          <div className="text-center">
            <p className="text-[#7A7A7A] mb-6">Ask me anything about your homework or schoolwork.</p>
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
        )}
      </div>
    );
  };


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
    <div className="flex h-screen max-h-screen bg-amber-50/30 overflow-hidden">
      {/* Educational Sidebar */}
      <div className={`${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 overflow-hidden bg-amber-50/30 border-r border-amber-200 flex-shrink-0`}>
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-5 border-b border-amber-200 bg-amber-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center">
                  <FiMessageCircle size={18} className="text-amber-700" />
                </div>
                <h2 className="text-lg font-semibold text-gray-700">Chats</h2>
              </div>
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg hover:bg-amber-100 transition-colors"
              >
                <FiX size={18} className="text-gray-500" />
              </button>
            </div>
          </div>

          {/* New Chat Button */}
          <div className="p-4">
            <button
              onClick={startNewChat}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-amber-50 text-gray-700 hover:text-gray-800 rounded-lg border border-amber-200 hover:border-amber-300 shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 font-medium"
              disabled={isLoading}
            >
              <FiPlus size={16} />
              <span className="font-medium">New Chat</span>
            </button>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {loadingHistory ? (
              <div className="p-4 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white/80 rounded-lg p-4 animate-pulse">
                    <div className="h-4 bg-amber-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-amber-100 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : conversationHistory.length > 0 ? (
              <div className="p-3 space-y-2">
                {conversationHistory.map((conversation) => (
                  <div
                    key={conversation.session_id}
                    className={`group relative rounded-lg transition-all duration-200 ${
                      activeConversationId === conversation.session_id
                        ? 'bg-amber-100/50 border border-amber-200 shadow-sm'
                        : 'bg-white/70 hover:bg-white hover:shadow-sm border border-transparent hover:border-amber-200/50'
                    }`}
                  >
                    <button
                      onClick={() => loadConversation(conversation.session_id)}
                      className="w-full text-left p-4 pr-12 rounded-lg"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-3 h-3 rounded-full mt-1 ${
                          activeConversationId === conversation.session_id 
                            ? 'bg-amber-500' 
                            : 'bg-gray-300 group-hover:bg-amber-400'
                        }`}></div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-800 truncate group-hover:text-gray-900">
                            {conversation.title || 'Chat'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                            <FiClock size={11} />
                            <span>{formatRelativeTime(conversation.last_active)}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                    
                    {/* Delete button - softer styling */}
                    <button
                      onClick={(e) => deleteConversation(conversation.session_id, conversation.title, e)}
                      className="absolute top-3 right-3 p-1.5 rounded-md bg-red-50 hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-all duration-200"
                      title="Delete conversation"
                    >
                      <FiTrash2 size={12} className="text-red-400 hover:text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FiMessageCircle size={24} className="text-amber-500" />
                </div>
                <div className="text-sm text-gray-500">No conversations yet</div>
                <div className="text-xs text-gray-400 mt-1">Start chatting to see your history here</div>
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
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-8 min-h-0 bg-amber-50/30">
          {messages.length === 0 && !isLoading ? (
            <ReadyToStudyInterface 
              learningContext={learningContext}
              handleSuggestion={handleSuggestion}
              quickSuggestions={quickSuggestions}
            />
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

        {/* Quick Actions - Above Input */}
        <div className="bg-amber-50/30 border-t border-amber-200 px-6 py-3">
          <div className="flex flex-wrap gap-2 justify-center max-w-3xl mx-auto">
            {[
              "What's next?",
              "Explain a concept",
              "Check progress",
              "I'm stuck"
            ].map((action, index) => (
              <button
                key={index}
                onClick={() => handleSuggestion(action)}
                className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-700 text-sm font-normal rounded-lg border border-gray-200 transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
        </div>

        {/* Educational Input Area */}
        <div className="bg-amber-50/30 border-t border-amber-200 px-6 py-4">
          <form onSubmit={handleSubmit} className="flex items-center gap-3 max-w-4xl mx-auto">
            <div className="flex-1 relative">
              <input
                type="text"
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                placeholder="Ask me about your homework..."
                className="w-full border border-amber-200 rounded-xl px-4 py-3 pr-12 focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 disabled:bg-amber-50 disabled:text-gray-400 bg-white shadow-sm text-base transition-colors"
                disabled={isLoading || !sessionId}
              />
              {currentInput && (
                <button
                  type="button"
                  onClick={() => setCurrentInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-amber-100 rounded-full transition-colors"
                >
                  <FiX size={16} className="text-gray-400" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading || !currentInput.trim() || !sessionId}
              className="bg-green-400 text-white p-3 rounded-xl hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <FiSend size={18} />
            </button>
          </form>
          
          <div className="text-xs text-gray-500 mt-3 text-center max-w-2xl mx-auto">
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
