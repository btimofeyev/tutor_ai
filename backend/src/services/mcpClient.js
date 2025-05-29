// backend/src/services/mcpClient.js - SIMPLIFIED VERSION
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const fs = require('fs');
const path = require('path');

class MCPClientService {
  constructor() {
    this.client = null;
    this.transport = null;
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
      console.log('Connecting to simplified MCP server...');

      const mcpServerPath = process.env.MCP_SERVER_PATH || 
        path.resolve(__dirname, '../../../mcp-server/dist/server.js');
      
      if (!fs.existsSync(mcpServerPath)) {
        throw new Error(`MCP server script not found at: ${mcpServerPath}`);
      }

      this.transport = new StdioClientTransport({
        command: 'node',
        args: [mcpServerPath],
        env: {
          ...process.env,
          SUPABASE_URL: process.env.SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
        }
      });

      this.client = new Client(
        { name: 'klioai-tutor', version: '2.0.0' },
        { capabilities: {} }
      );

      await this.client.connect(this.transport);
      console.log('✅ Connected to simplified MCP server');
      this.isConnected = true;
      return this.client;

    } catch (error) {
      console.error('❌ MCP connection error:', error);
      this.connectionPromise = null;
      throw error;
    }
  }

  async disconnect() {
    if (this.client) await this.client.close();
    if (this.transport) await this.transport.close();
    this.isConnected = false;
    this.connectionPromise = null;
  }

  // 🎯 ONE SEARCH METHOD TO RULE THEM ALL
  async search(childId, query, searchType = 'all') {
    try {
      await this.connect();

      console.log(`🔍 Searching: "${query}" (type: ${searchType}) for child: ${childId}`);

      const result = await this.client.callTool({
        name: 'search_database',
        arguments: {
          child_id: childId,
          query: query,
          search_type: searchType
        }
      });

      if (!result?.content?.[0]?.text) {
        console.log('❌ No search results returned');
        return { results: {}, summary: 'No results found' };
      }

      const searchData = JSON.parse(result.content[0].text);
      console.log(`✅ Search completed: ${searchData.summary}`);
      
      return searchData;

    } catch (error) {
      console.error('❌ Search error:', error);
      return { 
        error: error.message,
        results: {},
        summary: 'Search failed'
      };
    }
  }

  // 🚀 SMART CONTEXT METHODS (use the one search method)
  
  // Get learning context for chat
  async getLearningContext(childId) {
    try {
      console.log('📚 Getting learning context for child:', childId);

      // Search for different types of content in parallel
      const [overdue, recent, assignments] = await Promise.all([
        this.search(childId, 'overdue due late', 'overdue').catch(() => ({ results: {} })),
        this.search(childId, 'recent today yesterday', 'recent').catch(() => ({ results: {} })),
        this.search(childId, '', 'assignments').catch(() => ({ results: {} }))
      ]);

      // Combine results
      const context = {
        childSubjects: [], // We'll get this from the search results
        currentMaterials: assignments.results.assignments || [],
        allMaterials: assignments.results.assignments || [],
        upcomingAssignments: [],
        overdue: overdue.results.overdue || [],
        recentWork: recent.results.recent || [],
        currentFocus: null,
        progress: null
      };

      // Find current focus (most urgent item)
      if (context.overdue.length > 0) {
        context.currentFocus = context.overdue[0];
      } else if (context.currentMaterials.length > 0) {
        // Find item due soonest
        const withDueDates = context.currentMaterials.filter(m => m.due_date);
        if (withDueDates.length > 0) {
          withDueDates.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
          context.currentFocus = withDueDates[0];
        } else {
          context.currentFocus = context.currentMaterials[0];
        }
      }

      console.log('📊 Context summary:', {
        currentMaterials: context.currentMaterials.length,
        overdue: context.overdue.length,
        recentWork: context.recentWork.length,
        hasFocus: !!context.currentFocus
      });

      return context;

    } catch (error) {
      console.error('❌ Error getting learning context:', error);
      return {
        childSubjects: [],
        currentMaterials: [],
        allMaterials: [],
        upcomingAssignments: [],
        overdue: [],
        recentWork: [],
        currentFocus: null,
        progress: null,
        error: error.message
      };
    }
  }

  // Enhanced context with grades
  async getEnhancedLearningContext(childId) {
    try {
      console.log('📈 Getting enhanced context (with grades) for child:', childId);

      // Get basic context + grades
      const [basicContext, gradesData] = await Promise.all([
        this.getLearningContext(childId),
        this.search(childId, 'grades scores percent', 'grades').catch(() => ({ results: {} }))
      ]);

      // Calculate grade analysis from results
      const grades = gradesData.results.grades || [];
      const gradeAnalysis = this.calculateGradeAnalysis(grades);

      return {
        ...basicContext,
        completedMaterials: grades.filter(g => g.completed_at),
        gradeAnalysis,
        materialsForReview: this.findMaterialsForReview(grades),
        hasLowGrades: grades.some(g => this.calculatePercentage(g) < 70),
        averageGrade: gradeAnalysis.overall.average,
        needsReview: grades.some(g => this.calculatePercentage(g) < 70),
        recentGradeCount: grades.length
      };

    } catch (error) {
      console.error('❌ Error getting enhanced context:', error);
      return {
        ...await this.getLearningContext(childId),
        gradeAnalysis: null,
        materialsForReview: [],
        hasLowGrades: false,
        averageGrade: null,
        needsReview: false,
        recentGradeCount: 0,
        error: error.message
      };
    }
  }

  // Find specific assignment/material
  async findMaterial(childId, materialName) {
    console.log(`🎯 Looking for material: "${materialName}"`);
    
    const searchResult = await this.search(childId, materialName, 'assignments');
    const assignments = searchResult.results.assignments || searchResult.results.matching_assignments || [];
    
    if (assignments.length > 0) {
      console.log(`✅ Found material: ${assignments[0].title}`);
      return assignments[0];
    }
    
    console.log(`❌ Material not found: "${materialName}"`);
    return null;
  }

  // Get material details (simplified - just search for it)
  async getMaterialDetails(materialId) {
    // For now, we don't have a specific "get by ID" search
    // But this could be added to the MCP server if needed
    console.log(`⚠️ getMaterialDetails(${materialId}) - not implemented in simplified version`);
    return null;
  }

  // Check if child has access to material
  async checkMaterialAccess(childId, materialId) {
    // Simple permission check - could search for the specific material
    console.log(`⚠️ checkMaterialAccess(${childId}, ${materialId}) - simplified to always allow`);
    return true;
  }

  // 📊 HELPER METHODS

  calculateGradeAnalysis(grades) {
    const bySubject = {};
    let totalEarned = 0;
    let totalPossible = 0;
    let gradedCount = 0;

    grades.forEach(grade => {
      const subjectName = grade.lesson?.unit?.child_subject?.custom_subject_name_override || 
                         grade.lesson?.unit?.child_subject?.subject?.name || 'General';
      
      if (!bySubject[subjectName]) {
        bySubject[subjectName] = {
          earned: 0,
          possible: 0,
          count: 0,
          materials: []
        };
      }

      bySubject[subjectName].materials.push(grade);

      if (grade.grade_value && grade.grade_max_value) {
        const earned = parseFloat(grade.grade_value);
        const possible = parseFloat(grade.grade_max_value);
        
        bySubject[subjectName].earned += earned;
        bySubject[subjectName].possible += possible;
        bySubject[subjectName].count++;
        
        totalEarned += earned;
        totalPossible += possible;
        gradedCount++;
      }
    });

    // Calculate averages
    Object.keys(bySubject).forEach(subject => {
      const data = bySubject[subject];
      data.average = data.possible > 0 ? Math.round((data.earned / data.possible) * 100 * 10) / 10 : null;
    });

    const overallAverage = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100 * 10) / 10 : null;

    return {
      bySubject,
      overall: {
        average: overallAverage,
        totalEarned,
        totalPossible,
        totalGradedMaterials: gradedCount
      }
    };
  }

  calculatePercentage(grade) {
    if (!grade.grade_value || !grade.grade_max_value) return 0;
    return (parseFloat(grade.grade_value) / parseFloat(grade.grade_max_value)) * 100;
  }

  findMaterialsForReview(grades) {
    return grades
      .filter(grade => grade.grade_value && grade.grade_max_value)
      .map(grade => ({
        ...grade,
        percentage: this.calculatePercentage(grade)
      }))
      .filter(grade => grade.percentage < 70)
      .map(grade => ({
        ...grade,
        reason: grade.percentage < 50 ? 'Failed - needs significant review' : 
               grade.percentage < 60 ? 'Below average - review recommended' : 
               'Room for improvement'
      }));
  }

  // 🔄 BACKWARD COMPATIBILITY (these methods now use search)
  
  async getCurrentMaterials(childId) {
    const result = await this.search(childId, '', 'assignments');
    return result.results.assignments || [];
  }

  async getUpcomingAssignments(childId, daysAhead = 7) {
    const result = await this.search(childId, 'due upcoming', 'assignments');
    return result.results.assignments || [];
  }

  async searchMaterials(query, childId) {
    const result = await this.search(childId, query, 'all');
    return result.results.matching_assignments || result.results.assignments || [];
  }

  async getChildMaterials(childId) {
    const result = await this.search(childId, '', 'all');
    return [
      ...(result.results.assignments || []),
      ...(result.results.matching_assignments || [])
    ];
  }

  // Deprecated methods (log warnings)
  async getCurrentLesson(childId) {
    console.warn('getCurrentLesson is deprecated, use getCurrentMaterials instead');
    const materials = await this.getCurrentMaterials(childId);
    return materials.length > 0 ? materials[0] : null;
  }

  async getLessonDetails(lessonId) {
    console.warn('getLessonDetails is deprecated, use search instead');
    return null;
  }
}

// Export singleton instance
module.exports = new MCPClientService();