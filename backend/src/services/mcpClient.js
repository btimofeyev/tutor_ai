const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const fs = require('fs');
const path = require('path');

class MCPClientService {
  constructor() {
    this.client = null;
    this.transport = null;
    this.tools = [];
    this.isConnected = false;
    this.connectionPromise = null;
  }

  async connect() {
    if (this.isConnected && this.client) {
      return this.client;
    }
    if (this.connectionPromise) {
      return this.connectionPromise;
    }
    this.connectionPromise = this._establishConnection();
    return this.connectionPromise;
  }

  async _establishConnection() {
    try {
      console.log('Connecting to MCP server...');

      // Path to your MCP server - adjust based on your setup
      const mcpServerPath =
        process.env.MCP_SERVER_PATH ||
        path.resolve(__dirname, '../../../mcp-server/dist/server.js');
      console.log('About to spawn MCP server at:', mcpServerPath);

      if (!fs.existsSync(mcpServerPath)) {
        throw new Error(`MCP server script not found at: ${mcpServerPath}`);
      }

      // FIXED: Pass service role key instead of anon key
      this.transport = new StdioClientTransport({
        command: 'node',
        args: [mcpServerPath],
        env: {
          ...process.env,
          SUPABASE_URL: process.env.SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY // CHANGED: Use service role key
        }
      });

      this.client = new Client(
        {
          name: 'klioai-tutor',
          version: '2.0.0'
        },
        {
          capabilities: {}
        }
      );

      await this.client.connect(this.transport);

      // Get available tools
      const toolsResult = await this.client.listTools();
      this.tools = toolsResult.tools || [];

      console.log('Connected to MCP server v2.0 with tools:', this.tools.map(t => t.name));

      this.isConnected = true;
      return this.client;

    } catch (error) {
      console.error('MCP connection error:', error);
      this.connectionPromise = null;
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
    }
    if (this.transport) {
      await this.transport.close();
    }
    this.isConnected = false;
    this.connectionPromise = null;
  }

  // --- UPDATED METHODS FOR NEW SCHEMA ---

  // Get current materials for a child (replaces getCurrentLesson)
  async getCurrentMaterials(childId, subjectName = null, contentType = null) {
    try {
      await this.connect();

      const result = await this.client.callTool({
        name: 'get_child_materials',
        arguments: {
          child_id: childId,
          status: 'approved',
          subject_name: subjectName,
          content_type: contentType,
          due_soon_days: 30,
          include_completed: false // Only get incomplete materials for "current" view
        }
      });

      if (!result || !result.content) {
        return [];
      }

      return JSON.parse(result.content[0].text);

    } catch (error) {
      console.error('Error getting current materials:', error);
      return [];
    }
  }

  // Get material details (replaces getLessonDetails)
  async getMaterialDetails(materialId) {
    try {
      await this.connect();

      const result = await this.client.callTool({
        name: 'get_material_details',
        arguments: {
          material_id: materialId
        }
      });

      if (!result || !result.content) {
        return null;
      }

      return JSON.parse(result.content[0].text);

    } catch (error) {
      console.error('Error getting material details:', error);
      return null;
    }
  }

  // Get upcoming assignments (updated for new schema)
  async getUpcomingAssignments(childId, daysAhead = 7) {
    try {
      await this.connect();

      const result = await this.client.callTool({
        name: 'get_upcoming_deadlines',
        arguments: {
          child_id: childId,
          days_ahead: daysAhead
        }
      });

      if (!result || !result.content) {
        return [];
      }

      return JSON.parse(result.content[0].text);

    } catch (error) {
      console.error('Error getting upcoming assignments:', error);
      return [];
    }
  }

  // Search materials by query (replaces searchLessons)
  async searchMaterials(query, childId, subjectName) {
    try {
      await this.connect();

      const result = await this.client.callTool({
        name: 'search_materials',
        arguments: {
          query,
          child_id: childId,
          subject_name: subjectName
        }
      });

      if (!result || !result.content) {
        return [];
      }

      return JSON.parse(result.content[0].text);

    } catch (error) {
      console.error('Error searching materials:', error);
      return [];
    }
  }

  // Check if child has access to a specific material
  async checkMaterialAccess(childId, materialId) {
    try {
      const material = await this.getMaterialDetails(materialId);
      if (!material) return false;
      
      // Check if the material belongs to this child through the hierarchy
      return material.lesson?.unit?.child_subject?.child?.id === childId;
    } catch (error) {
      console.error('Error checking material access:', error);
      return false;
    }
  }

