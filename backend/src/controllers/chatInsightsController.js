// backend/scripts/generate-daily-summaries.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const getChildrenWithConversations = async (date) => {
  const { data, error } = await supabase.rpc('get_children_with_conversations_on_date', { conversation_date: date });

  if (error) {
    console.error('Error getting children with conversations:', error);
    throw error;
  }
  return data;
};

const getConversationsForChild = async (childId, date) => {
    const { data, error } = await supabase
      .from('chat_history')
      .select('message_text, role, created_at')
      .eq('child_id', childId)
      .gte('created_at', `${date}T00:00:00.000Z`)
      .lte('created_at', `${date}T23:59:59.999Z`)
      .order('created_at', { ascending: true });
  
    if (error) {
      console.error(`Error fetching conversations for child ${childId}:`, error);
      throw error;
    }
    return data;
  };
  

  const generateSummaryWithOpenAI = async (childName, conversations) => {
    const prompt = `
  Generate a concise, parent-friendly summary of a child's learning session.
  
  Child's Name: ${childName}
  
  Conversation History:
  ${conversations.map(msg => `${msg.role === 'user' ? 'Child' : 'Klio'}: ${msg.message_text}`).join('\n')}
  
  Please provide a summary in the following JSON format:
  {
    "childName": "${childName}",
    "sessionCount": 1,
    "totalMinutes": 0, // Placeholder
    "keyHighlights": ["string"],
    "subjectsDiscussed": ["string"],
    "learningProgress": {
      "problemsSolved": 0,
      "correctAnswers": 0,
      "newTopicsExplored": 0,
      "struggledWith": ["string"],
      "masteredTopics": ["string"]
    },
    "materialsWorkedOn": [],
    "engagementLevel": "high|medium|low",
    "sessionTimes": [], // Placeholder
    "parentSuggestions": ["string"]
  }
  
  Focus on identifying key learning points, areas of progress, and any topics the child found challenging. Provide actionable suggestions for the parent. The tone should be encouraging and informative.
  `;
  
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [{ role: 'system', content: prompt }],
        response_format: { type: "json_object" },
      });
  
      const summaryJson = JSON.parse(response.choices[0].message.content);
      
      // Basic post-processing
      const sessionTimes = conversations.length > 0
        ? [`${new Date(conversations[0].created_at).toLocaleTimeString()} - ${new Date(conversations[conversations.length - 1].created_at).toLocaleTimeString()}`]
        : [];
      const totalMinutes = conversations.length > 0
        ? Math.round((new Date(conversations[conversations.length - 1].created_at) - new Date(conversations[0].created_at)) / 60000)
        : 0;
  
      summaryJson.sessionTimes = sessionTimes;
      summaryJson.totalMinutes = totalMinutes;
  
      return summaryJson;
  
    } catch (error) {
      console.error('Error generating summary with OpenAI:', error);
      throw error;
    }
  };
  
const saveSummary = async (parentId, childId, date, summaryData) => {
    const { data, error } = await supabase
      .from('parent_conversation_notifications')
      .upsert({
        parent_id: parentId,
        child_id: childId,
        conversation_date: date,
        summary_data: summaryData, // Corrected column name
        status: 'unread',
        updated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }, {
        onConflict: 'parent_id, child_id, conversation_date'
      });
  
    if (error) {
      console.error(`Error saving summary for child ${childId}:`, error);
      throw error;
    }
    return data;
  };
  
const generateDailySummaries = async () => {
    console.log('🚀 Starting daily conversation summary generation...');
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);

    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const date = yesterday.toISOString().split('T')[0];

        console.log(`🔄 Generating conversation summaries for ${date}`);

        const childrenToProcess = await getChildrenWithConversations(date);
        console.log(`👨‍👩‍👧‍👦 Found ${childrenToProcess.length} children with conversations`);

        for (const child of childrenToProcess) {
            try {
                console.log(`\nProcessing child: ${child.name} (ID: ${child.id})`);

                const conversations = await getConversationsForChild(child.id, date);
                if (conversations.length < 2) { // Need at least one exchange
                    console.log(`  - Skipping, not enough conversation history.`);
                    continue;
                }
                console.log(`  - Found ${conversations.length} messages.`);
                
                const summaryJson = await generateSummaryWithOpenAI(child.name, conversations);
                console.log(`  - Generated summary with OpenAI.`);
                
                await saveSummary(child.parent_id, child.id, date, summaryJson);
                console.log(`  - ✅ Successfully saved summary to database.`);
            
            } catch (childError) {
                console.error(`  - ❌ Error processing child ${child.id}:`, childError.message);
            }
        }

        console.log('\n✅ Daily summary generation complete.');
    } catch (error) {
        console.error('\n❌ Error during daily summary generation:', error);
    }
};

if (require.main === module) {
  generateDailySummaries();
}
