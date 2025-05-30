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
      console.log('📤 Sending message to structured chat endpoint...');
      
      const response = await this.api.post('/message', {
        message,
        sessionHistory: sessionHistory.slice(-10),
        lessonContext
      });

      console.log('📥 Received structured response:', {
        hasMessage: !!response.data.message,
        hasWorkspaceContent: !!response.data.workspaceContent,
        workspaceType: response.data.workspaceContent?.type,
        problemsCount: response.data.workspaceContent?.problems?.length
      });

      // Enhanced response structure
      return {
        message: response.data.message,
        timestamp: response.data.timestamp,
        lessonContext: response.data.lessonContext,
        // NEW: Structured workspace content
        workspaceContent: response.data.workspaceContent,
        // Debug info
        debugInfo: response.data.debugInfo,
        // Legacy compatibility
        workspaceHint: response.data.workspaceHint // Keep for backward compatibility
      };
    } catch (error) {
      console.error('❌ Structured chat service error:', error);
      
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