  // Get all materials for a child (replaces getChildLessons)
  async getChildMaterials(childId, status = null, subjectName = null, contentType = null) {
    try {
      await this.connect();

      const args = { 
        child_id: childId,
        include_completed: true
      };
      
      if (status) args.status = status;
      if (subjectName) args.subject_name = subjectName;
      if (contentType) args.content_type = contentType;

      const result = await this.client.callTool({
        name: 'get_child_materials',
        arguments: args
      });

      if (!result || !result.content) {
        return [];
      }

      return JSON.parse(result.content[0].text);

    } catch (error) {
      console.error('Error getting child materials:', error);
      return [];
    }
  }

  // Get child's progress
  async getChildProgress(childId) {
    try {
      await this.connect();

      const result = await this.client.readResource({
        uri: `edunest://child/${childId}/progress`
      });

      if (!result || !result.contents || !result.contents[0]) {
        return null;
      }

      return JSON.parse(result.contents[0].text);

    } catch (error) {
      console.error('Error getting child progress:', error);
      return null;
    }
  }

  // Get child's progress summary
  async getChildProgressSummary(childId, subjectName = null) {
    try {
      await this.connect();

      const result = await this.client.callTool({
        name: 'get_child_progress_summary',
        arguments: {
          child_id: childId,
          subject_name: subjectName
        }
      });

      if (!result || !result.content) {
        return null;
      }

      return JSON.parse(result.content[0].text);

    } catch (error) {
      console.error('Error getting child progress summary:', error);
      return null;
    }
  }

  // Get child subjects using direct database query (fallback if MCP fails)
  async getChildSubjects(childId) {
    try {
      await this.connect();

      // First try MCP resource
      try {
        const result = await this.client.readResource({
          uri: `edunest://child/${childId}/subjects`
        });

        if (result && result.contents && result.contents[0]) {
          return JSON.parse(result.contents[0].text);
        }
      } catch (resourceError) {
        console.log('MCP resource not available, using direct query');
      }

      // Fallback: direct Supabase query - Use service role key
      const supabase = require('../utils/supabaseClient');
      const { data, error } = await supabase
        .from('child_subjects')
        .select(`
          id,
          custom_subject_name_override,
          subject:subject_id (id, name)
        `)
        .eq('child_id', childId);
      
      if (error) throw error;
      return data || [];

    } catch (error) {
      console.error('Error getting child subjects:', error);
      return [];
    }
  }

  // NEW: Get curriculum structure (subjects -> units -> lessons -> materials)
  async getCurriculumStructure(childId, subjectName = null) {
    try {
      await this.connect();

      const result = await this.client.callTool({
        name: 'get_curriculum_structure',
        arguments: {
          child_id: childId,
          subject_name: subjectName
        }
      });

      if (!result || !result.content) {
        return [];
      }

      return JSON.parse(result.content[0].text);

    } catch (error) {
      console.error('Error getting curriculum structure:', error);
      return [];
    }
  }

  // NEW: Get units overview for a child
  async getChildUnits(childId) {
    try {
      await this.connect();

      const result = await this.client.readResource({
        uri: `edunest://child/${childId}/units`
      });

      if (!result || !result.contents || !result.contents[0]) {
        return [];
      }

      return JSON.parse(result.contents[0].text);

    } catch (error) {
      console.error('Error getting child units:', error);
      return [];
    }
  }

  // --- GRADE-RELATED METHODS ---

  // Get completed materials with grades (for review)
  async getCompletedMaterialsWithGrades(childId, gradeThreshold = null, subjectName = null, contentType = null, limit = 10) {
    try {
      await this.connect();

      const args = { 
        child_id: childId,
        limit: limit
      };
      
      if (gradeThreshold) args.grade_threshold = gradeThreshold;
      if (subjectName) args.subject_name = subjectName;
      if (contentType) args.content_type = contentType;

      const result = await this.client.callTool({
        name: 'get_completed_materials_with_grades',
        arguments: args
      });

      if (!result || !result.content) {
        return [];
      }

      return JSON.parse(result.content[0].text);

    } catch (error) {
      console.error('Error getting completed materials with grades:', error);
      return [];
    }
  }

  // Get detailed grade analysis
  async getGradeAnalysis(childId, subjectName = null, daysBack = 30) {
    try {
      await this.connect();

      const result = await this.client.callTool({
        name: 'get_grade_analysis',
        arguments: {
          child_id: childId,
          subject_name: subjectName,
          days_back: daysBack
        }
      });

      if (!result || !result.content) {
        return null;
      }

      return JSON.parse(result.content[0].text);

    } catch (error) {
      console.error('Error getting grade analysis:', error);
      return null;
    }
  }

