// backend/src/services/mcpClient.js - ENHANCED VERSION with Material Content Access
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const {
  StdioClientTransport,
} = require("@modelcontextprotocol/sdk/client/stdio.js");
const fs = require("fs");
const path = require("path");

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

      const mcpServerPath =
        process.env.MCP_SERVER_PATH ||
        path.resolve(__dirname, "../../../../klio-mcpserver/dist/server.js");

      if (!fs.existsSync(mcpServerPath)) {
        throw new Error(
          `FIXED MCP server script not found at: ${mcpServerPath}`
        );
      }

      this.transport = new StdioClientTransport({
        command: "node",
        args: [mcpServerPath],
        env: {
          ...process.env,
          SUPABASE_URL: process.env.SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
      });

      this.client = new Client(
        { name: "klioai-enhanced-tutor-FIXED", version: "2.1.0" },
        { capabilities: {} }
      );

      await this.client.connect(this.transport);
      this.isConnected = true;
      return this.client;
    } catch (error) {
      console.error("❌ FIXED MCP connection error:", error);
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

  // 🎯 ENHANCED: Get complete material content with all questions
  async getMaterialContent(childId, materialIdentifier) {
    try {
      await this.connect();


      const result = await this.client.callTool({
        name: "get_material_content",
        arguments: {
          child_id: childId,
          material_identifier: materialIdentifier,
        },
      });

      if (!result?.content?.[0]?.text) {
        return null;
      }

      const materialData = JSON.parse(result.content[0].text);

      if (materialData.error) {
        return null;
      }


      return materialData;
    } catch (error) {
      console.error("❌ Error getting material content:", error);
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
        return null;
      }

      const questions = materialData.questions;

      // Find the specific question
      const questionPattern = new RegExp(`^${questionNumber}\\.\\s*`);
      const questionIndex = questions.findIndex((q) =>
        questionPattern.test(q.toString().trim())
      );

      if (questionIndex === -1) {
        return null;
      }

      const targetQuestion = questions[questionIndex];

      // Find the relevant instruction by looking backwards
      let relevantInstruction = null;
      for (let i = questionIndex - 1; i >= 0; i--) {
        const prevItem = questions[i];
        if (
          !/^\d+\./.test(prevItem) &&
          (prevItem.toLowerCase().includes("solve") ||
            prevItem.toLowerCase().includes("write") ||
            prevItem.toLowerCase().includes("shade") ||
            prevItem.toLowerCase().includes("round") ||
            prevItem.toLowerCase().includes("draw"))
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
          cleanText: targetQuestion.replace(/^\d+\.\s*/, "").trim(),
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

      return result;
    } catch (error) {
      console.error(`❌ Error getting specific question:`, error);
      return null;
    }
  }

  // 🚀 ENHANCED SEARCH METHOD with better completion status handling
  async search(childId, query, searchType = "all") {
    try {
      await this.connect();

      const result = await this.client.callTool({
        name: "search_database",
        arguments: {
          child_id: childId,
          query: query,
          search_type: searchType,
        },
      });

      if (!result?.content?.[0]?.text) {
        return { 
          fullContextText: "No educational data found.",
          results: {}, 
          summary: "No results found" 
        };
      }

      const responseText = result.content[0].text;

      // The new MCP server returns formatted text directly
      // Check if it's the old JSON format or new text format
      if (responseText.startsWith('{')) {
        try {
          const searchData = JSON.parse(responseText);
          // Legacy format - convert to new format
          return {
            fullContextText: this.convertLegacyToText(searchData, searchType),
            results: searchData.results || {},
            summary: searchData.summary || "Legacy format response",
          };
        } catch (parseError) {
          // If JSON parsing fails, treat as text
          return {
            fullContextText: responseText,
            results: {},
            summary: `Search results for ${searchType}`,
          };
        }
      } else {
        // New text format - return directly
        return {
          fullContextText: responseText,
          results: {},
          summary: `Search results for ${searchType}`,
        };
      }
    } catch (error) {
      console.error("❌ Search error:", error);
      return {
        error: error.message,
        fullContextText: `Error: ${error.message}`,
        results: {},
        summary: "Search failed",
      };
    }
  }

  // Helper to convert legacy JSON format to text format
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

  // 🚀 ENHANCED CONTEXT METHODS

  async getLearningContext(childId) {
    try {
      // Use the new search types for better separation of completed vs incomplete
      const [overdue, incompleteAssignments, completedAssignments] = await Promise.all([
        this.search(childId, "", "overdue").catch(() => ({
          fullContextText: "No overdue assignments found.",
          results: {},
        })),
        this.search(childId, "", "incomplete_assignments").catch(() => ({
          fullContextText: "No current assignments found.",
          results: {},
        })),
        this.search(childId, "", "completed_assignments").catch(() => ({
          fullContextText: "No completed assignments found.",
          results: {},
        })),
      ]);

      // Combine the formatted text from the new MCP server
      let combinedContext = "";
      
      if (overdue.fullContextText && !overdue.fullContextText.includes("No overdue")) {
        combinedContext += overdue.fullContextText + "\n\n";
      }
      
      if (incompleteAssignments.fullContextText && !incompleteAssignments.fullContextText.includes("No current")) {
        combinedContext += incompleteAssignments.fullContextText + "\n\n";
      }
      
      if (completedAssignments.fullContextText && !completedAssignments.fullContextText.includes("No completed")) {
        combinedContext += completedAssignments.fullContextText + "\n\n";
      }

      const context = {
        fullContextText: combinedContext.trim() || "No educational data available.",
        childSubjects: [],
        currentMaterials: incompleteAssignments?.results?.assignments || [],
        allMaterials: [], // Legacy field
        upcomingAssignments: incompleteAssignments?.results?.assignments || [],
        overdue: overdue?.results?.overdue || [],
        recentWork: completedAssignments?.results?.completed || [],
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

      return context;
    } catch (error) {
      console.error("❌ Error getting learning context:", error);
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
        error: error.message,
      };
    }
  }

  async getEnhancedLearningContext(childId) {
    try {
      const [basicContext, gradesData] = await Promise.all([
        this.getLearningContext(childId),
        this.search(childId, "", "grades").catch(() => ({
          fullContextText: "No grade data available.",
          results: {},
        })),
      ]);

      // Combine basic context with grades
      let enhancedContext = basicContext.fullContextText || "";
      
      if (gradesData.fullContextText && !gradesData.fullContextText.includes("No grade data")) {
        enhancedContext += "\n\n" + gradesData.fullContextText;
      }

      const grades = gradesData.results.grades || [];
      const gradeAnalysis = this.calculateGradeAnalysis(grades);

      return {
        ...basicContext,
        fullContextText: enhancedContext.trim() || "No educational data available.",
        completedMaterials: grades.filter((g) => g.completed_at),
        gradeAnalysis,
        materialsForReview: this.findMaterialsForReview(grades),
        hasLowGrades: grades.some((g) => this.calculatePercentage(g) < 70),
        averageGrade: gradeAnalysis.overall.average,
        needsReview: grades.some((g) => this.calculatePercentage(g) < 70),
        recentGradeCount: grades.length,
      };
    } catch (error) {
      console.error("❌ Error getting enhanced context:", error);
      const fallbackContext = await this.getLearningContext(childId);
      return {
        ...fallbackContext,
        fullContextText: (fallbackContext.fullContextText || "") + `\n\nError loading grade data: ${error.message}`,
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
    // First try search
    const searchResult = await this.search(
      childId,
      materialName,
      "assignments"
    );
    const assignments =
      searchResult.results.assignments ||
      searchResult.results.matching_assignments ||
      [];

    if (assignments.length > 0) {
      const material = assignments[0];

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

    return null;
  }

  // 🎯 NEW: Enhanced material details that includes full content
  async getMaterialDetails(materialId) {
    // For backward compatibility - this would need the child_id to work properly
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
      const searchResult = await this.search(childId, materialId, "all");
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
      console.error("❌ Error getting material details with child:", error);
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
      console.error("❌ Error checking material access:", error);
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
        "General";

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
            ? "Failed - needs significant review"
            : grade.percentage < 60
            ? "Below average - review recommended"
            : "Room for improvement",
      }));
  }

  // 🔄 BACKWARD COMPATIBILITY (these methods now use search)

  async getCurrentMaterials(childId) {
    const result = await this.search(childId, "", "incomplete_assignments");
    return result?.results?.assignments || [];
  }

  async getUpcomingAssignments(childId, daysAhead = 7) {
    const result = await this.search(childId, "", "incomplete_assignments");
    return result?.results?.assignments || [];
  }

  async searchMaterials(query, childId) {
    const result = await this.search(childId, query, "all");
    return (
      result?.results?.matching_assignments ||
      result?.results?.assignments ||
      []
    );
  }

  async getChildMaterials(childId) {
    const result = await this.search(childId, "", "all");
    return [
      ...(result?.results?.assignments || []),
      ...(result?.results?.matching_assignments || []),
    ];
  }

  // Deprecated methods (log warnings)
  async getCurrentLesson(childId) {
    const materials = await this.getCurrentMaterials(childId);
    return materials.length > 0 ? materials[0] : null;
  }

  async getLessonDetails(lessonId) {
    return null;
  }
}

// Export singleton instance
module.exports = new MCPClientService();
