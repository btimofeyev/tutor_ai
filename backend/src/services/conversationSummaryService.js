// backend/src/services/conversationSummaryService.js
const supabase = require('../utils/supabaseClient');
const OpenAI = require('openai');
const keyManager = require('../utils/secureKeys');

const openai = new OpenAI({
  apiKey: keyManager.getOpenAIKey(),
});

class ConversationSummaryService {
  constructor() {
    this.MIN_CONVERSATIONS_FOR_SUMMARY = 2; // Minimum conversations to warrant a summary
    this.MIN_TOTAL_MESSAGES = 6; // Minimum total messages to warrant a summary
  }

  /**
   * Generate daily conversation summaries for all children
   * This should be called by a daily cron job
   */
  async generateDailySummaries(targetDate = null) {
    try {
      const date = targetDate || new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday by default
      const dateString = date.toISOString().split('T')[0];
      
      console.log(`🔄 Generating conversation summaries for ${dateString}`);

      // Get all children who had conversations on the target date
      const childrenWithConversations = await this.getChildrenWithConversations(dateString);
      
      console.log(`📊 Found ${childrenWithConversations.length} children with conversations on ${dateString}`);

      let summariesGenerated = 0;
      
      for (const childData of childrenWithConversations) {
        try {
          const summary = await this.generateChildDailySummary(childData, dateString);
          if (summary) {
            await this.storeParentNotification(childData, summary, dateString);
            summariesGenerated++;
            console.log(`✅ Generated summary for ${childData.name} (${childData.id})`);
          }
        } catch (error) {
          console.error(`❌ Failed to generate summary for child ${childData.id}:`, error);
        }
      }

      console.log(`🎉 Generated ${summariesGenerated} conversation summaries for ${dateString}`);
      return { date: dateString, summariesGenerated, totalChildren: childrenWithConversations.length };

    } catch (error) {
      console.error('Error in generateDailySummaries:', error);
      throw error;
    }
  }

  /**
   * Get children who had meaningful conversations on a specific date
   */
  async getChildrenWithConversations(dateString) {
    try {
      // Get conversation summaries from the existing system
      const { data: conversationSummaries, error: summariesError } = await supabase
        .from('conversation_summaries')
        .select(`
          child_id,
          summary,
          message_count,
          period_start,
          period_end,
          children:child_id (
            id,
            name,
            grade,
            parent_id
          )
        `)
        .gte('period_start', `${dateString}T00:00:00Z`)
        .lt('period_start', `${dateString}T23:59:59Z`)
        .gte('message_count', this.MIN_TOTAL_MESSAGES);

      if (summariesError) {
        throw summariesError;
      }

      // Skip chat_interactions table for now - use conversation_summaries data only
      const interactions = [];

      // Combine and aggregate data by child
      const childrenMap = new Map();

      // Process conversation summaries
      conversationSummaries.forEach(summary => {
        if (!summary.children) return;
        
        const childId = summary.child_id;
        if (!childrenMap.has(childId)) {
          childrenMap.set(childId, {
            id: childId,
            name: summary.children.name,
            grade: summary.children.grade,
            parentId: summary.children.parent_id,
            conversationSummaries: [],
            totalMessages: 0,
            totalSessions: 0,
            hasLessonContext: false,
            hasWorkspace: false,
            functionCalls: 0
          });
        }
        
        const child = childrenMap.get(childId);
        child.conversationSummaries.push(summary.summary);
        child.totalMessages += summary.message_count;
        child.totalSessions += 1; // Count each summary as a session
      });

      // Note: interactions processing skipped - using conversation_summaries data only

      // Filter children with meaningful activity
      return Array.from(childrenMap.values()).filter(child => 
        child.totalMessages >= this.MIN_TOTAL_MESSAGES &&
        child.totalSessions >= this.MIN_CONVERSATIONS_FOR_SUMMARY
      );

    } catch (error) {
      console.error('Error getting children with conversations:', error);
      throw error;
    }
  }

