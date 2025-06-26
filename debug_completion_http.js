#!/usr/bin/env node

// Quick script to debug completion status using HTTP API to Railway MCP server
require('dotenv').config({ path: './backend/.env' });

async function debugCompletionStatusHTTP() {
  const MCP_SERVER_URL = 'https://klio-mcpserver-production.up.railway.app';
  const childId = 'b2308247-f74a-464e-ac2e-6eec90238154'; // Magda's child ID

  try {
    console.log('🔍 Using Railway MCP server to debug completion status for Magda...');
    console.log(`🌐 Server: ${MCP_SERVER_URL}`);
    
    // Test server health first
    const healthResponse = await fetch(`${MCP_SERVER_URL}/health`);
    if (!healthResponse.ok) {
      throw new Error(`Health check failed: ${healthResponse.status}`);
    }
    const health = await healthResponse.json();
    console.log('✅ Server is healthy:', health.status);
    
    // Now let's call the tools directly via the Railway MCP server's HTTP API
    const searches = [
      { name: 'incomplete_assignments', description: 'Current work (should NOT include Day 1 if completed)' },
      { name: 'completed_assignments', description: 'Finished work (should include Day 1 if completed)' },
      { name: 'debug_completion_status', description: 'All assignments with completion status' }
    ];
    
    for (const search of searches) {
      console.log(`\n${search.description}:`);
      console.log('─'.repeat(60));
      
      try {
        const requestBody = {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "search_database",
            arguments: {
              child_id: childId,
              query: "",
              search_type: search.name
            }
          }
        };
        
        const response = await fetch(`${MCP_SERVER_URL}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
          console.log(`❌ HTTP ${response.status}: ${response.statusText}`);
          continue;
        }
        
        const result = await response.json();
        
        if (result.error) {
          console.log(`❌ MCP Error: ${result.error.message}`);
          continue;
        }
        
        if (result.result?.content?.[0]?.text) {
          console.log(result.result.content[0].text);
        } else {
          console.log('❌ No content returned');
        }
        
      } catch (error) {
        console.log(`❌ Request failed: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
  }
}

debugCompletionStatusHTTP();