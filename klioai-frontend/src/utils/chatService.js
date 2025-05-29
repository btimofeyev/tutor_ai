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
        sessionHistory: sessionHistory.slice(-10),
        lessonContext
      });
  
      return {
        ...response.data,
        workspaceHint: response.data.workspaceHint // Pass through workspace hint
      };
    } catch (error) {
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