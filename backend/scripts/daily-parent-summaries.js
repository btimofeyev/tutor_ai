// backend/scripts/daily-parent-summaries.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const conversationSummaryService = require('../src/services/conversationSummaryService');

/**
 * Simple daily script to generate parent summaries for yesterday's conversations
 * This should be run every day at 2 AM via cron
 */
async function generateDailyParentSummaries() {
  const startTime = new Date();
  console.log('🌅 Starting daily parent summary generation');
  console.log(`📅 Time: ${startTime.toISOString()}`);
  
  try {
    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];
    
    console.log(`📆 Generating summaries for: ${yesterdayString}`);
    
    // Generate summaries for yesterday
    const result = await conversationSummaryService.generateDailySummaries(yesterday);
    
    if (result) {
      console.log('\n✅ Summary generation complete!');
      console.log(`- Date processed: ${result.date}`);
      console.log(`- Children with conversations: ${result.totalChildren}`);
      console.log(`- Parent notifications created: ${result.summariesGenerated}`);
      
      if (result.summariesGenerated === 0 && result.totalChildren > 0) {
        console.log('\n⚠️  Note: Some children had conversations but no summaries were generated.');
        console.log('   This usually means conversations were too short or didn\'t meet minimum criteria.');
      }
    } else {
      console.log('\n⚠️  No conversations found for yesterday');
    }
    
    // Optional: Clean up old notifications (older than 7 days)
    console.log('\n🧹 Cleaning up expired notifications...');
    const cleanedUp = await conversationSummaryService.cleanupExpiredNotifications();
    console.log(`✅ Removed ${cleanedUp} expired notifications`);
    
    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / 1000);
    console.log(`\n⏱️  Total duration: ${duration} seconds`);
    console.log('✅ Daily parent summary generation complete!\n');
    
  } catch (error) {
    console.error('❌ Error generating daily summaries:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  generateDailyParentSummaries()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = generateDailyParentSummaries;