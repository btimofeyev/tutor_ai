/**
 * HTTP Transport Adapter for MCP Client
 * Lightweight wrapper around Railway/remote HTTP MCP server communication
 */

const axios = require('axios');
const EventSource = require('eventsource');

class HttpTransport {
  constructor() {
    this.baseUrl = process.env.MCP_SERVER_URL || 'http://localhost:3000';
    this.sessionId = null;
    this.messagesUrl = null;
    this.eventSource = null;
    this.requestId = 0;
    this.maxRetries = 3;
    this.retryDelay = 2000;
    this.type = 'http';
  }

  getType() {
    return this.type;
  }

  isReady() {
    return this.messagesUrl && this.sessionId;
  }

  async connect() {
    try {
      console.log(`Connecting to MCP server at: ${this.baseUrl}`);

      // Health check
      const healthResponse = await axios.get(`${this.baseUrl}/health`, { timeout: 5000 });
      if (healthResponse.status !== 200) {
        throw new Error('Health check failed');
      }

      // Establish SSE session
      await this.establishSession();
      
      // Initialize MCP connection
      await this.initializeMCP();
      
      return true;
    } catch (error) {
      throw new Error(`HTTP transport connection failed: ${error.message}`);
    }
  }

  async disconnect() {
    try {
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }
      this.sessionId = null;
      this.messagesUrl = null;
    } catch (error) {
      console.warn('Error during HTTP transport disconnect:', error.message);
    }
  }

  async establishSession() {
    return new Promise((resolve, reject) => {
      this.eventSource = new EventSource(`${this.baseUrl}/sse`);
      
      this.eventSource.addEventListener('endpoint', (event) => {
        this.messagesUrl = `${this.baseUrl}${event.data}`;
        const urlParams = new URLSearchParams(event.data.split('?')[1]);
        this.sessionId = urlParams.get('sessionId');
        resolve();
      });

      this.eventSource.addEventListener('error', (error) => {
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
          name: 'ai-tutor-unified-client',
          version: '3.0.0'
        }
      }
    };

    await this.sendMessage(initMessage);
    
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
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      throw new Error(`HTTP message send failed: ${error.message}`);
    }
  }

  async callTool(toolName, args) {
    try {
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
      // Handle connection reset scenarios
      if (error.message.includes('No active MCP session') || 
          error.message.includes('Invalid session') ||
          error.code === 'ECONNREFUSED' ||
          (error.response && error.response.data && error.response.data.error === 'Invalid session')) {
        
        // Reset connection state for retry
        this.sessionId = null;
        this.messagesUrl = null;
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
      }
      
      throw new Error(`HTTP tool call failed: ${error.message}`);
    }
  }
}

module.exports = HttpTransport;