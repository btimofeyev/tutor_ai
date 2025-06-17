// backend/scripts/batch-chat-cleanup.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const chatHistoryService = require('../src/services/chatHistoryService');
const supabase = require('../src/utils/supabaseClient');

/**
 * Batch cleanup script for all children's chat messages
 * Run this script via cron job or manual execution
 */
class BatchChatCleanup {
  constructor() {
    this.startTime = new Date();
    this.stats = {
      childrenProcessed: 0,
      successfulCleanups: 0,
      failedCleanups: 0,
      totalMessagesCleaned: 0,
      totalSummariesCreated: 0,
      errors: []
    };
  }

  /**
   * Get all children that might need cleanup
   */
  async getChildrenForCleanup() {
    try {
      // Get children with recent chat activity
      const { data: children, error } = await supabase
        .from('children')
        .select(`
          id, 
          name,
          parent_id,
          chat_messages!inner(child_id)
        `)
        .gte('chat_messages.created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Active in last 7 days

      if (error) {
        console.error('Error fetching children:', error);
        return [];
      }

      // Remove duplicates and return unique children
      const uniqueChildren = children.filter((child, index, self) => 
        index === self.findIndex(c => c.id === child.id)
      );

      return uniqueChildren;
    } catch (error) {
      console.error('Error in getChildrenForCleanup:', error);
      return [];
    }
  }

  /**
   * Process cleanup for a single child
   */
  async processChildCleanup(child) {
    try {
      console.log(`\\n🧒 Processing child: ${child.name} (${child.id})`);
      
      // Get current cleanup status
      const status = await chatHistoryService.getCleanupStatus(child.id);
      
      if (!status) {
        throw new Error('Could not get cleanup status');
      }

      console.log(`📊 Current status: ${status.currentMessages} messages, ${status.summaries} summaries`);
      
      if (!status.needsCleanup) {
        console.log(`✅ Child ${child.name} does not need cleanup`);
        return { success: true, action: 'no_cleanup_needed', child: child.name };
      }

      // Perform cleanup
      const result = await chatHistoryService.scheduleCleanup(child.id, { force: false });
      
      if (result.success) {
        this.stats.totalSummariesCreated += result.summarized || 0;
        console.log(`✅ Cleanup completed for ${child.name}`);
        return { success: true, ...result, child: child.name };
      } else {
        throw new Error(result.error || 'Unknown cleanup error');
      }
      
    } catch (error) {
      console.error(`❌ Error processing child ${child.name}:`, error.message);
      this.stats.errors.push({
        childId: child.id,
        childName: child.name,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return { success: false, child: child.name, error: error.message };
    }
  }

  /**
   * Run batch cleanup for all children
   */
  async runBatchCleanup(options = {}) {
    console.log('🚀 Starting batch chat message cleanup...');
    console.log(`📅 Timestamp: ${this.startTime.toISOString()}`);
    
    try {
      // Get children to process
      const children = await this.getChildrenForCleanup();
      console.log(`👨‍👩‍👧‍👦 Found ${children.length} children with recent chat activity`);
      
      if (children.length === 0) {
        console.log('✅ No children found requiring cleanup');
        return this.generateSummaryReport();
      }

      // Process children in batches to avoid overwhelming the system
      const batchSize = options.batchSize || 5;
      const batches = [];
      
      for (let i = 0; i < children.length; i += batchSize) {
        batches.push(children.slice(i, i + batchSize));
      }

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`\\n📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} children)`);
        
        // Process batch in parallel with controlled concurrency
        const batchPromises = batch.map(child => this.processChildCleanup(child));
        const results = await Promise.all(batchPromises);
        
        // Update stats
        results.forEach(result => {
          this.stats.childrenProcessed++;
          if (result.success) {
            this.stats.successfulCleanups++;
          } else {
            this.stats.failedCleanups++;
          }
        });

        // Small delay between batches to be gentle on the system
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      return this.generateSummaryReport();
      
    } catch (error) {
      console.error('❌ Fatal error during batch cleanup:', error);
      this.stats.errors.push({
        type: 'fatal_error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return this.generateSummaryReport();
    }
  }

  /**
   * Generate cleanup summary report
   */
  generateSummaryReport() {
    const endTime = new Date();
    const duration = Math.round((endTime - this.startTime) / 1000);
    
    const report = {
      startTime: this.startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationSeconds: duration,
      ...this.stats
    };

    console.log('\\n📋 === BATCH CLEANUP SUMMARY REPORT ===');
    console.log(`⏱️  Duration: ${duration} seconds`);
    console.log(`👥 Children processed: ${this.stats.childrenProcessed}`);
    console.log(`✅ Successful cleanups: ${this.stats.successfulCleanups}`);
    console.log(`❌ Failed cleanups: ${this.stats.failedCleanups}`);
    console.log(`📝 Summaries created: ${this.stats.totalSummariesCreated}`);
    
    if (this.stats.errors.length > 0) {
      console.log(`\\n🚨 Errors encountered:`);
      this.stats.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.childName || 'System'}: ${error.error}`);
      });
    }
    
    console.log('\\n✅ Batch cleanup completed');
    return report;
  }

  /**
   * Save cleanup report to database for monitoring
   */
  async saveCleanupReport(report) {
    try {
      await supabase
        .from('chat_cleanup_reports')
        .insert([{
          report_date: report.startTime,
          duration_seconds: report.durationSeconds,
          children_processed: report.childrenProcessed,
          successful_cleanups: report.successfulCleanups,
          failed_cleanups: report.failedCleanups,
          summaries_created: report.totalSummariesCreated,
          errors: report.errors,
          created_at: new Date().toISOString()
        }]);
      
      console.log('📊 Cleanup report saved to database');
    } catch (error) {
      console.error('Error saving cleanup report:', error);
    }
  }
}

// CLI execution
if (require.main === module) {
  const cleanup = new BatchChatCleanup();
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const options = {};
  
  if (args.includes('--batch-size')) {
    const batchSizeIndex = args.indexOf('--batch-size');
    options.batchSize = parseInt(args[batchSizeIndex + 1]) || 5;
  }
  
  if (args.includes('--help')) {
    console.log(`
Usage: node batch-chat-cleanup.js [options]

Options:
  --batch-size <number>    Number of children to process in parallel (default: 5)
  --help                   Show this help message

Examples:
  node batch-chat-cleanup.js
  node batch-chat-cleanup.js --batch-size 3
    `);
    process.exit(0);
  }
  
  cleanup.runBatchCleanup(options)
    .then(report => {
      return cleanup.saveCleanupReport(report);
    })
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = BatchChatCleanup;