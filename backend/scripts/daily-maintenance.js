// backend/scripts/daily-maintenance.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const BatchChatCleanup = require('./batch-chat-cleanup');
const conversationSummaryService = require('../src/services/conversationSummaryService');

/**
 * Daily maintenance script that:
 * 1. Runs batch cleanup to summarize and clean old messages
 * 2. Generates parent summaries for yesterday's conversations
 * 3. Cleans up expired parent notifications
 * 
 * This script should run every day at 2 AM via cron
 */
class DailyMaintenance {
  constructor() {
    this.startTime = new Date();
    this.results = {
      batchCleanup: null,
      parentSummaries: null,
      expiredCleaned: 0,
      errors: []
    };
  }

  async runDailyMaintenance() {
    console.log('🌅 Starting Daily Chat Maintenance');
    console.log(`📅 ${this.startTime.toISOString()}`);
    console.log('=' .repeat(50));
    
    try {
      // Step 1: Run batch cleanup (this processes old messages into summaries)
      await this.runBatchCleanup();
      
      // Step 2: Generate parent summaries for yesterday
      await this.generateYesterdaysSummaries();
      
      // Step 3: Clean up expired notifications
      await this.cleanupExpired();
      
      // Generate final report
      return this.generateReport();
      
    } catch (error) {
      console.error('❌ Fatal error:', error);
      this.results.errors.push({
        step: 'fatal',
        error: error.message
      });
      return this.generateReport();
    }
  }

  async runBatchCleanup() {
    try {
      console.log('\n🧹 Step 1: Batch cleanup (old messages → summaries)');
      console.log('-'.repeat(50));
      
      const cleanup = new BatchChatCleanup();
      const result = await cleanup.runBatchCleanup({ batchSize: 5 });
      
      this.results.batchCleanup = result;
      console.log(`✅ Processed ${result.childrenProcessed} children, created ${result.totalSummariesCreated || 0} summaries`);
      
      // Save cleanup report
      await cleanup.saveCleanupReport(result);
      
    } catch (error) {
      console.error('❌ Batch cleanup error:', error);
      this.results.errors.push({
        step: 'batch_cleanup',
        error: error.message
      });
    }
  }

  async generateYesterdaysSummaries() {
    try {
      console.log('\n📬 Step 2: Generate parent summaries for yesterday');
      console.log('-'.repeat(50));
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const result = await conversationSummaryService.generateDailySummaries(yesterday);
      
      this.results.parentSummaries = result;
      
      if (result) {
        console.log(`✅ Generated ${result.summariesGenerated} parent notifications`);
        if (result.summariesGenerated === 0 && result.totalChildren > 0) {
          console.log('   📝 Note: Some conversations were too short for meaningful summaries');
        }
      } else {
        console.log('📝 No conversations found for yesterday');
      }
      
    } catch (error) {
      console.error('❌ Parent summaries error:', error);
      this.results.errors.push({
        step: 'parent_summaries',
        error: error.message
      });
    }
  }

  async cleanupExpired() {
    try {
      console.log('\n🗑️ Step 3: Clean up expired notifications');
      console.log('-'.repeat(50));
      
      const count = await conversationSummaryService.cleanupExpiredNotifications();
      this.results.expiredCleaned = count;
      console.log(`✅ Removed ${count} expired notifications`);
      
    } catch (error) {
      console.error('❌ Cleanup expired error:', error);
      this.results.errors.push({
        step: 'cleanup_expired',
        error: error.message
      });
    }
  }

  generateReport() {
    const endTime = new Date();
    const duration = Math.round((endTime - this.startTime) / 1000);
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 DAILY MAINTENANCE COMPLETE');
    console.log('='.repeat(50));
    
    console.log(`⏱️  Duration: ${duration} seconds`);
    
    if (this.results.batchCleanup) {
      console.log(`🧹 Cleanup: ${this.results.batchCleanup.childrenProcessed} children, ${this.results.batchCleanup.totalSummariesCreated || 0} summaries`);
    }
    
    if (this.results.parentSummaries) {
      console.log(`📬 Parent notifications: ${this.results.parentSummaries.summariesGenerated} created`);
    }
    
    console.log(`🗑️ Expired notifications: ${this.results.expiredCleaned} removed`);
    
    if (this.results.errors.length > 0) {
      console.log(`🚨 Errors: ${this.results.errors.length}`);
      this.results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. [${error.step}] ${error.error}`);
      });
    } else {
      console.log('✅ No errors!');
    }
    
    console.log('\n🎉 Daily maintenance completed successfully!');
    
    return {
      startTime: this.startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationSeconds: duration,
      ...this.results
    };
  }
}

// CLI execution
if (require.main === module) {
  const maintenance = new DailyMaintenance();
  
  if (process.argv.includes('--help')) {
    console.log(`
🌅 Daily Chat Maintenance Script

This script handles all daily chat maintenance:
- Cleans up old messages by creating summaries
- Generates parent notifications for yesterday's chats  
- Removes expired notifications (>7 days old)

Usage:
  node daily-maintenance.js

Cron job (daily at 2 AM):
  0 2 * * * cd /path/to/backend && npm run maintenance >> logs/maintenance.log 2>&1

Options:
  --help    Show this help message
    `);
    process.exit(0);
  }
  
  maintenance.runDailyMaintenance()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = DailyMaintenance;