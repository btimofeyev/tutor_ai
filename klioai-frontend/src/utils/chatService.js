// klioai-frontend/src/utils/chatService.js - Enhanced for Structured Responses
import axios from 'axios';
import { authService } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class ChatService {
  constructor() {
    this.api = axios.create({
      baseURL: `${API_URL}/api/chat`,
    });

    authService.setupAxiosInterceptors(this.api);
  }

  async sendMessage(message, sessionHistory = [], lessonContext = null) {
    try {
      
      const response = await this.api.post('/message', {
        message,
        sessionHistory: sessionHistory.slice(-50), // Increased from 10 to 50 messages
        lessonContext
      });


      // Enhanced response structure for function calling
      return {
        message: response.data.message,
        timestamp: response.data.timestamp,
        lessonContext: response.data.lessonContext,
        // NEW: Function calling results
        workspaceActions: response.data.workspaceActions || [],
        currentWorkspace: response.data.currentWorkspace || null,
        // Debug info
        debugInfo: response.data.debugInfo,
      };
    } catch (error) {
      console.error('❌ Function calling chat service error:', error);
      
      // Handle subscription-related errors
      if (error.response?.status === 403) {
        const errorData = error.response.data;
        
        if (errorData.code === 'AI_ACCESS_REQUIRED') {
          throw new Error('🔒 AI features require a subscription. Please ask your parent to upgrade your plan to continue using AI tutoring.');
        }
        
        throw new Error(errorData.error || 'Access denied. Please check your subscription status.');
      }
      
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error('Failed to send message. Please try again!');
    }
  }

  async getSuggestions() {
    try {
      const response = await this.api.get('/suggestions');
      return response.data;
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      
      // Handle subscription errors for suggestions
      if (error.response?.status === 403 && error.response?.data?.code === 'AI_ACCESS_REQUIRED') {
        return {
          success: true,
          suggestions: [
            "🔒 AI features require subscription",
            "Ask your parent to upgrade",
            "Contact support for help"
          ]
        };
      }
      
      return {
        success: true,
        suggestions: [
          "What are we learning today? 📚",
          "Can you help me? 🤔",
          "Let's practice! ✏️",
          "I need homework help 📝"
        ]
      };
    }
  }

  async getLessonHelp(lessonId) {
    try {
      const response = await this.api.get(`/lesson/${lessonId}/help`);
      return response.data.help;
    } catch (error) {
      console.error('Failed to get lesson help:', error);
      
      // Handle subscription errors for lesson help
      if (error.response?.status === 403 && error.response?.data?.code === 'AI_ACCESS_REQUIRED') {
        throw new Error('🔒 AI lesson help requires a subscription. Please ask your parent to upgrade your plan.');
      }
      
      throw new Error('Failed to get lesson help');
    }
  }

  async reportMessage(messageId, reason, content) {
    try {
      const response = await this.api.post('/report', {
        messageId,
        reason,
        content
      });
      return response.data;
    } catch (error) {
      console.error('Failed to report message:', error);
      throw new Error('Failed to report message');
    }
  }
}

export const chatService = new ChatService();