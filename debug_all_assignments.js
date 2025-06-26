#!/usr/bin/env node

// Check ALL assignments for Magda to see what's being returned
require('dotenv').config({ path: './backend/.env' });

async function debugAllAssignments() {
  const MCP_SERVER_URL = 'https://klio-mcpserver-production.up.railway.app';
  const childId = 'b2308247-f74a-464e-ac2e-6eec90238154'; // Magda's child ID

  try {
    console.log('🔍 Checking ALL assignments for Magda...');
    console.log(`🌐 Server: ${MCP_SERVER_URL}`);
    
    const searches = [
      { name: 'all', description: 'All assignments (should show Day 1 with completion status)' },
      { name: 'incomplete_assignments', description: 'Current work (should NOT include Day 1)' },
      { name: 'completed_assignments', description: 'Finished work (should include Day 1)' }
    ];
    
    for (const search of searches) {
      console.log(`\n📊 ${search.description}:`);
      console.log('='.repeat(80));
      
      try {
        // Use a simpler approach - just call the search endpoint
        const response = await fetch(`${MCP_SERVER_URL}/search?child_id=${childId}&search_type=${search.name}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok) {
          const text = await response.text();
          console.log(text);
        } else {
          console.log(`❌ HTTP ${response.status}: ${response.statusText}`);
          
          // Fallback to checking the SSE endpoint directly
          console.log('Trying alternative approach...');
          
          const mcpClient = require('./backend/src/services/mcpClientWrapper.js');
          const result = await mcpClient.search(childId, '', search.name);
          
          if (result && result.fullContextText) {
            console.log(result.fullContextText);
          } else if (result && result.error) {
            console.log(`❌ MCP Error: ${result.error}`);
          } else {
            console.log('❌ No result returned');
          }
        }
        
      } catch (error) {
        console.log(`❌ Request failed: ${error.message}`);
        
        // Fallback to local MCP client
        try {
          console.log('Trying local MCP client...');
          const mcpClient = require('./backend/src/services/mcpClientWrapper.js');
          const result = await mcpClient.search(childId, '', search.name);
          
          if (result && result.fullContextText) {
            console.log(result.fullContextText);
          } else if (result && result.error) {
            console.log(`❌ MCP Error: ${result.error}`);
          } else {
            console.log('❌ No result returned');
          }
        } catch (localError) {
          console.log(`❌ Local client also failed: ${localError.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
  }
}

debugAllAssignments();