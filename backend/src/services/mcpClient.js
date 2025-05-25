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

  // ===== MISSING METHODS - ADD THESE =====

  // Get current lessons for a child (enhanced version)
  async getCurrentLessons(childId, subjectName = null) {
    try {
      await this.connect();

      const result = await this.client.callTool({
        name: 'get_child_lessons',
        arguments: {
          child_id: childId,
          status: 'approved', // Only get approved lessons
          subject_name: subjectName,
          due_soon_days: 30 // Get lessons due in next 30 days
        }
      });

      if (!result || !result.content) {
        return [];
      }

      return JSON.parse(result.content[0].text);

    } catch (error) {
      console.error('Error getting current lessons:', error);
      return [];
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
      console.error('Error getting child progress:', error);
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

      // Fallback: direct Supabase query
      const supabase = require('../utils/supabaseClient');
      const { data, error } = await supabase
        .from('child_subjects')
        .select(`
          id,
          subjects:subject_id (id, name)
        `)
        .eq('child_id', childId);
      
      if (error) throw error;
      return data || [];

    } catch (error) {
      console.error('Error getting child subjects:', error);
      return [];
    }
  }

  // Enhanced method to get learning context for chat - THIS IS THE KEY METHOD!
  async getLearningContext(childId) {
    try {
      console.log('Getting learning context for child:', childId);

      const [currentLessons, upcomingAssignments, childSubjects, progress] = await Promise.all([
        this.getCurrentLessons(childId).catch(e => { console.error('getCurrentLessons error:', e); return []; }),
        this.getUpcomingAssignments(childId, 7).catch(e => { console.error('getUpcomingAssignments error:', e); return []; }),
        this.getChildSubjects(childId).catch(e => { console.error('getChildSubjects error:', e); return []; }),
        this.getChildProgress(childId).catch(e => { console.error('getChildProgress error:', e); return null; })
      ]);

      console.log('Learning context results:', {
        currentLessons: currentLessons.length,
        upcomingAssignments: upcomingAssignments.length,
        childSubjects: childSubjects.length
      });

      // Find the most immediate lesson/assignment
      let currentFocus = null;
      
      // Prioritize lessons due soon
      const lessonsDueSoon = currentLessons.filter(lesson => {
        if (!lesson.due_date) return false;
        const dueDate = new Date(lesson.due_date);
        const today = new Date();
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        return daysUntilDue >= 0 && daysUntilDue <= 3; // Due in next 3 days
      });

      if (lessonsDueSoon.length > 0) {
        currentFocus = lessonsDueSoon[0];
      } else if (currentLessons.length > 0) {
        currentFocus = currentLessons[0];
      } else if (upcomingAssignments.length > 0) {
        currentFocus = {
          type: 'assignment',
          ...upcomingAssignments[0]
        };
      }

      return {
        childSubjects: childSubjects || [],
        currentLessons: currentLessons || [],
        upcomingAssignments: upcomingAssignments || [],
        currentFocus,
        progress: progress || null
      };

    } catch (error) {
      console.error('Error getting learning context:', error);
      
      // Return fallback context with direct database queries
      try {
        const supabase = require('../utils/supabaseClient');
        
        // Get child subjects directly
        const { data: childSubjects } = await supabase
          .from('child_subjects')
          .select(`
            id,
            subjects:subject_id (id, name)
          `)
          .eq('child_id', childId);

        // Get current lessons directly  
        const childSubjectIds = (childSubjects || []).map(cs => cs.id);
        const { data: lessons } = await supabase
          .from('lessons')
          .select(`
            id, title, status, due_date, content_type, created_at,
            child_subjects:child_subject_id (
              subjects:subject_id (name)
            )
          `)
          .in('child_subject_id', childSubjectIds)
          .in('status', ['pending', 'approved'])
          .is('completed_at', null)
          .order('due_date', { ascending: true, nullsLast: true })
          .limit(10);

        console.log('Fallback context - found lessons:', lessons?.length || 0);

        return {
          childSubjects: childSubjects || [],
          currentLessons: lessons || [],
          upcomingAssignments: [],
          currentFocus: lessons?.[0] || null,
          progress: null,
          fallback: true
        };
      } catch (fallbackError) {
        console.error('Fallback context failed:', fallbackError);
        return {
          childSubjects: [],
          currentLessons: [],
          upcomingAssignments: [],
          currentFocus: null,
          progress: null,
          error: error.message
        };
      }
    }
  }
}

// Export singleton instance
module.exports = new MCPClientService();