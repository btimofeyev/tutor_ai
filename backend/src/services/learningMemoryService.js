const supabase = require('../utils/supabaseClient');
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
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

  // Reinforce an existing memory
  async reinforceMemory(memoryId, newDetails = null) {
    try {
      const updateData = {
        confidence_score: supabase.raw('LEAST(confidence_score + 0.1, 1.0)'),
        session_count: supabase.raw('session_count + 1'),
        last_reinforced: new Date().toISOString()
      };

      if (newDetails) {
        // Merge new details with existing content
        const { data: existing } = await supabase
          .from('child_learning_memories')
          .select('content')
          .eq('id', memoryId)
          .single();

        if (existing) {
          const mergedContent = {
            ...existing.content,
            ...newDetails,
            reinforcement_history: [
              ...(existing.content.reinforcement_history || []),
              { date: new Date().toISOString(), details: newDetails }
            ]
          };
          updateData.content = mergedContent;
        }
      }

      await supabase
        .from('child_learning_memories')
        .update(updateData)
        .eq('id', memoryId);

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
}

module.exports = new LearningMemoryService();