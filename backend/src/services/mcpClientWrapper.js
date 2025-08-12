// backend/src/services/mcpClientWrapper.js - Unified MCP client with transport abstraction
const MCPClientBase = require('./mcpClientBase');
const StdioTransport = require('./transports/stdioTransport');
const HttpTransport = require('./transports/httpTransport');

// Transport factory function
function createTransport() {
  const useHttpTransport = !!process.env.MCP_SERVER_URL && !process.env.MCP_SERVER_URL.includes('localhost');
  
  if (useHttpTransport) {
    console.log('🔧 MCP Client Mode: HTTP (Railway)');
    console.log(`🔧 MCP Server URL: ${process.env.MCP_SERVER_URL}`);
    return new HttpTransport();
  } else {
    console.log('🔧 MCP Client Mode: Local (StdioClientTransport)');
    console.log('🔧 MCP Server URL: Local stdio connection');
    return new StdioTransport();
  }
}

// Create unified client instance with appropriate transport
const transport = createTransport();
const mcpClient = new MCPClientBase(transport);

// Export unified client
module.exports = mcpClient;