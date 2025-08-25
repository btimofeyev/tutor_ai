/**
 * Unified MCP Client Base Class
 * Consolidates mcpClient.js (609 lines) + mcpClientHttp.js (1103 lines) 
 * into single interface with transport abstraction
 */

class MCPClientBase {
  constructor(transport) {
    this.transport = transport;
    this.isConnected = false;
    this.connectionPromise = null;
  }

  async connect() {
    if (this.isConnected && this.transport.isReady()) {
      return true;
    }
    if (this.connectionPromise) {
      return this.connectionPromise;
    }
    
    this.connectionPromise = this._establishConnection();
    return this.connectionPromise;
  }

  async _establishConnection() {
    try {
      console.log(`🔌 Connecting to MCP server via ${this.transport.getType()}`);
      await this.transport.connect();
      this.isConnected = true;
      this.connectionPromise = null;
      console.log(`✅ MCP client connected via ${this.transport.getType()}`);
      return true;
    } catch (error) {
      console.error(`❌ MCP connection error (${this.transport.getType()}):`, error.message);
      this.isConnected = false;
      this.connectionPromise = null;
      throw error;
    }
  }

  async disconnect() {
    if (this.transport) {
      await this.transport.disconnect();
    }
    this.isConnected = false;
    this.connectionPromise = null;
  }

  // === CORE MCP OPERATIONS ===

  async getMaterialContent(childId, materialIdentifier) {
    try {
      await this.connect();
      console.log(`📖 Getting material content: "${materialIdentifier}" for child: ${childId}`);

      const result = await this.transport.callTool('get_material_content', {
        child_id: childId,
        material_identifier: materialIdentifier,
      });

      if (!result || result.error) {
        console.log(`❌ Material error: ${result?.error || 'No data returned'}`);
        return null;
      }

      console.log(`✅ Retrieved material: "${result.material?.title}" with ${result.total_questions || 0} questions`);
      return result;
    } catch (error) {
      console.error('❌ Error getting material content:', error);
      return null;
    }
  }

  async getSpecificQuestion(childId, materialIdentifier, questionNumber) {
    try {
      const materialData = await this.getMaterialContent(childId, materialIdentifier);
      
      if (!materialData || !materialData.questions) {
        console.log(`❌ No questions found for material: ${materialIdentifier}`);
        return null;
      }

      const questions = materialData.questions;
      const questionPattern = new RegExp(`^${questionNumber}\\.\\s*`);
      const questionIndex = questions.findIndex((q) =>
        questionPattern.test(q.toString().trim())
      );

      if (questionIndex === -1) {
        console.log(`❌ Question ${questionNumber} not found in ${materialIdentifier}`);
        return null;
      }

      const targetQuestion = questions[questionIndex];

      // Find relevant instruction by looking backwards
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

      console.log(`✅ Found question ${questionNumber}: "${result.question.cleanText}"`);
      return result;
    } catch (error) {
      console.error(`❌ Error getting specific question:`, error);
      return null;
    }
  }

  async search(childId, query, searchType = 'all') {
    try {
      await this.connect();
      console.log(`🔍 Searching: "${query}" (type: ${searchType}) for child: ${childId}`);

      const result = await this.transport.callTool('search_database', {
        child_id: childId,
        query: query,
        search_type: searchType,
      });

      if (!result) {
        console.log('❌ No search results returned');
        return { 
          fullContextText: "No educational data found.",
          results: {}, 
          summary: 'No results found' 
        };
      }

      console.log(`✅ Search completed for ${searchType}`, typeof result, result?.length || 'no length');
      
      // Handle both text and JSON responses from different transport types
      if (typeof result === 'string') {
        return {
          fullContextText: result,
          results: this.parseTextSearchResponse(result, searchType),
          summary: result.includes('No results found') ? 'No results found' : 'Search completed',
          raw_response: result
        };
      } else if (result && typeof result === 'object') {
        // Check if this is a wrapped response from simplified HTTP transport
        if (result.result && typeof result.result === 'string') {
          console.log(`📦 Unwrapping HTTP transport response: ${result.result.length} characters`);
          return {
            fullContextText: result.result,
            results: this.parseTextSearchResponse(result.result, searchType),
            summary: result.result.includes('No results found') ? 'No results found' : 'Search completed',
            raw_response: result.result
          };
        }
        
        return {
          fullContextText: result.fullContextText || this.convertLegacyToText(result, searchType),
          results: result.results || {},
          summary: result.summary || 'Search completed'
        };
      }

      return {
        fullContextText: result?.toString() || "Unknown response format",
        results: {},
        summary: 'Unknown response format',
        raw_response: result
      };
    } catch (error) {
      console.error('❌ Search error:', error);
      return {
        error: error.message,
        fullContextText: `Error: ${error.message}`,
        results: {},
        summary: 'Search failed',
      };
    }
  }