  /**
   * Generate a parent-friendly summary for a child's daily conversations
   */
  async generateChildDailySummary(childData, dateString) {
    try {
      // Combine conversation summaries
      const conversationText = childData.conversationSummaries.join('\n\n');
      
      // Create parent-friendly summary prompt
      const summaryPrompt = `Create a brief, parent-friendly summary of ${childData.name}'s tutoring sessions today. Focus on learning insights that would be valuable for a parent to know.

Original conversation summaries:
${conversationText}

Additional context:
- Total conversations: ${childData.totalSessions}
- Total messages exchanged: ${childData.totalMessages}
- Worked on specific lessons: ${childData.hasLessonContext ? 'Yes' : 'No'}
- Used interactive workspace: ${childData.hasWorkspace ? 'Yes' : 'No'}
- Function calls (problem solving): ${childData.functionCalls}

Create a summary with:
1. Key highlights (2-3 bullet points with emojis)
2. Subjects discussed
3. Learning progress indicators
4. Any struggles or areas needing attention
5. Positive achievements to celebrate

Keep it concise, positive, and actionable for parents. Focus on learning insights, not conversation details.

Format as a JSON object with these fields:
{
  "keyHighlights": ["✅ Achievement", "💪 Progress", "🤔 Area for attention"],
  "subjectsDiscussed": ["Subject1", "Subject2"],
  "learningProgress": {
    "problemsSolved": number,
    "engagementLevel": "high|medium|low",
    "struggledWith": ["topic1"],
    "masteredTopics": ["topic2"]
  },
  "parentSuggestions": ["suggestion1", "suggestion2"]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are creating parent-friendly summaries of children's AI tutoring sessions. Focus on learning insights, progress, and actionable information for parents. Be positive and encouraging while being honest about areas needing attention."
          },
          {
            role: "user",
            content: summaryPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      const summaryText = response.choices[0].message.content;
      
      // Parse JSON response (handle markdown code blocks)
      let summaryData;
      try {
        // Remove markdown code blocks if present
        let cleanSummaryText = summaryText.trim();
        if (cleanSummaryText.startsWith('```json')) {
          cleanSummaryText = cleanSummaryText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanSummaryText.startsWith('```')) {
          cleanSummaryText = cleanSummaryText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        summaryData = JSON.parse(cleanSummaryText);
        console.log('✅ Successfully parsed AI-generated summary');
      } catch (parseError) {
        console.warn('Failed to parse AI summary as JSON, using fallback format');
        console.warn('Raw AI response:', summaryText);
        summaryData = this.createFallbackSummary(childData, summaryText);
      }

      // Add session metadata
      summaryData.childName = childData.name;
      summaryData.sessionCount = childData.totalSessions;
      summaryData.totalMinutes = Math.round(childData.totalMessages * 2); // Rough estimate
      summaryData.engagementLevel = this.calculateEngagementLevel(childData);
      summaryData.sessionTimes = []; // Could be enhanced with actual session times
      
      return summaryData;

    } catch (error) {
      console.error('Error generating child daily summary:', error);
      return this.createFallbackSummary(childData, 'Summary generation failed');
    }
  }

  /**
   * Create a fallback summary when AI generation fails
   */
  createFallbackSummary(childData, rawSummary) {
    return {
      childName: childData.name,
      sessionCount: childData.totalSessions,
      totalMinutes: Math.round(childData.totalMessages * 2),
      keyHighlights: [
        `📚 Had ${childData.totalSessions} learning sessions`,
        `💬 ${childData.totalMessages} messages exchanged`,
        childData.hasWorkspace ? '🧮 Worked on practice problems' : '📖 Focused on discussion and guidance'
      ],
      subjectsDiscussed: ['General Learning'],
      learningProgress: {
        problemsSolved: childData.functionCalls || 0,
        engagementLevel: this.calculateEngagementLevel(childData),
        struggledWith: [],
        masteredTopics: []
      },
      parentSuggestions: [
        'Check in with your child about today\'s learning',
        'Ask about any challenging topics they worked on'
      ],
      fallbackSummary: rawSummary
    };
  }

  /**
   * Calculate engagement level based on conversation metrics
   */
  calculateEngagementLevel(childData) {
    const avgMessagesPerSession = childData.totalMessages / childData.totalSessions;
    
    if (avgMessagesPerSession >= 15 && childData.functionCalls > 5) {
      return 'high';
    } else if (avgMessagesPerSession >= 8 && childData.functionCalls > 2) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Store the parent notification in the database
   */
  async storeParentNotification(childData, summaryData, dateString) {
    try {
      // Check if notification already exists for this parent/child/date
      const { data: existing } = await supabase
        .from('parent_conversation_notifications')
        .select('id')
        .eq('parent_id', childData.parentId)
        .eq('child_id', childData.id)
        .eq('conversation_date', dateString)
        .single();

      if (existing) {
        console.log(`📝 Updating existing notification for ${childData.name} on ${dateString}`);
        
        // Update existing notification
        const { error } = await supabase
          .from('parent_conversation_notifications')
          .update({
            summary_data: summaryData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        console.log(`📝 Creating new notification for ${childData.name} on ${dateString}`);
        
        // Create new notification
        const { error } = await supabase
          .from('parent_conversation_notifications')
          .insert([{
            parent_id: childData.parentId,
            child_id: childData.id,
            conversation_date: dateString,
            summary_data: summaryData,
            status: 'unread',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
          }]);

        if (error) throw error;
      }

    } catch (error) {
      console.error('Error storing parent notification:', error);
      throw error;
    }
  }

  /**
   * Clean up expired notifications
   */
  async cleanupExpiredNotifications() {
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('parent_conversation_notifications')
        .delete()
        .lt('expires_at', now)
        .select('id, conversation_date');

      if (error) throw error;

      console.log(`🧹 Cleaned up ${data.length} expired conversation summaries`);
      return data.length;

    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
      throw error;
    }
  }
}

module.exports = new ConversationSummaryService();