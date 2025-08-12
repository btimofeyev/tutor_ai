// Fixed learningMemoryService.js - Removes supabase.raw error
const supabase = require('../utils/supabaseClient');
const { OpenAI } = require('openai');
const keyManager = require('../utils/secureKeys');

const openai = new OpenAI({
  apiKey: keyManager.getOpenAIKey()
});

class LearningMemoryService {
  // Add a new learning memory
  async addMemory(childId, memoryType, subject, topic, details, confidenceScore = 0.8) {
    try {
      // Check if similar memory exists
      const { data: existing } = await supabase
        .from('child_learning_memories')
        .select('*')
        .eq('child_id', childId)
        .eq('memory_type', memoryType)
        .eq('subject', subject)
        .eq('topic', topic)
        .maybeSingle();

      if (existing) {
        // Reinforce existing memory
        await this.reinforceMemory(existing.id, details);
        return existing.id;
      } else {
        // Create new memory
        const { data, error } = await supabase
          .from('child_learning_memories')
          .insert([{
            child_id: childId,
            memory_type: memoryType,
            subject,
            topic,
            content: details,
            confidence_score: confidenceScore
          }])
          .select()
          .single();

        if (error) throw error;
        return data.id;
      }
    } catch (error) {
      console.error('Error adding learning memory:', error);
      return null;
    }
  }

