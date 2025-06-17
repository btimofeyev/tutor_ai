#!/usr/bin/env node
// backend/scripts/generate-daily-summaries.js
// Daily cron job script to generate conversation summaries for parents

require('dotenv').config();
const conversationSummaryService = require('../src/services/conversationSummaryService');

async function runDailySummaryGeneration() {
  console.log('🚀 Starting daily conversation summary generation...');
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  
  try {
    // Generate summaries for yesterday (default behavior)
    const result = await conversationSummaryService.generateDailySummaries();
    
    console.log('✅ Daily summary generation completed successfully');
    console.log(`📊 Results:`, result);
    
    // Also clean up expired notifications
    console.log('🧹 Cleaning up expired notifications...');
    const cleanedCount = await conversationSummaryService.cleanupExpiredNotifications();
    console.log(`🗑️ Cleaned up ${cleanedCount} expired notifications`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error during daily summary generation:', error);
    process.exit(1);
  }
}

// Handle specific date argument for manual runs
const targetDateArg = process.argv[2];
if (targetDateArg) {
  console.log(`🎯 Running for specific date: ${targetDateArg}`);
  
  const targetDate = new Date(targetDateArg);
  if (isNaN(targetDate.getTime())) {
    console.error('❌ Invalid date format. Use YYYY-MM-DD');
    process.exit(1);
  }
  
  conversationSummaryService.generateDailySummaries(targetDate)
    .then(result => {
      console.log('✅ Manual summary generation completed');
      console.log(`📊 Results:`, result);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error during manual summary generation:', error);
      process.exit(1);
    });
} else {
  // Run for yesterday by default
  runDailySummaryGeneration();
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n⚠️ Process interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️ Process terminated');
  process.exit(1);
});