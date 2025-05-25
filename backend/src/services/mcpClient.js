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
        path.resolve(__dirname, '../../../MCP Server/index.js');
      console.log('About to spawn MCP server at:', mcpServerPath);

      if (!fs.existsSync(mcpServerPath)) {
        throw new Error(`MCP server script not found at: ${mcpServerPath}`);
      }

      // Let MCP SDK spawn the process (no manual spawn here!)
      this.transport = new StdioClientTransport({
        command: 'node',
        args: [mcpServerPath],
        env: {
          ...process.env,
          SUPABASE_URL: process.env.SUPABASE_URL,
          SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
        }
      });

      this.client = new Client(
        {
          name: 'klioai-tutor',
          version: '1.0.0'
        },
        {
          capabilities: {}
        }
      );

      await this.client.connect(this.transport);

      // Get available tools
      const toolsResult = await this.client.listTools();
      this.tools = toolsResult.tools || [];

      console.log('Connected to MCP server with tools:', this.tools.map(t => t.name));

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

  // Get current lesson for a child
  async getCurrentLesson(childId, subjectId) {
    try {
      await this.connect();

      const result = await this.client.callTool({
        name: 'get_child_lessons',
        arguments: {
          child_id: childId,
          status: 'active'
        }
      });

      if (!result || !result.content) {
        return null;
      }

      const lessons = JSON.parse(result.content[0].text);

      // Filter by subject if provided
      let filteredLessons = lessons;
      if (subjectId) {
        filteredLessons = lessons.filter(lesson =>
          lesson.child_subjects?.subjects?.id === subjectId
        );
      }

      // Find the most relevant current lesson (by due date or created date)
      const currentLesson = filteredLessons
        .filter(lesson => lesson.status !== 'completed')
        .sort((a, b) => {
          if (a.due_date && b.due_date) {
            return new Date(a.due_date) - new Date(b.due_date);
          }
          return new Date(b.created_at) - new Date(a.created_at);
        })[0];

      return currentLesson || null;

    } catch (error) {
      console.error('Error getting current lesson:', error);
      return null;
    }
  }

  // Get lesson details
  async getLessonDetails(lessonId) {
    try {
      await this.connect();

      const result = await this.client.callTool({
        name: 'get_lesson_details',
        arguments: {
          lesson_id: lessonId
        }
      });

      if (!result || !result.content) {
        return null;
      }

      return JSON.parse(result.content[0].text);

    } catch (error) {
      console.error('Error getting lesson details:', error);
      return null;
    }
  }

  // Get upcoming assignments
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

  // Search lessons by query
  async searchLessons(query, childId, subjectName) {
    try {
      await this.connect();

      const result = await this.client.callTool({
        name: 'search_lessons',
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
      console.error('Error searching lessons:', error);
      return [];
    }
  }

  // Check if child has access to a specific lesson
  async checkLessonAccess(childId, lessonId) {
    try {
      const lessons = await this.getChildLessons(childId);
      return lessons.some(lesson => lesson.id === lessonId);
    } catch (error) {
      console.error('Error checking lesson access:', error);
      return false;
    }
  }

  // Get all lessons for a child
  async getChildLessons(childId, status = null) {
    try {
      await this.connect();

      const args = { child_id: childId };
      if (status) {
        args.status = status;
      }

      const result = await this.client.callTool({
        name: 'get_child_lessons',
        arguments: args
      });

      if (!result || !result.content) {
        return [];
      }

      return JSON.parse(result.content[0].text);

    } catch (error) {
      console.error('Error getting child lessons:', error);
      return [];
    }
  }

  // Get child's progress
  async getChildProgress(childId) {
    try {
      await this.connect();

      const result = await this.client.readResource({
        uri: `tutor://child/${childId}/progress`
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
}

// Export singleton instance
module.exports = new MCPClientService();