  // Get materials that need review
  async getMaterialsForReview(childId, reviewCriteria = 'low_grades', subjectName = null) {
    try {
      await this.connect();

      const result = await this.client.callTool({
        name: 'get_materials_for_review',
        arguments: {
          child_id: childId,
          review_criteria: reviewCriteria,
          subject_name: subjectName
        }
      });

      if (!result || !result.content) {
        return [];
      }

      return JSON.parse(result.content[0].text);

    } catch (error) {
      console.error('Error getting materials for review:', error);
      return [];
    }
  }

  // Enhanced method to get learning context for chat - UPDATED FOR NEW SCHEMA
  async getEnhancedLearningContext(childId) {
    try {
      console.log('Getting enhanced learning context for child:', childId);

      const [
        currentMaterials, 
        upcomingAssignments, 
        childSubjects, 
        progress,
        gradeAnalysis,
        materialsForReview
      ] = await Promise.all([
        this.getCurrentMaterials(childId).catch(e => { console.error('getCurrentMaterials error:', e); return []; }),
        this.getUpcomingAssignments(childId, 7).catch(e => { console.error('getUpcomingAssignments error:', e); return []; }),
        this.getChildSubjects(childId).catch(e => { console.error('getChildSubjects error:', e); return []; }),
        this.getChildProgress(childId).catch(e => { console.error('getChildProgress error:', e); return null; }),
        this.getGradeAnalysis(childId, null, 30).catch(e => { console.error('getGradeAnalysis error:', e); return null; }),
        this.getMaterialsForReview(childId, 'low_grades').catch(e => { console.error('getMaterialsForReview error:', e); return []; })
      ]);

      console.log('Enhanced learning context results:', {
        currentMaterials: currentMaterials.length,
        upcomingAssignments: upcomingAssignments.length,
        childSubjects: childSubjects.length,
        hasGradeAnalysis: !!gradeAnalysis,
        materialsNeedingReview: materialsForReview.length
      });

      // Find the most immediate material/assignment
      let currentFocus = null;
      
      // Prioritize materials due soon
      const materialsDueSoon = currentMaterials.filter(material => {
        if (!material.due_date) return false;
        const dueDate = new Date(material.due_date);
        const today = new Date();
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        return daysUntilDue >= 0 && daysUntilDue <= 3; // Due in next 3 days
      });

      if (materialsDueSoon.length > 0) {
        currentFocus = materialsDueSoon[0];
      } else if (currentMaterials.length > 0) {
        currentFocus = currentMaterials[0];
      } else if (upcomingAssignments.length > 0) {
        currentFocus = {
          type: 'assignment',
          ...upcomingAssignments[0]
        };
      }

      return {
        childSubjects: childSubjects || [],
        currentLessons: currentMaterials || [], // Keep for compatibility
        currentMaterials: currentMaterials || [],
        upcomingAssignments: upcomingAssignments || [],
        currentFocus,
        progress: progress || null,
        gradeAnalysis: gradeAnalysis || null,
        materialsForReview: materialsForReview || [],
        // Add summary flags for quick checks
        hasLowGrades: materialsForReview.length > 0,
        averageGrade: gradeAnalysis?.trends?.averageGrade || null,
        needsReview: materialsForReview.length > 0,
        recentGradeCount: gradeAnalysis?.totalGradedMaterials || 0
      };

    } catch (error) {
      console.error('Error getting enhanced learning context:', error);
      
      // Return basic context if enhanced fails
      return await this.getLearningContext(childId);
    }
  }

