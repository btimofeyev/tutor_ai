// backend/scripts/fix-existing-summary.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const supabase = require('../src/utils/supabaseClient');

async function fixExistingSummary() {
  console.log('🔧 Fixing existing parent notification...');
  
  try {
    // Get the notification that has fallbackSummary data
    const { data: notifications, error: fetchError } = await supabase
      .from('parent_conversation_notifications')
      .select('*')
      .not('summary_data->fallbackSummary', 'is', null);
    
    if (fetchError) {
      throw fetchError;
    }
    
    if (!notifications || notifications.length === 0) {
      console.log('No notifications with fallback data found');
      return;
    }
    
    for (const notification of notifications) {
      const fallbackSummary = notification.summary_data.fallbackSummary;
      
      if (fallbackSummary) {
        try {
          // Extract JSON from the fallback summary
          let jsonText = fallbackSummary.trim();
          if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }
          
          const parsedData = JSON.parse(jsonText);
          
          // Merge the parsed data with existing summary_data
          const updatedSummaryData = {
            ...notification.summary_data,
            ...parsedData,
            childName: notification.summary_data.childName,
            sessionCount: notification.summary_data.sessionCount,
            totalMinutes: notification.summary_data.totalMinutes,
            sessionTimes: notification.summary_data.sessionTimes || []
          };
          
          // Remove the fallbackSummary since we've parsed it
          delete updatedSummaryData.fallbackSummary;
          
          // Update the notification
          const { error: updateError } = await supabase
            .from('parent_conversation_notifications')
            .update({ summary_data: updatedSummaryData })
            .eq('id', notification.id);
          
          if (updateError) {
            throw updateError;
          }
          
          console.log(`✅ Fixed notification for ${updatedSummaryData.childName}`);
          console.log(`   Key highlights: ${updatedSummaryData.keyHighlights?.join(', ')}`);
          
        } catch (parseError) {
          console.error(`❌ Failed to parse fallback summary for notification ${notification.id}:`, parseError);
        }
      }
    }
    
    console.log('\n✅ Existing notifications fixed!');
    
  } catch (error) {
    console.error('❌ Error fixing notifications:', error);
  }
}

// Run if called directly
if (require.main === module) {
  fixExistingSummary()
    .then(() => {
      console.log('\n🎉 Fix completed! Check your dashboard now.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = fixExistingSummary;