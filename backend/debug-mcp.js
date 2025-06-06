// test-fixed-mcp.js - Test the fixed MCP server
require('dotenv').config();
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

const TEST_CHILD_ID = '2e456022-6598-4fb7-86c1-f29c36f3b963';

class MCPTester {
  constructor() {
    this.client = null;
    this.transport = null;
  }

  async connect() {
    try {
      console.log('🔌 Connecting to FIXED MCP server...');
      
      // Update this path to your fixed server file
      const serverPath = 'C:/Users/timof/Desktop/ai_tutor_mcp_server/dist/server.js';
      
      this.transport = new StdioClientTransport({
        command: 'node',
        args: [serverPath],
        env: {
          ...process.env,
          SUPABASE_URL: process.env.SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
        }
      });

      this.client = new Client(
        { name: 'mcp-tester', version: '1.0.0' },
        { capabilities: {} }
      );

      await this.client.connect(this.transport);
      console.log('✅ Connected to FIXED MCP server');
      
      return true;
    } catch (error) {
      console.error('❌ Connection failed:', error.message);
      return false;
    }
  }

  async testSearch(query, searchType) {
    try {
      console.log(`\n🔍 Testing: "${query}" (type: ${searchType})`);
      
      const result = await this.client.callTool({
        name: 'search_database',
        arguments: {
          child_id: TEST_CHILD_ID,
          query: query,
          search_type: searchType
        }
      });

      if (!result?.content?.[0]?.text) {
        console.log('❌ No results returned');
        return false;
      }

      const searchData = JSON.parse(result.content[0].text);
      console.log('📊 Summary:', searchData.summary);
      
      if (searchData.debug) {
        console.log('🔧 Debug info:', searchData.debug);
      }
      
      // Show results count
      if (searchData.results) {
        Object.keys(searchData.results).forEach(key => {
          const items = searchData.results[key];
          if (Array.isArray(items)) {
            console.log(`   ${key}: ${items.length} items`);
            
            // Show first few items
            items.slice(0, 3).forEach((item, i) => {
              if (item.title) {
                console.log(`     ${i + 1}. "${item.title}" (${item.content_type || 'unknown'})`);
              }
            });
          }
        });
      }

      return true;
    } catch (error) {
      console.error(`❌ Search failed:`, error.message);
      return false;
    }
  }

  async runTests() {
    console.log('🧪 === TESTING FIXED MCP SERVER ===');
    console.log(`Child ID: ${TEST_CHILD_ID}`);
    console.log('='.repeat(50));

    const connected = await this.connect();
    if (!connected) {
      console.log('❌ Cannot run tests - server connection failed');
      return;
    }

    // Test different search types
    await this.testSearch('', 'assignments');
    await this.testSearch('overdue', 'overdue');  
    await this.testSearch('', 'grades');
    await this.testSearch('', 'recent');
    await this.testSearch('math', 'all');

    console.log('\n✅ Tests completed!');
    console.log('\nWhat to expect:');
    console.log('- assignments: Should show 8 materials');
    console.log('- overdue: Should show 7 overdue materials');
    console.log('- grades: Should show 4 graded materials');
    console.log('- recent: Should show recent completed work');
  }

  async disconnect() {
    if (this.client) await this.client.close();
    if (this.transport) await this.transport.close();
  }
}

// Run the tests
async function main() {
  const tester = new MCPTester();
  
  try {
    await tester.runTests();
  } catch (error) {
    console.error('❌ Test runner failed:', error);
  } finally {
    await tester.disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = MCPTester;