  async getLearningContext(childId) {
    try {
      console.log('📚 Getting learning context for child:', childId);

      // Get comprehensive educational context
      const fullContext = await this.search(childId, '', 'all').catch(() => ({
        results: {},
        raw_response: ''
      }));

      const context = {
        fullContextText: fullContext.raw_response || fullContext.fullContextText || '',
        childSubjects: [],
        currentMaterials: [],
        allMaterials: [],
        upcomingAssignments: [],
        overdue: [],
        recentWork: [],
        currentFocus: null,
        progress: null,
        lessons: [],
        tests: [],
        quizzes: [],
        worksheets: [],
        studyMaterials: []
      };

      // Parse comprehensive response if available
      if (fullContext.fullContextText || fullContext.raw_response) {
        const response = fullContext.fullContextText || fullContext.raw_response;
        context.lessons = this.parseLessonsFromText(response);
        context.overdue = this.parseOverdueFromText(response);
        context.recentWork = this.parseGradesFromText(response);
      }

      // Set current focus (most urgent item)
      if (context.overdue.length > 0) {
        context.currentFocus = context.overdue[0];
      } else if (context.lessons.length > 0) {
        const withDueDates = context.lessons.filter(l => l.due_date);
        if (withDueDates.length > 0) {
          withDueDates.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
          context.currentFocus = withDueDates[0];
        } else {
          context.currentFocus = context.lessons[0];
        }
      }

      console.log('📊 Context summary:', {
        lessons: context.lessons.length,
        overdue: context.overdue.length,
        recentWork: context.recentWork.length,
        hasFocus: !!context.currentFocus
      });

      return context;
    } catch (error) {
      console.error('❌ Error getting learning context:', error);
      return {
        fullContextText: `Error loading educational data: ${error.message}`,
        childSubjects: [],
        currentMaterials: [],
        allMaterials: [],
        upcomingAssignments: [],
        overdue: [],
        recentWork: [],
        currentFocus: null,
        progress: null,
        lessons: [],
        tests: [],
        quizzes: [],
        worksheets: [],
        studyMaterials: [],
        error: error.message,
      };
    }
  }

