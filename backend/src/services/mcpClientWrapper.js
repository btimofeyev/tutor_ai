// backend/src/services/mcpClientWrapper.js - Smart wrapper that switches between local and HTTP
const mcpClientLocal = require('./mcpClient');
const mcpClientHttp = require('./mcpClientHttp');

// Determine which client to use based on environment
const useHttpClient = !!process.env.MCP_SERVER_URL && !process.env.MCP_SERVER_URL.includes('localhost');

console.log(`🔧 MCP Client Mode: ${useHttpClient ? 'HTTP (Railway)' : 'Local (StdioClientTransport)'}`);
console.log(`🔧 MCP Server URL: ${process.env.MCP_SERVER_URL || 'Not set (using local)'}`);

// Export the appropriate client
module.exports = useHttpClient ? mcpClientHttp : mcpClientLocal;