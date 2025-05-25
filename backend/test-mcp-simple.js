// backend/test-mcp-simple.js
// Run this file directly to test MCP connection: node test-mcp-simple.js

const { spawn } = require('child_process');
const path = require('path');

// Load environment variables
require('dotenv').config();

console.log('=== MCP Connection Test ===\n');

// Check environment
console.log('1. Checking environment variables...');
console.log('   MCP_SERVER_PATH:', process.env.MCP_SERVER_PATH || 'NOT SET!');
console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET ✓' : 'NOT SET!');
console.log('   SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'SET ✓' : 'NOT SET!');

if (!process.env.MCP_SERVER_PATH) {
  console.error('\n❌ ERROR: MCP_SERVER_PATH not set in .env file!');
  process.exit(1);
}

// Test if file exists
const fs = require('fs');
const mcpPath = process.env.MCP_SERVER_PATH;

console.log('\n2. Checking MCP server file...');
if (fs.existsSync(mcpPath)) {
  console.log('   File exists: ✓');
  const stats = fs.statSync(mcpPath);
  console.log('   File size:', stats.size, 'bytes');
} else {
  console.error('   ❌ ERROR: File not found at', mcpPath);
  process.exit(1);
}

// Try to spawn the MCP server
console.log('\n3. Starting MCP server...');
console.log('   Command: node', mcpPath);

const mcpProcess = spawn('node', [mcpPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    MCP_TRANSPORT: 'stdio'
  },
  shell: process.platform === 'win32'
});

let serverStarted = false;
let errorOutput = '';

// Capture stderr
mcpProcess.stderr.on('data', (data) => {
  errorOutput += data.toString();
  console.error('   Server Error:', data.toString());
});

// Capture stdout (but filter out JSON-RPC messages)
mcpProcess.stdout.on('data', (data) => {
  const output = data.toString();
  if (!output.includes('jsonrpc') && !output.includes('Content-Length')) {
    console.log('   Server Output:', output);
  }
  if (!serverStarted) {
    serverStarted = true;
    console.log('   ✓ Server process started!');
    testMCPProtocol();
  }
});

mcpProcess.on('error', (error) => {
  console.error('   ❌ Failed to start server:', error.message);
  process.exit(1);
});

mcpProcess.on('exit', (code) => {
  console.log('   Server exited with code:', code);
  if (errorOutput) {
    console.error('   Full error output:', errorOutput);
  }
});

// Test the MCP protocol
async function testMCPProtocol() {
  console.log('\n4. Testing MCP protocol...');
  
  try {
    // Send initialize request
    const initRequest = {
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      },
      id: 1
    };

    console.log('   Sending initialize request...');
    mcpProcess.stdin.write(JSON.stringify(initRequest) + '\n');

    // Wait a bit for response
    setTimeout(() => {
      // Send list tools request
      const toolsRequest = {
        jsonrpc: '2.0',
        method: 'tools/list',
        params: {},
        id: 2
      };

      console.log('   Sending list tools request...');
      mcpProcess.stdin.write(JSON.stringify(toolsRequest) + '\n');

      // Give it time to respond
      setTimeout(() => {
        console.log('\n5. Test complete!');
        console.log('   If you see server output above, the MCP server is working.');
        console.log('   If not, check the error messages.\n');
        
        // Clean up
        mcpProcess.kill();
        process.exit(0);
      }, 2000);
    }, 1000);

  } catch (error) {
    console.error('   ❌ Protocol test failed:', error);
    mcpProcess.kill();
    process.exit(1);
  }
}

// Give it 5 seconds to start
setTimeout(() => {
  if (!serverStarted) {
    console.error('\n❌ Server did not start within 5 seconds');
    console.error('   This usually means the server file has an error.');
    console.error('   Try running it directly: node', mcpPath);
    mcpProcess.kill();
    process.exit(1);
  }
}, 5000);

// ===================================
// Alternative: Direct require test
// ===================================
// Create backend/test-mcp-require.js

console.log('\n=== Alternative Test: Direct Require ===\n');

try {
  console.log('Attempting to require MCP server directly...');
  const mcpServer = require(process.env.MCP_SERVER_PATH);
  console.log('✓ Server file loaded successfully!');
  console.log('Exported items:', Object.keys(mcpServer));
} catch (error) {
  console.error('❌ Cannot require server file:', error.message);
  console.error('This might be normal if the server auto-starts on require.');
}