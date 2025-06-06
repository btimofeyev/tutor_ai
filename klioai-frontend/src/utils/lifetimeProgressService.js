// Lifetime Progress Service for fetching child progress stats
import { authService } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class LifetimeProgressService {
  constructor() {
    this.api = authService.createAxiosInstance(`${API_URL}/api/progress`);
  }

  async getLifetimeStats() {
    try {
      const response = await this.api.get('/lifetime');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch lifetime progress:', error);
      throw new Error('Failed to fetch progress stats');
    }
  }

  // Format progress for display
  formatProgressMessage(stats) {
    const { lifetime_correct, current_streak, best_streak } = stats;
    
    const messages = [];
    
    if (lifetime_correct > 0) {
      messages.push(`${lifetime_correct} problems solved! 🎯`);
    }
    
    if (current_streak > 0) {
      if (current_streak === best_streak && current_streak > 1) {
        messages.push(`${current_streak}-problem streak (personal best!) 🔥`);
      } else if (current_streak > 1) {
        messages.push(`${current_streak}-problem streak! 🔥`);
      }
    }
    
    if (best_streak > current_streak && best_streak > 1) {
      messages.push(`Best streak: ${best_streak}`);
    }
    
    return messages.join(' • ');
  }

  // Get achievement message for milestones
  getAchievementMessage(stats) {
    const { lifetime_correct, current_streak, best_streak } = stats;
    
    // Milestone achievements
    if (lifetime_correct === 1) return "First problem solved! 🎉";
    if (lifetime_correct === 10) return "10 problems mastered! 🌟";
    if (lifetime_correct === 50) return "50 problems conquered! 🏆";
    if (lifetime_correct === 100) return "100 problems dominated! 👑";
    if (lifetime_correct % 100 === 0 && lifetime_correct > 100) return `${lifetime_correct} problems! You're unstoppable! 🚀`;
    
    // Streak achievements
    if (current_streak === 5) return "5 in a row! You're on fire! 🔥";
    if (current_streak === 10) return "10 straight! Incredible! ⚡";
    if (current_streak === 20) return "20 streak! Math genius! 🧠";
    if (current_streak > 20 && current_streak % 10 === 0) return `${current_streak} streak! Absolutely legendary! 👑`;
    
    return null;
  }
}

export const lifetimeProgressService = new LifetimeProgressService();