  async getEnhancedLearningContext(childId) {
    try {
      console.log('📈 Getting enhanced context (with grades) for child:', childId);

      const [basicContext, gradesData] = await Promise.all([
        this.getLearningContext(childId),
        this.search(childId, 'grades scores percent', 'grades').catch(() => ({ results: {} })),
      ]);

      let enhancedContextText = basicContext.fullContextText || '';
      if (gradesData.fullContextText && !gradesData.fullContextText.includes('No grade data')) {
        enhancedContextText += '\n\n' + gradesData.fullContextText;
      }

      const grades = gradesData.results.grades || [];
      const gradeAnalysis = this.calculateGradeAnalysis(grades);

      return {
        ...basicContext,
        fullContextText: enhancedContextText.trim() || 'No educational data available.',
        completedMaterials: grades.filter(g => g.completed_at),
        gradeAnalysis,
        materialsForReview: this.findMaterialsForReview(grades),
        hasLowGrades: grades.some(g => this.calculatePercentage(g) < 70),
        averageGrade: gradeAnalysis.overall.average,
        needsReview: grades.some(g => this.calculatePercentage(g) < 70),
        recentGradeCount: grades.length,
      };
    } catch (error) {
      console.error('❌ Error getting enhanced context:', error);
      const fallbackContext = await this.getLearningContext(childId);
      return {
        ...fallbackContext,
        fullContextText: (fallbackContext.fullContextText || '') + `\n\nError loading grade data: ${error.message}`,
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

  // === MATERIAL OPERATIONS ===

  async findMaterial(childId, materialName) {
    console.log(`🎯 Looking for material: "${materialName}"`);
    
    const searchResult = await this.search(childId, materialName, 'assignments');
    const assignments = searchResult.results.assignments || searchResult.results.matching_assignments || [];

    if (assignments.length > 0) {
      const material = assignments[0];
      console.log(`✅ Found material: ${material.title}`);

      if (material.has_content) {
        const fullContent = await this.getMaterialContent(childId, material.title);
        if (fullContent) {
          return { ...material, full_content: fullContent };
        }
      }
      return material;
    }

    console.log(`❌ Material not found: "${materialName}"`);
    return null;
  }

  async getMaterialDetailsWithChild(childId, materialId) {
    try {
      const materialData = await this.getMaterialContent(childId, materialId);
      if (materialData) return materialData;

      const searchResult = await this.search(childId, materialId, 'all');
      const allResults = [
        ...(searchResult.results.assignments || []),
        ...(searchResult.results.matching_assignments || []),
      ];

      const material = allResults.find(m => m.id === materialId);
      if (material) {
        const fullContent = await this.getMaterialContent(childId, material.title);
        return fullContent || material;
      }

      return null;
    } catch (error) {
      console.error('❌ Error getting material details with child:', error);
      return null;
    }
  }

  async checkMaterialAccess(childId, materialId) {
    try {
      const material = await this.getMaterialDetailsWithChild(childId, materialId);
      return !!material;
    } catch (error) {
      console.error('❌ Error checking material access:', error);
      return false;
    }
  }

  // === BACKWARD COMPATIBILITY METHODS ===

  async getCurrentMaterials(childId) {
    const result = await this.search(childId, '', 'incomplete_assignments');
    return result?.results?.assignments || [];
  }

  async getUpcomingAssignments(childId, daysAhead = 7) {
    const result = await this.search(childId, '', 'incomplete_assignments');
    return result?.results?.assignments || [];
  }

  async searchMaterials(query, childId) {
    const result = await this.search(childId, query, 'all');
    return result?.results?.matching_assignments || result?.results?.assignments || [];
  }

  async getChildMaterials(childId) {
    const result = await this.search(childId, '', 'all');
    return [
      ...(result?.results?.assignments || []),
      ...(result?.results?.matching_assignments || []),
    ];
  }

  // Deprecated methods
  async getCurrentLesson(childId) {
    console.warn('getCurrentLesson is deprecated, use getCurrentMaterials instead');
    const materials = await this.getCurrentMaterials(childId);
    return materials.length > 0 ? materials[0] : null;
  }

  async getLessonDetails(lessonId) {
    console.warn('getLessonDetails is deprecated, use getMaterialContent instead');
    return null;
  }

  async getMaterialDetails(materialId) {
    console.warn('getMaterialDetails(materialId) is deprecated, use getMaterialDetailsWithChild(childId, materialId) instead');
    return null;
  }

  // === PARSING HELPERS ===

  parseTextSearchResponse(textResponse, searchType) {
    const results = {
      assignments: [],
      overdue: [],
      grades: [],
      subjects: []
    };
    
    if (!textResponse || textResponse.includes('No results found') || textResponse.includes('Error:')) {
      return results;
    }
    
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
    
    if (searchType === 'all' || searchType === 'assignments') {
      results.assignments = [...results.overdue, ...results.grades];
    }
    
    return results;
  }

  parseLessonsFromText(text) {
    const lessons = [];
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('- ')) {
        const lessonMatch = line.match(/- (?:📄|📚|📝|❓|📋)\s*\*\*(.+?)\*\*\s*\[(.+?)\]\s*\((.+?)\)(?:\s*-\s*Due:\s*(.+))?$/);
        if (lessonMatch) {
          const lesson = {
            title: lessonMatch[1].trim(),
            content_type: lessonMatch[2].trim(),
            subject: lessonMatch[3].trim(),
            due_date: lessonMatch[4] ? lessonMatch[4].trim() : null
          };
          lessons.push(lesson);
        }
      }
    }
    
    return lessons;
  }

  parseOverdueFromText(text) {
    const assignments = [];
    const lines = text.split('\n');
    
    lines.forEach(line => {
      if (line.trim().startsWith('- ') && line.includes('OVERDUE')) {
        const match = line.match(/- (.+?) - Due: (.+)$/);
        if (match) {
          assignments.push({
            title: match[1].trim(),
            due_date: match[2].trim(),
            status: 'overdue'
          });
        }
      }
    });
    
    return assignments;
  }

  parseGradesFromText(text) {
    const grades = [];
    const lines = text.split('\n');
    
    lines.forEach(line => {
      if (line.trim().startsWith('- ') && line.includes('%')) {
        const match = line.match(/- (.+?) - (\d+)\/(\d+) \((\d+)%\)$/);
        if (match) {
          grades.push({
            title: match[1].trim(),
            grade_value: parseInt(match[2]),
            grade_max_value: parseInt(match[3]),
            percentage: parseInt(match[4]),
            completed_at: true
          });
        }
      }
    });
    
    return grades;
  }

  parseAssignmentLine(line) {
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

  convertLegacyToText(searchData, searchType) {
    let text = `📚 **Educational Data (${searchType}):**\n\n`;
    
    if (searchData.results.assignments) {
      text += `📝 **Assignments (${searchData.results.assignments.length}):**\n`;
      searchData.results.assignments.forEach((assignment, index) => {
        const completionStatus = assignment.completed_at ? '✅ COMPLETED' : '📝 CURRENT';
        const dueInfo = assignment.due_date ? ` - Due: ${assignment.due_date}` : '';
        text += `${index + 1}. ${completionStatus} **${assignment.title}**${dueInfo}\n`;
      });
      text += '\n';
    }

    if (searchData.results.grades) {
      text += `📊 **Grades (${searchData.results.grades.length}):**\n`;
      searchData.results.grades.forEach((grade, index) => {
        const percentage = grade.grade_value && grade.grade_max_value ? 
          Math.round((grade.grade_value / grade.grade_max_value) * 100) : 'N/A';
        text += `${index + 1}. **${grade.title}** - ${percentage}%\n`;
      });
      text += '\n';
    }

    return text;
  }

  // === ANALYSIS HELPERS ===

  calculateGradeAnalysis(grades) {
    const bySubject = {};
    let totalEarned = 0;
    let totalPossible = 0;
    let gradedCount = 0;

    grades.forEach((grade) => {
      const subjectName = grade.lesson?.unit?.child_subject?.custom_subject_name_override ||
                         grade.lesson?.unit?.child_subject?.subject?.name || 'General';

      if (!bySubject[subjectName]) {
        bySubject[subjectName] = { earned: 0, possible: 0, count: 0, materials: [] };
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

    Object.keys(bySubject).forEach((subject) => {
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
        totalGradedMaterials: gradedCount,
      },
    };
  }

  calculatePercentage(grade) {
    if (!grade.grade_value || !grade.grade_max_value) return 0;
    return (parseFloat(grade.grade_value) / parseFloat(grade.grade_max_value)) * 100;
  }

  findMaterialsForReview(grades) {
    return grades
      .filter((grade) => grade.grade_value && grade.grade_max_value)
      .map((grade) => ({ ...grade, percentage: this.calculatePercentage(grade) }))
      .filter((grade) => grade.percentage < 70)
      .map((grade) => ({
        ...grade,
        reason: grade.percentage < 50 ? 'Failed - needs significant review' :
               grade.percentage < 60 ? 'Below average - review recommended' : 'Room for improvement',
      }));
  }
}

module.exports = MCPClientBase;