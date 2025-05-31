// klioai-frontend/src/utils/progressService.js
import axios from 'axios';
import { authService } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class ProgressService {
  constructor() {
    this.api = axios.create({
      baseURL: `${API_URL}/api/progress`,
    });

    authService.setupAxiosInterceptors(this.api);
  }

  // Start a new practice session
  async startSession(sessionType = 'practice', problemsCount = 0) {
    try {
      const response = await this.api.post('/sessions/start', {
        session_type: sessionType,
        problems_count: problemsCount
      });
      return response.data;
    } catch (error) {
      console.error('Failed to start practice session:', error);
      throw error;
    }
  }

  // Record a problem attempt
  async recordAttempt(sessionId, problemText, isCorrect, studentWork = null, problemType = 'general', timeSpent = null) {
    try {
      const response = await this.api.post('/attempts', {
        session_id: sessionId,
        problem_text: problemText,
        is_correct: isCorrect,
        student_work: studentWork,
        problem_type: problemType,
        time_spent_seconds: timeSpent
      });
      return response.data;
    } catch (error) {
      console.error('Failed to record attempt:', error);
      throw error;
    }
  }

  // Get current session stats
  async getSessionStats(sessionId) {
    try {
      const response = await this.api.get(`/sessions/${sessionId}/stats`);
      return response.data;
    } catch (error) {
      console.error('Failed to get session stats:', error);
      throw error;
    }
  }

  // End practice session
  async endSession(sessionId) {
    try {
      const response = await this.api.post(`/sessions/${sessionId}/end`);
      return response.data;
    } catch (error) {
      console.error('Failed to end session:', error);
      throw error;
    }
  }

  // Get overall child progress
  async getChildProgress(childId = null) {
    try {
      const url = childId ? `/child/${childId}` : '/child';
      const response = await this.api.get(url);
      return response.data;
    } catch (error) {
      console.error('Failed to get child progress:', error);
      throw error;
    }
  }
}

export const progressService = new ProgressService();