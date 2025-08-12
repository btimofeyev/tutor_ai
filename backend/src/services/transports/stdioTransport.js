/**
 * Stdio Transport Adapter for MCP Client
 * Lightweight wrapper around local stdio MCP server communication
 */

const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");
const fs = require("fs");
const path = require("path");

class StdioTransport {
  constructor() {
    this.client = null;
    this.transport = null;
    this.type = 'stdio';
  }

  getType() {
    return this.type;
  }

  isReady() {
    return this.client && this.transport;
  }

  async connect() {
    try {
      const mcpServerPath = process.env.MCP_SERVER_PATH ||
                          path.resolve(__dirname, "../../../../../klio-mcpserver/dist/server.js");

      if (!fs.existsSync(mcpServerPath)) {
        throw new Error(`MCP server script not found at: ${mcpServerPath}`);
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
        { name: "klioai-unified-tutor", version: "3.0.0" },
        { capabilities: {} }
      );

      await this.client.connect(this.transport);
      return true;
    } catch (error) {
      throw new Error(`Stdio transport connection failed: ${error.message}`);
    }
  }

  async disconnect() {
    try {
      if (this.client) await this.client.close();
      if (this.transport) await this.transport.close();
      this.client = null;
      this.transport = null;
    } catch (error) {
      console.warn('Error during stdio transport disconnect:', error.message);
    }
  }

  async callTool(toolName, args) {
    if (!this.client) {
      throw new Error('Stdio transport not connected');
    }

    try {
      const result = await this.client.callTool({
        name: toolName,
        arguments: args,
      });

      // Handle stdio response format
      if (!result?.content?.[0]?.text) {
        return null;
      }

      const responseText = result.content[0].text;

      // Try to parse as JSON, fallback to text
      try {
        return JSON.parse(responseText);
      } catch {
        return responseText;
      }
    } catch (error) {
      throw new Error(`Stdio tool call failed: ${error.message}`);
    }
  }
}

module.exports = StdioTransport;