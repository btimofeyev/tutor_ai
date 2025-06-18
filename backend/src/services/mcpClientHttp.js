// backend/src/services/mcpClientHttp.js - HTTP-based MCP Client for Railway deployment
const axios = require('axios');
const EventSource = require('eventsource');

class MCPClientHttpService {
  constructor() {
    this.baseUrl = process.env.MCP_SERVER_URL || 'http://localhost:3000';
    this.isConnected = false;
    this.sessionId = null;
    this.messagesUrl = null;
    this.eventSource = null;
    this.requestId = 0;
    this.connectionPromise = null; // Track ongoing connection attempts
    this.maxRetries = 3;
    this.retryDelay = 2000; // 2 seconds
  }

  async connect(retryCount = 0) {
    // If already connected, return success
    if (this.isConnected && this.messagesUrl) {
      return true;
    }

    // If there's already a connection attempt in progress, wait for it
    if (this.connectionPromise) {
      try {
        return await this.connectionPromise;
      } catch (error) {
        // Connection failed, reset and try again
        this.connectionPromise = null;
      }
    }

    // Start new connection attempt
    this.connectionPromise = this._doConnect(retryCount);
    
    try {
      const result = await this.connectionPromise;
      this.connectionPromise = null;
      return result;
    } catch (error) {
      this.connectionPromise = null;
      throw error;
    }
  }

