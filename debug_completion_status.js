#!/usr/bin/env node

// Quick script to debug completion status for Magda's assignments
require('dotenv').config({ path: './backend/.env' });

// Override the MCP_SERVER_PATH to use local server
process.env.MCP_SERVER_PATH = require('path').resolve(__dirname, '../klio-mcpserver/dist/server.js');

const mcpClient = require('./backend/src/services/mcpClient.js');

async function debugCompletionStatus() {
  try {
    console.log('🔍 Debugging completion status for Magda...');
    
    // Magda's child ID from the logs
    const childId = 'b2308247-f74a-464e-ac2e-6eec90238154';
    
    console.log('\n1. Checking incomplete assignments:');
    const incomplete = await mcpClient.search(childId, '', 'incomplete_assignments');
    console.log(incomplete.fullContextText);
    
    console.log('\n2. Checking completed assignments:');
    const completed = await mcpClient.search(childId, '', 'completed_assignments');
    console.log(completed.fullContextText);
    
    console.log('\n3. Searching for Day 1 specifically:');
    const day1Search = await mcpClient.search(childId, 'Day 1', 'all');
    console.log(day1Search.fullContextText);
    
    console.log('\n4. Debug completion status:');
    const debug = await mcpClient.search(childId, '', 'debug_completion_status');
    console.log(debug.fullContextText);
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await mcpClient.disconnect();
    process.exit(0);
  }
}

debugCompletionStatus();