  // MISSING METHOD: Basic learning context method for compatibility
  async getLearningContext(childId) {
    try {
      console.log('Getting learning context for child:', childId);

      const [currentMaterials, upcomingAssignments, childSubjects, progress] = await Promise.all([
        this.getCurrentMaterials(childId).catch(e => { console.error('getCurrentMaterials error:', e); return []; }),
        this.getUpcomingAssignments(childId, 7).catch(e => { console.error('getUpcomingAssignments error:', e); return []; }),
        this.getChildSubjects(childId).catch(e => { console.error('getChildSubjects error:', e); return []; }),
        this.getChildProgress(childId).catch(e => { console.error('getChildProgress error:', e); return null; })
      ]);

      console.log('Learning context results:', {
        currentMaterials: currentMaterials.length,
        upcomingAssignments: upcomingAssignments.length,
        childSubjects: childSubjects.length
      });

      // Find the most immediate material/assignment
      let currentFocus = null;
      
      // Prioritize materials due soon
      const materialsDueSoon = currentMaterials.filter(material => {
        if (!material.due_date) return false;
        const dueDate = new Date(material.due_date);
        const today = new Date();
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        return daysUntilDue >= 0 && daysUntilDue <= 3; // Due in next 3 days
      });

      if (materialsDueSoon.length > 0) {
        currentFocus = materialsDueSoon[0];
      } else if (currentMaterials.length > 0) {
        currentFocus = currentMaterials[0];
      } else if (upcomingAssignments.length > 0) {
        currentFocus = {
          type: 'assignment',
          ...upcomingAssignments[0]
        };
      }

      return {
        childSubjects: childSubjects || [],
        currentLessons: currentMaterials || [], // Keep the old property name for compatibility
        currentMaterials: currentMaterials || [], // New property name
        upcomingAssignments: upcomingAssignments || [],
        currentFocus,
        progress: progress || null
      };

    } catch (error) {
      console.error('Error getting learning context:', error);
      
      // Return fallback context with direct database queries
      try {
        // Use service role key client for fallback
        const supabase = require('../utils/supabaseClient');
        
        // Get child subjects directly
        const { data: childSubjects } = await supabase
          .from('child_subjects')
          .select(`
            id,
            custom_subject_name_override,
            subject:subject_id (id, name)
          `)
          .eq('child_id', childId);

        // Get current materials directly  
        const childSubjectIds = (childSubjects || []).map(cs => cs.id);
        const { data: materials } = await supabase
          .from('materials')
          .select(`
            id, title, status, due_date, content_type, created_at,
            lesson:lesson_id (
              id, title, lesson_number,
              unit:unit_id (
                id, name,
                child_subject:child_subject_id (
                  subject:subject_id (name),
                  custom_subject_name_override
                )
              )
            )
          `)
          .in('child_subject_id', childSubjectIds)
          .in('status', ['pending', 'approved'])
          .is('completed_at', null)
          .order('due_date', { ascending: true, nullsLast: true })
          .limit(10);

        console.log('Fallback context - found materials:', materials?.length || 0);

        return {
          childSubjects: childSubjects || [],
          currentLessons: materials || [], // For compatibility
          currentMaterials: materials || [],
          upcomingAssignments: [],
          currentFocus: materials?.[0] || null,
          progress: null,
          fallback: true
        };
      } catch (fallbackError) {
        console.error('Fallback context failed:', fallbackError);
        return {
          childSubjects: [],
          currentLessons: [],
          currentMaterials: [],
          upcomingAssignments: [],
          currentFocus: null,
          progress: null,
          error: error.message
        };
      }
    }
  }

  // Utility method to check if child has grade-related queries
  isGradeRelatedQuery(message) {
    const gradeKeywords = [
      'grade', 'grades', 'score', 'scores', 'review', 'wrong', 'missed', 'failed',
      'perfect', 'how did i do', 'check my work', 'mistakes', 'incorrect',
      'average', 'performance', 'results', 'feedback', 'percent', '%', 'points',
      'better', 'improve', 'study more', 'practice more', 'not good', 'disappointed'
    ];
    
    const messageLower = message.toLowerCase();
    return gradeKeywords.some(keyword => messageLower.includes(keyword));
  }

  // BACKWARD COMPATIBILITY METHODS (map old names to new functionality)
  
  async getCurrentLesson(childId, subjectId) {
    console.warn('getCurrentLesson is deprecated, use getCurrentMaterials instead');
    const materials = await this.getCurrentMaterials(childId);
    return materials.length > 0 ? materials[0] : null;
  }

  async getLessonDetails(lessonId) {
    console.warn('getLessonDetails is deprecated, use getMaterialDetails instead');
    return await this.getMaterialDetails(lessonId);
  }

  async searchLessons(query, childId, subjectName) {
    console.warn('searchLessons is deprecated, use searchMaterials instead');
    return await this.searchMaterials(query, childId, subjectName);
  }

  async checkLessonAccess(childId, lessonId) {
    console.warn('checkLessonAccess is deprecated, use checkMaterialAccess instead');
    return await this.checkMaterialAccess(childId, lessonId);
  }

  async getChildLessons(childId, status = null) {
    console.warn('getChildLessons is deprecated, use getChildMaterials instead');
    return await this.getChildMaterials(childId, status);
  }
}

// Export singleton instance
module.exports = new MCPClientService();