  async _doConnect(retryCount = 0) {
    try {
      console.log(`Connecting to MCP server at: ${this.baseUrl} (attempt ${retryCount + 1})`);
      
      // Test health first
      const healthResponse = await axios.get(`${this.baseUrl}/health`, {
        timeout: 5000
      });
      
      if (healthResponse.status !== 200) {
        throw new Error('Health check failed');
      }

      // Establish SSE connection to get session
      await this.establishSession();
      
      // Initialize MCP connection
      await this.initializeMCP();
      
      this.isConnected = true;
      console.log('✅ Connected to MCP server via HTTP/SSE');
      return true;
    } catch (error) {
      console.error(`❌ MCP HTTP connection error (attempt ${retryCount + 1}):`, error.message);
      this.isConnected = false;
      
      // Clean up failed connection
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }
      this.sessionId = null;
      this.messagesUrl = null;
      
      // Retry logic
      if (retryCount < this.maxRetries - 1) {
        console.log(`⏳ Retrying connection in ${this.retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this._doConnect(retryCount + 1);
      }
      
      throw error;
    }
  }

  // Ensure connection before any operation
  async ensureConnected() {
    if (!this.isConnected || !this.messagesUrl) {
      await this.connect();
    }
  }

  async establishSession() {
    return new Promise((resolve, reject) => {
      console.log('🔌 Establishing SSE session...');
      
      this.eventSource = new EventSource(`${this.baseUrl}/sse`);
      
      this.eventSource.addEventListener('endpoint', (event) => {
        console.log('📡 Received endpoint event:', event.data);
        this.messagesUrl = `${this.baseUrl}${event.data}`;
        
        // Extract session ID from URL
        const urlParams = new URLSearchParams(event.data.split('?')[1]);
        this.sessionId = urlParams.get('sessionId');
        
        console.log(`✅ Session established: ${this.sessionId}`);
        resolve();
      });

      this.eventSource.addEventListener('error', (error) => {
        console.error('❌ SSE connection error:', error);
        reject(new Error('Failed to establish SSE session'));
      });

      setTimeout(() => {
        reject(new Error('SSE session timeout'));
      }, 10000);
    });
  }

  async initializeMCP() {
    const initMessage = {
      jsonrpc: '2.0',
      id: ++this.requestId,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'ai-tutor-client',
          version: '1.0.0'
        }
      }
    };

    const response = await this.sendMessage(initMessage);
    console.log('✅ MCP initialized:', response);

    // Send initialized notification
    await this.sendMessage({
      jsonrpc: '2.0',
      method: 'initialized'
    });
  }

  async sendMessage(message) {
    if (!this.messagesUrl) {
      throw new Error('No active MCP session');
    }

    try {
      const response = await axios.post(this.messagesUrl, message, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      console.error('❌ Error sending MCP message:', error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
    this.sessionId = null;
    this.messagesUrl = null;
  }

  // Call MCP tool using JSON-RPC protocol
  async callTool(toolName, args) {
    try {
      // Ensure we have an active connection
      await this.ensureConnected();
      
      const toolCallMessage = {
        jsonrpc: '2.0',
        id: ++this.requestId,
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args
        }
      };

      const response = await this.sendMessage(toolCallMessage);
      
      if (response.error) {
        throw new Error(`MCP tool error: ${response.error.message}`);
      }

      // Extract text content from MCP response
      if (response.result && response.result.content) {
        const textContent = response.result.content
          .filter(item => item.type === 'text')
          .map(item => item.text)
          .join('\n');
        
        // Try to parse as JSON if it looks like structured data
        try {
          return JSON.parse(textContent);
        } catch {
          return textContent;
        }
      }

      return response.result;
    } catch (error) {
      console.error(`❌ Error calling tool ${toolName}:`, error.message);
      
      // If it's a connection error, reset connection state
      if (error.message.includes('No active MCP session') || 
          error.message.includes('Network Error') ||
          error.code === 'ECONNREFUSED') {
        console.log('🔄 Connection lost, resetting...');
        this.isConnected = false;
        this.messagesUrl = null;
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
      }
      
      throw error;
    }
  }

  // 🎯 ENHANCED: Get complete material content with all questions
  async getMaterialContent(childId, materialIdentifier) {
    try {
      console.log(
        `📖 Getting material content: "${materialIdentifier}" for child: ${childId}`
      );

      const result = await this.callTool('get_material_content', {
        child_id: childId,
        material_identifier: materialIdentifier,
      });

      if (!result || result.error) {
        console.log(`❌ Material error: ${result?.error || 'No data returned'}`);
        return null;
      }

      console.log(
        `✅ Retrieved material: "${result.material.title}" with ${result.total_questions} questions`
      );

      return result;
    } catch (error) {
      console.error('❌ Error getting material content:', error);
      return null;
    }
  }

  // 🎯 ENHANCED: Extract specific question from material
  async getSpecificQuestion(childId, materialIdentifier, questionNumber) {
    try {
      const materialData = await this.getMaterialContent(
        childId,
        materialIdentifier
      );

      if (!materialData || !materialData.questions) {
        console.log(
          `❌ No questions found for material: ${materialIdentifier}`
        );
        return null;
      }

      const questions = materialData.questions;

      // Find the specific question
      const questionPattern = new RegExp(`^${questionNumber}\\.\\s*`);
      const questionIndex = questions.findIndex((q) =>
        questionPattern.test(q.toString().trim())
      );

      if (questionIndex === -1) {
        console.log(
          `❌ Question ${questionNumber} not found in ${materialIdentifier}`
        );
        return null;
      }

      const targetQuestion = questions[questionIndex];

      // Find the relevant instruction by looking backwards
      let relevantInstruction = null;
      for (let i = questionIndex - 1; i >= 0; i--) {
        const prevItem = questions[i];
        if (
          !/^\d+\./.test(prevItem) &&
          (prevItem.toLowerCase().includes('solve') ||
            prevItem.toLowerCase().includes('write') ||
            prevItem.toLowerCase().includes('shade') ||
            prevItem.toLowerCase().includes('round') ||
            prevItem.toLowerCase().includes('draw'))
        ) {
          relevantInstruction = prevItem;
          break;
        }
      }

      const result = {
        material: materialData.material,
        question: {
          number: questionNumber,
          text: targetQuestion,
          cleanText: targetQuestion.replace(/^\d+\.\s*/, '').trim(),
          instruction: relevantInstruction,
          index: questionIndex,
          totalQuestions: questions.length,
        },
        context: {
          learningObjectives: materialData.learning_objectives,
          contentType: materialData.material.content_type,
          subject: materialData.material.subject,
        },
      };

      console.log(
        `✅ Found question ${questionNumber}: "${result.question.cleanText}"`
      );
      return result;
    } catch (error) {
      console.error(`❌ Error getting specific question:`, error);
      return null;
    }
  }

  // 🚀 EXISTING SEARCH METHOD (enhanced)
  async search(childId, query, searchType = 'all') {
    try {
      console.log(
        `🔍 Searching: "${query}" (type: ${searchType}) for child: ${childId}`
      );

      const result = await this.callTool('search_database', {
        child_id: childId,
        query: query,
        search_type: searchType,
      });

      if (!result) {
        console.log('❌ No search results returned');
        return { results: {}, summary: 'No results found' };
      }

      console.log(`✅ Search completed`);
      
      // Handle plain text response from MCP server
      if (typeof result === 'string') {
        console.log('📄 Received text response from MCP server');
        
        // Parse the structured text response
        const parsedResults = this.parseTextSearchResponse(result, searchType);
        
        return {
          results: parsedResults,
          summary: result.includes('No results found') ? 'No results found' : 'Search completed',
          raw_response: result
        };
      }

      // Handle JSON response (fallback)
      if (result && typeof result === 'object') {
        console.log('📊 Received JSON response from MCP server');
        return result;
      }

      // Fallback for unexpected format
      console.log('⚠️ Unexpected response format, returning as summary');
      return {
        results: {},
        summary: result?.toString() || 'Unknown response format',
        raw_response: result
      };
      
    } catch (error) {
      console.error('❌ Search error:', error);
      return {
        error: error.message,
        results: {},
        summary: 'Search failed',
      };
    }
  }

  // Parse plain text response from MCP server into structured data
  parseTextSearchResponse(textResponse, searchType) {
    const results = {};
    
    // Initialize result categories
    results.assignments = [];
    results.overdue = [];
    results.grades = [];
    results.subjects = [];
    
    if (!textResponse || textResponse.includes('No results found') || textResponse.includes('Error:')) {
      return results;
    }
    
    // Split response into sections
    const sections = textResponse.split('\n\n');
    
    sections.forEach(section => {
      if (section.includes('Overdue Assignments:')) {
        const overdueLines = section.split('\n').slice(1);
        results.overdue = overdueLines
          .filter(line => line.trim().startsWith('- '))
          .map(line => this.parseAssignmentLine(line));
      }
      
      if (section.includes('Recent Grades:')) {
        const gradeLines = section.split('\n').slice(1);
        results.grades = gradeLines
          .filter(line => line.trim().startsWith('- '))
          .map(line => this.parseGradeLine(line));
      }
      
      if (section.includes('Enrolled Subjects:')) {
        const subjectLines = section.split('\n').slice(1);
        results.subjects = subjectLines
          .filter(line => line.trim().startsWith('- '))
          .map(line => line.replace('- ', '').trim());
      }
    });
    
    // For general searches, put everything in assignments
    if (searchType === 'all' || searchType === 'assignments') {
      results.assignments = [...results.overdue, ...results.grades];
    }
    
    return results;
  }
  
  parseAssignmentLine(line) {
    // Parse "- Assignment Title - Due: 2024-01-01"
    const match = line.match(/^- (.+?) - Due: (.+)$/);
    if (match) {
      return {
        title: match[1].trim(),
        due_date: match[2].trim(),
        status: 'overdue'
      };
    }
    return { title: line.replace('- ', '').trim() };
  }
  
  parseGradeLine(line) {
    // Parse "- Assignment Title - 85/100 (85%)"
    const match = line.match(/^- (.+?) - (\d+)\/(\d+) \((\d+)%\)$/);
    if (match) {
      return {
        title: match[1].trim(),
        grade_value: parseInt(match[2]),
        grade_max_value: parseInt(match[3]),
        percentage: parseInt(match[4])
      };
    }
    return { title: line.replace('- ', '').trim() };
  }

  // 🚀 ENHANCED CONTEXT METHODS

  async getLearningContext(childId) {
    try {
      console.log('📚 Getting learning context for child:', childId);

      const [overdue, recent, assignments] = await Promise.all([
        this.search(childId, 'overdue due late', 'overdue').catch(() => ({
          results: {},
        })),
        this.search(childId, 'recent today yesterday', 'recent').catch(() => ({
          results: {},
        })),
        this.search(childId, '', 'assignments').catch(() => ({ results: {} })),
      ]);

      console.log('🔍 Debug - overdue response:', overdue);
      console.log('🔍 Debug - recent response:', recent);
      console.log('🔍 Debug - assignments response:', assignments);

      const context = {
        childSubjects: [],
        currentMaterials: assignments?.results?.assignments || [],
        allMaterials: assignments?.results?.assignments || [],
        upcomingAssignments: [],
        overdue: overdue?.results?.overdue || [],
        recentWork: recent?.results?.recent || [],
        currentFocus: null,
        progress: null,
      };

      // Find current focus (most urgent item)
      if (context.overdue.length > 0) {
        context.currentFocus = context.overdue[0];
      } else if (context.currentMaterials.length > 0) {
        const withDueDates = context.currentMaterials.filter((m) => m.due_date);
        if (withDueDates.length > 0) {
          withDueDates.sort(
            (a, b) => new Date(a.due_date) - new Date(b.due_date)
          );
          context.currentFocus = withDueDates[0];
        } else {
          context.currentFocus = context.currentMaterials[0];
        }
      }

      console.log('📊 Context summary:', {
        currentMaterials: context.currentMaterials.length,
        overdue: context.overdue.length,
        recentWork: context.recentWork.length,
        hasFocus: !!context.currentFocus,
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
        error: error.message,
      };
    }
  }

  async getEnhancedLearningContext(childId) {
    try {
      console.log(
        '📈 Getting enhanced context (with grades) for child:',
        childId
      );

      const [basicContext, gradesData] = await Promise.all([
        this.getLearningContext(childId),
        this.search(childId, 'grades scores percent', 'grades').catch(() => ({
          results: {},
        })),
      ]);

      const grades = gradesData.results.grades || [];
      const gradeAnalysis = this.calculateGradeAnalysis(grades);

      return {
        ...basicContext,
        completedMaterials: grades.filter((g) => g.completed_at),
        gradeAnalysis,
        materialsForReview: this.findMaterialsForReview(grades),
        hasLowGrades: grades.some((g) => this.calculatePercentage(g) < 70),
        averageGrade: gradeAnalysis.overall.average,
        needsReview: grades.some((g) => this.calculatePercentage(g) < 70),
        recentGradeCount: grades.length,
      };
    } catch (error) {
      console.error('❌ Error getting enhanced context:', error);
      return {
        ...(await this.getLearningContext(childId)),
        gradeAnalysis: null,
        materialsForReview: [],
        hasLowGrades: false,
        averageGrade: null,
        needsReview: false,
        recentGradeCount: 0,
        error: error.message,
      };
    }
  }

  // 🎯 ENHANCED: Find specific material with content access
  async findMaterial(childId, materialName) {
    console.log(`🎯 Looking for material: "${materialName}"`);

    // First try search
    const searchResult = await this.search(
      childId,
      materialName,
      'assignments'
    );
    const assignments =
      searchResult.results.assignments ||
      searchResult.results.matching_assignments ||
      [];

    if (assignments.length > 0) {
      const material = assignments[0];
      console.log(`✅ Found material: ${material.title}`);

      // Try to get full content if it has lesson_json
      if (material.has_content) {
        const fullContent = await this.getMaterialContent(
          childId,
          material.title
        );
        if (fullContent) {
          return {
            ...material,
            full_content: fullContent,
          };
        }
      }

      return material;
    }

    console.log(`❌ Material not found: "${materialName}"`);
    return null;
  }

  // 🎯 NEW: Enhanced material details that includes full content
  async getMaterialDetails(materialId) {
    // For backward compatibility - this would need the child_id to work properly
    console.log(
      `⚠️ getMaterialDetails(${materialId}) - requires child_id for enhanced version`
    );
    return null;
  }

  // 🎯 NEW: Get material details with child context
  async getMaterialDetailsWithChild(childId, materialId) {
    try {
      // Try to get by ID first
      const materialData = await this.getMaterialContent(childId, materialId);
      if (materialData) {
        return materialData;
      }

      // If ID doesn't work, search for it
      const searchResult = await this.search(childId, materialId, 'all');
      const allResults = [
        ...(searchResult.results.assignments || []),
        ...(searchResult.results.matching_assignments || []),
      ];

      const material = allResults.find((m) => m.id === materialId);
      if (material) {
        // Try to get full content
        const fullContent = await this.getMaterialContent(
          childId,
          material.title
        );
        return fullContent || material;
      }

      return null;
    } catch (error) {
      console.error('❌ Error getting material details with child:', error);
      return null;
    }
  }

  // Check if child has access to material
  async checkMaterialAccess(childId, materialId) {
    try {
      const material = await this.getMaterialDetailsWithChild(
        childId,
        materialId
      );
      return !!material;
    } catch (error) {
      console.error('❌ Error checking material access:', error);
      return false;
    }
  }

  // 📊 HELPER METHODS

  calculateGradeAnalysis(grades) {
    const bySubject = {};
    let totalEarned = 0;
    let totalPossible = 0;
    let gradedCount = 0;

    grades.forEach((grade) => {
      const subjectName =
        grade.lesson?.unit?.child_subject?.custom_subject_name_override ||
        grade.lesson?.unit?.child_subject?.subject?.name ||
        'General';

      if (!bySubject[subjectName]) {
        bySubject[subjectName] = {
          earned: 0,
          possible: 0,
          count: 0,
          materials: [],
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
    Object.keys(bySubject).forEach((subject) => {
      const data = bySubject[subject];
      data.average =
        data.possible > 0
          ? Math.round((data.earned / data.possible) * 100 * 10) / 10
          : null;
    });

    const overallAverage =
      totalPossible > 0
        ? Math.round((totalEarned / totalPossible) * 100 * 10) / 10
        : null;

    return {
      bySubject,
      overall: {
        average: overallAverage,
        totalEarned,
        totalPossible,
        totalGradedMaterials: gradedCount,
      },
    };
  }

  calculatePercentage(grade) {
    if (!grade.grade_value || !grade.grade_max_value) return 0;
    return (
      (parseFloat(grade.grade_value) / parseFloat(grade.grade_max_value)) * 100
    );
  }

  findMaterialsForReview(grades) {
    return grades
      .filter((grade) => grade.grade_value && grade.grade_max_value)
      .map((grade) => ({
        ...grade,
        percentage: this.calculatePercentage(grade),
      }))
      .filter((grade) => grade.percentage < 70)
      .map((grade) => ({
        ...grade,
        reason:
          grade.percentage < 50
            ? 'Failed - needs significant review'
            : grade.percentage < 60
            ? 'Below average - review recommended'
            : 'Room for improvement',
      }));
  }

  // 🔄 BACKWARD COMPATIBILITY (these methods now use search)

  async getCurrentMaterials(childId) {
    const result = await this.search(childId, '', 'assignments');
    return result?.results?.assignments || [];
  }

  async getUpcomingAssignments(childId, daysAhead = 7) {
    const result = await this.search(childId, 'due upcoming', 'assignments');
    return result?.results?.assignments || [];
  }

  async searchMaterials(query, childId) {
    const result = await this.search(childId, query, 'all');
    return (
      result?.results?.matching_assignments ||
      result?.results?.assignments ||
      []
    );
  }

  async getChildMaterials(childId) {
    const result = await this.search(childId, '', 'all');
    return [
      ...(result?.results?.assignments || []),
      ...(result?.results?.matching_assignments || []),
    ];
  }

  // Deprecated methods (log warnings)
  async getCurrentLesson(childId) {
    console.warn(
      'getCurrentLesson is deprecated, use getCurrentMaterials instead'
    );
    const materials = await this.getCurrentMaterials(childId);
    return materials.length > 0 ? materials[0] : null;
  }

  async getLessonDetails(lessonId) {
    console.warn(
      'getLessonDetails is deprecated, use getMaterialContent instead'
    );
    return null;
  }
}

// Export singleton instance
module.exports = new MCPClientHttpService();