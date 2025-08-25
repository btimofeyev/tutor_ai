/**
 * Simplified HTTP Transport for the new simplified MCP server
 * Direct HTTP calls without SSE/MCP protocol overhead
 */

const axios = require('axios');

class HttpTransportSimplified {
  constructor() {
    this.baseUrl = process.env.MCP_SERVER_URL || 'http://localhost:3000';
    this.type = 'http-simplified';
    this.isConnected = false;
  }

  getType() {
    return this.type;
  }

  isReady() {
    return this.isConnected;
  }

  async connect() {
    try {
      console.log(`Connecting to simplified MCP server at: ${this.baseUrl}`);

      // Health check
      const healthResponse = await axios.get(`${this.baseUrl}/health`, { timeout: 5000 });
      if (healthResponse.status !== 200) {
        throw new Error('Health check failed');
      }

      this.isConnected = true;
      return true;
    } catch (error) {
      throw new Error(`Simplified HTTP transport connection failed: ${error.message}`);
    }
  }

  async disconnect() {
    this.isConnected = false;
  }

  async callTool(toolName, args) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const response = await axios.post(`${this.baseUrl}/tool`, {
        tool: toolName,
        arguments: args
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });

      if (response.data.error) {
        throw new Error(`Tool error: ${response.data.error}`);
      }

      console.log(`🔧 HTTP Transport returning:`, typeof response.data.result, response.data.result?.length || 'no length');
      return response.data.result;
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(`Tool call failed: ${error.response.data.error}`);
      }
      throw new Error(`HTTP tool call failed: ${error.message}`);
    }
  }
}

module.exports = HttpTransportSimplified;