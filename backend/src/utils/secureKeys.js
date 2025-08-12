/**
 * Secure API Key Management
 * Provides rate limiting and monitoring for sensitive API keys
 */

const logger = require('./logger')('secureKeys');

class SecureKeyManager {
  constructor() {
    this.keyUsage = new Map();
    this.rateLimits = {
      openai: {
        requestsPerMinute: 60,
        costThreshold: 10.00 // $10 per hour threshold
      },
      supabase: {
        requestsPerMinute: 1000
      }
    };
  }

  /**
   * Get OpenAI API key with usage tracking
   */
  getOpenAIKey() {
    const key = process.env.OPENAI_API_KEY;
    
    if (!key) {
      throw new Error('OpenAI API key not configured');
    }

    if (!this.isValidOpenAIKey(key)) {
      throw new Error('Invalid OpenAI API key format');
    }

    this.trackUsage('openai');
    return key;
  }

  /**
   * Validate OpenAI API key format
   */
  isValidOpenAIKey(key) {
    return key.startsWith('sk-') || key.startsWith('sk-proj-');
  }

  /**
   * Get Supabase keys with validation
   */
  getSupabaseCredentials() {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    if (!url || !serviceKey) {
      throw new Error('Supabase credentials not properly configured');
    }

    if (!url.includes('supabase.co') && !url.includes('supabase.io')) {
      logger.warn('Supabase URL does not appear to be a standard Supabase URL');
    }

    return { url, serviceKey, anonKey };
  }

  /**
   * Track API key usage for monitoring
   */
  trackUsage(service) {
    const now = Date.now();
    const minuteKey = `${service}_${Math.floor(now / 60000)}`;
    
    if (!this.keyUsage.has(minuteKey)) {
      this.keyUsage.set(minuteKey, 0);
    }

    const currentUsage = this.keyUsage.get(minuteKey) + 1;
    this.keyUsage.set(minuteKey, currentUsage);

    // Check rate limits
    const limit = this.rateLimits[service]?.requestsPerMinute;
    if (limit && currentUsage > limit) {
      logger.error(`Rate limit exceeded for ${service}: ${currentUsage}/${limit} requests per minute`);
    }

    // Clean old usage data (older than 1 hour)
    const oneHourAgo = Math.floor((now - 3600000) / 60000);
    for (const [key] of this.keyUsage.entries()) {
      const keyTime = parseInt(key.split('_')[1]);
      if (keyTime < oneHourAgo) {
        this.keyUsage.delete(key);
      }
    }
  }

  /**
   * Get usage statistics
   */
  getUsageStats() {
    const stats = {};
    
    for (const [key, count] of this.keyUsage.entries()) {
      const [service] = key.split('_');
      if (!stats[service]) {
        stats[service] = { totalRequests: 0, minutes: 0 };
      }
      stats[service].totalRequests += count;
      stats[service].minutes++;
    }

    return stats;
  }

  /**
   * Mask sensitive values for logging
   */
  maskSensitiveValue(value, showChars = 4) {
    if (!value) return '[NOT SET]';
    if (value.length <= showChars * 2) return '*'.repeat(value.length);
    return value.substring(0, showChars) + '*'.repeat(value.length - showChars * 2) + value.substring(value.length - showChars);
  }

  /**
   * Log security status (safe for logs)
   */
  logSecurityStatus() {
    logger.info('🔐 Security Status Check:', {
      openaiConfigured: !!process.env.OPENAI_API_KEY,
      openaiFormat: this.isValidOpenAIKey(process.env.OPENAI_API_KEY || ''),
      supabaseConfigured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      jwtConfigured: !!process.env.JWT_SECRET,
      jwtLength: process.env.JWT_SECRET?.length || 0,
      nodeEnv: process.env.NODE_ENV,
      usageStats: this.getUsageStats()
    });
  }
}

// Export singleton
const keyManager = new SecureKeyManager();

// Log status on startup (but not in tests)
if (process.env.NODE_ENV !== 'test') {
  keyManager.logSecurityStatus();
}

module.exports = keyManager;