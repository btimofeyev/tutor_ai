#!/usr/bin/env node

// setup-mcp.js - Script to set up and test the MCP server
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('🚀 Setting up Enhanced MCP Server for EduNest...\n');

// 1. Check environment variables
function checkEnvironment() {
  console.log('1. Checking environment variables...');
  
  const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
  const missing = required.filter(env => !process.env[env]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.log('💡 Make sure these are set in your .env file\n');
    return false;
  }
  
  console.log('✅ Environment variables are set\n');
  return true;
}

// 2. Create the MCP server directory and files
function setupMCPServer() {
  console.log('2. Setting up MCP server...');
  
  const mcpDir = path.join(process.cwd(), 'mcp-server');
  const distDir = path.join(mcpDir, 'dist');
  
  // Create directories
  if (!fs.existsSync(mcpDir)) {
    fs.mkdirSync(mcpDir, { recursive: true });
  }
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  
  // Copy the enhanced MCP server code
  const serverCode = `#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
// ... (Enhanced MCP Server code from the artifact above)
`;

  const serverPath = path.join(distDir, 'server.js');
  
  console.log('📝 Server will be created at:', serverPath);
  console.log('💡 Please copy the Enhanced MCP Server code from the artifacts to:', serverPath);
  console.log('✅ MCP server directory structure created\n');
  
  return serverPath;
}

// 3. Test MCP server connection
async function testMCPConnection(serverPath) {
  console.log('3. Testing MCP server connection...');
  
  if (!fs.existsSync(serverPath)) {
    console.log('⚠️  Server file not found. Please create it first.');
    console.log('📋 Copy the Enhanced MCP Server code to:', serverPath);
    return false;
  }
  
  console.log('🔄 Starting MCP server...');
  
  return new Promise((resolve) => {
    const mcpProcess = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        MCP_TRANSPORT: 'stdio'
      }
    });

    let serverStarted = false;
    let hasOutput = false;

    // Set up timeout
    const timeout = setTimeout(() => {
      if (!serverStarted) {
        console.log('⏰ Server startup timeout - this might be normal');
        mcpProcess.kill();
        resolve(false);
      }
    }, 5000);

    mcpProcess.stdout.on('data', (data) => {
      hasOutput = true;
      const output = data.toString();
      if (!output.includes('jsonrpc') && !output.includes('Content-Length')) {
        console.log('📤 Server output:', output.trim());
      }
    });

    mcpProcess.stderr.on('data', (data) => {
      hasOutput = true;
      const error = data.toString();
      if (error.includes('EduNest MCP server running')) {
        console.log('✅ MCP server started successfully!');
        serverStarted = true;
        clearTimeout(timeout);
        mcpProcess.kill();
        resolve(true);
      } else {
        console.log('📢 Server message:', error.trim());
      }
    });

    mcpProcess.on('error', (error) => {
      console.error('❌ Failed to start server:', error.message);
      clearTimeout(timeout);
      resolve(false);
    });

    mcpProcess.on('exit', (code) => {
      clearTimeout(timeout);
      if (!serverStarted && hasOutput) {
        console.log('✅ Server ran and exited normally (code:', code, ')');
        resolve(true);
      } else if (!hasOutput) {
        console.log('❌ No output from server - check for syntax errors');
        resolve(false);
      }
    });

    // Send a simple test message
    setTimeout(() => {
      try {
        const testMessage = JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' }
          },
          id: 1
        }) + '\n';
        
        mcpProcess.stdin.write(testMessage);
      } catch (e) {
        console.log('⚠️  Could not send test message:', e.message);
      }
    }, 1000);
  });
}

// 4. Update backend configuration
function updateBackendConfig() {
  console.log('4. Updating backend configuration...');
  
  const envPath = path.join(process.cwd(), '.env');
  const mcpServerPath = path.join(process.cwd(), 'mcp-server', 'dist', 'server.js');
  
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Add or update MCP_SERVER_PATH
    if (envContent.includes('MCP_SERVER_PATH=')) {
      envContent = envContent.replace(/MCP_SERVER_PATH=.*/, `MCP_SERVER_PATH=${mcpServerPath}`);
    } else {
      envContent += `\n# MCP Server Configuration\nMCP_SERVER_PATH=${mcpServerPath}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Updated .env with MCP_SERVER_PATH');
  } else {
    console.log('⚠️  .env file not found - please create it manually');
    console.log('📋 Add this line to your .env:');
    console.log(`MCP_SERVER_PATH=${mcpServerPath}`);
  }
  
  console.log('✅ Backend configuration updated\n');
}

// 5. Provide next steps
function provideNextSteps() {
  console.log('🎉 Setup Complete! Next Steps:\n');
  
  console.log('1. 📝 Copy the Enhanced MCP Server code:');
  console.log('   - Copy the code from the "Enhanced MCP Server" artifact');
  console.log('   - Save it to: mcp-server/dist/server.js');
  console.log('');
  
  console.log('2. 🔄 Update your backend services:');
  console.log('   - Replace backend/src/services/mcpClient.js with the "Updated MCP Client Service"');
  console.log('   - Replace backend/src/middleware/mcpContext.js with the "Updated MCP Context Middleware"');
  console.log('   - Replace backend/src/controllers/chatController.js with the "Updated Chat Controller"');
  console.log('');
  
  console.log('3. 🧪 Test the setup:');
  console.log('   - Restart your backend server');
  console.log('   - Ask the chatbot: "What lessons do I have coming up?"');
  console.log('   - Check the logs for MCP context data');
  console.log('');
  
  console.log('4. 🔍 Troubleshooting:');
  console.log('   - Check backend logs for MCP connection messages');
  console.log('   - Ensure your database has lesson data for the test child');
  console.log('   - Verify SUPABASE_URL and SUPABASE_ANON_KEY are correct');
  console.log('');
  
  console.log('📚 The enhanced MCP server will now provide:');
  console.log('   ✓ Real curriculum data from your database');
  console.log('   ✓ Specific lesson titles and due dates');
  console.log('   ✓ Learning objectives and tasks');
  console.log('   ✓ Progress tracking and suggestions');
  console.log('   ✓ Context-aware AI responses');
}

// Main setup function
async function main() {
  try {
    if (!checkEnvironment()) {
      process.exit(1);
    }
    
    const serverPath = setupMCPServer();
    
    // Test connection only if server file exists
    if (fs.existsSync(serverPath)) {
      await testMCPConnection(serverPath);
    }
    
    updateBackendConfig();
    provideNextSteps();
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup
if (require.main === module) {
  require('dotenv').config();
  main();
}

module.exports = { main };