  // Get relevant memories for current context
  async getRelevantMemories(childId, currentMessage, mcpContext = null, limit = 5) {
    try {
      let query = supabase
        .from('child_learning_memories')
        .select('*')
        .eq('child_id', childId)
        .gte('confidence_score', 0.3) // Only get confident memories
        .order('last_reinforced', { ascending: false })
        .limit(limit * 2); // Get more to filter

      const { data: allMemories, error } = await query;
      if (error) throw error;

      // Score memories by relevance
      const scoredMemories = allMemories.map(memory => ({
        ...memory,
        relevanceScore: this.calculateRelevance(memory, currentMessage, mcpContext)
      }));

      // Sort by relevance and return top results
      return scoredMemories
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);

    } catch (error) {
      console.error('Error getting relevant memories:', error);
      return [];
    }
  }

  // Calculate how relevant a memory is to current context
  calculateRelevance(memory, currentMessage, mcpContext) {
    let score = 0;
    const messageLower = currentMessage.toLowerCase();

    // Subject relevance
    if (memory.subject && mcpContext?.currentFocus?.lesson?.unit?.child_subject?.subject?.name) {
      const currentSubject = mcpContext.currentFocus.lesson.unit.child_subject.subject.name.toLowerCase();
      if (memory.subject.toLowerCase() === currentSubject) score += 0.4;
    }

    // Topic relevance (keyword matching)
    if (memory.topic) {
      const topicWords = memory.topic.toLowerCase().split(' ');
      const matchingWords = topicWords.filter(word => messageLower.includes(word));
      score += (matchingWords.length / topicWords.length) * 0.3;
    }

    // Memory type relevance
    if (messageLower.includes("don't understand") && memory.memory_type === 'struggle') score += 0.3;
    if (messageLower.includes("help") && memory.memory_type === 'question_pattern') score += 0.2;

    // Recency bonus (more recent = more relevant)
    const daysSince = (Date.now() - new Date(memory.last_reinforced)) / (1000 * 60 * 60 * 24);
    score += Math.max(0, (30 - daysSince) / 30) * 0.2; // Linear decay over 30 days

    // Confidence bonus
    score += memory.confidence_score * 0.1;

    return score;
  }

  // FIXED: Reinforce an existing memory without using supabase.raw
  async reinforceMemory(memoryId, newDetails = null) {
    try {
      // First get the current memory to calculate new values
      const { data: currentMemory, error: fetchError } = await supabase
        .from('child_learning_memories')
        .select('*')
        .eq('id', memoryId)
        .single();

      if (fetchError) throw fetchError;

      // Calculate new confidence score (max 1.0)
      const newConfidenceScore = Math.min(currentMemory.confidence_score + 0.1, 1.0);
      const newSessionCount = currentMemory.session_count + 1;

      const updateData = {
        confidence_score: newConfidenceScore,
        session_count: newSessionCount,
        last_reinforced: new Date().toISOString()
      };

      if (newDetails) {
        // Merge new details with existing content
        const mergedContent = {
          ...currentMemory.content,
          ...newDetails,
          reinforcement_history: [
            ...(currentMemory.content.reinforcement_history || []),
            { date: new Date().toISOString(), details: newDetails }
          ]
        };
        updateData.content = mergedContent;
      }

      const { error: updateError } = await supabase
        .from('child_learning_memories')
        .update(updateData)
        .eq('id', memoryId);

      if (updateError) throw updateError;
      return true;
    } catch (error) {
      console.error('Error reinforcing memory:', error);
      return false;
    }
  }

  // Get or create learning profile
  async getLearningProfile(childId) {
    try {
      let { data: profile, error } = await supabase
        .from('child_learning_profiles')
        .select('*')
        .eq('child_id', childId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (!profile) {
        // Create new profile
        const { data: newProfile, error: createError } = await supabase
          .from('child_learning_profiles')
          .insert([{ child_id: childId }])
          .select()
          .single();

        if (createError) throw createError;
        profile = newProfile;
      }

      return profile;
    } catch (error) {
      console.error('Error getting learning profile:', error);
      return {
        days_together: 0,
        total_interactions: 0,
        preferred_explanation_style: 'step_by_step',
        common_difficulties: [],
        engagement_triggers: [],
        learning_pace: 'moderate',
        confidence_level: 'building'
      };
    }
  }

  // NEW: Update learning profile with new insights
  async updateLearningProfile(childId, updates) {
    try {
      const { error } = await supabase
        .from('child_learning_profiles')
        .update({
          ...updates,
          profile_updated_at: new Date().toISOString()
        })
        .eq('child_id', childId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating learning profile:', error);
      return false;
    }
  }

  // NEW: Get memory statistics for a child
  async getMemoryStats(childId) {
    try {
      const { data: memories, error } = await supabase
        .from('child_learning_memories')
        .select('memory_type, confidence_score, session_count')
        .eq('child_id', childId);

      if (error) throw error;

      const stats = {
        totalMemories: memories.length,
        byType: {},
        averageConfidence: 0,
        totalReinforcements: 0
      };

      memories.forEach(memory => {
        // Count by type
        stats.byType[memory.memory_type] = (stats.byType[memory.memory_type] || 0) + 1;
        
        // Sum for averages
        stats.averageConfidence += memory.confidence_score;
        stats.totalReinforcements += memory.session_count;
      });

      if (memories.length > 0) {
        stats.averageConfidence = Math.round((stats.averageConfidence / memories.length) * 100) / 100;
      }

      return stats;
    } catch (error) {
      console.error('Error getting memory stats:', error);
      return null;
    }
  }

  // NEW: Clean up old, low-confidence memories
  async cleanupMemories(childId, daysOld = 90, minConfidence = 0.2) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { data: deleted, error } = await supabase
        .from('child_learning_memories')
        .delete()
        .eq('child_id', childId)
        .lt('confidence_score', minConfidence)
        .lt('last_reinforced', cutoffDate.toISOString())
        .select('id, memory_type');

      if (error) throw error;

      console.log(`Cleaned up ${deleted?.length || 0} old memories for child ${childId}`);
      return deleted?.length || 0;
    } catch (error) {
      console.error('Error cleaning up memories:', error);
      return 0;
    }
  }

  // NEW: Find patterns in learning memories
  async findLearningPatterns(childId) {
    try {
      const { data: memories, error } = await supabase
        .from('child_learning_memories')
        .select('*')
        .eq('child_id', childId)
        .gte('confidence_score', 0.5)
        .order('last_reinforced', { ascending: false });

      if (error) throw error;

      const patterns = {
        commonStruggles: [],
        preferredTopics: [],
        learningStyles: [],
        timePatterns: []
      };

      // Analyze struggles
      const struggles = memories.filter(m => m.memory_type === 'struggle');
      const struggleTopics = {};
      struggles.forEach(s => {
        struggleTopics[s.topic] = (struggleTopics[s.topic] || 0) + s.session_count;
      });
      patterns.commonStruggles = Object.entries(struggleTopics)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([topic, count]) => ({ topic, frequency: count }));

      // Analyze engagement
      const engagements = memories.filter(m => m.memory_type === 'engagement');
      const engagementTopics = {};
      engagements.forEach(e => {
        engagementTopics[e.topic] = (engagementTopics[e.topic] || 0) + e.session_count;
      });
      patterns.preferredTopics = Object.entries(engagementTopics)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([topic, count]) => ({ topic, frequency: count }));

      return patterns;
    } catch (error) {
      console.error('Error finding learning patterns:', error);
      return null;
    }
  }
}

module.exports = new LearningMemoryService();