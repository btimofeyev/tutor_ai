// test-simplified-mcp.js - Test your new simplified MCP server
require('dotenv').config();
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

// Test data from your debug - these are real child IDs with actual data
const TEST_CHILDREN = [
  {
    id: '6a2bee53-ed3e-4661-a8bf-9cab5412dae0',
    name: 'Jacob',
    expectedGrade: 71.8, // Math: 28/39 points
    expectedMaterials: 2
  },
  {
    id: '2e456022-6598-4fb7-86c1-f29c36f3b963', 
    name: 'Test',
    expectedGrade: 65.3, // Math: 57.5/88 points
    expectedMaterials: 7
  },
  {
    id: 'e7599701-f337-4fab-bb88-531aa01bc9f0',
    name: 'Ben', 
    expectedGrade: 38.7, // Math: 12/31 points
    expectedMaterials: 5
  }
];

class SimplifiedMCPTester {
  constructor() {
    this.client = null;
    this.transport = null;
  }

  async connect() {
    try {
      console.log('🔌 Connecting to simplified MCP server...');
      
      // Update this path to your built server
      const serverPath = 'C:/Users/timof/Desktop/ai_tutor_mcp_server/dist/server.js'

      
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
      console.log('✅ Connected to simplified MCP server');
      
      // List available tools
      const tools = await this.client.listTools();
      console.log('🛠️  Available tools:', tools.tools.map(t => t.name));
      
      return true;
    } catch (error) {
      console.error('❌ Connection failed:', error.message);
      return false;
    }
  }

  async testSearch(childId, query, searchType, expected = null) {
    try {
      console.log(`\n🔍 Testing: "${query}" (type: ${searchType}) for child: ${childId}`);
      
      const result = await this.client.callTool({
        name: 'search_database',
        arguments: {
          child_id: childId,
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
      
      // Show some results
      if (searchData.results) {
        Object.keys(searchData.results).forEach(key => {
          const items = searchData.results[key];
          if (Array.isArray(items)) {
            console.log(`   ${key}: ${items.length} items`);
            if (items.length > 0 && items[0].title) {
              console.log(`     Sample: "${items[0].title}"`);
            }
          }
        });
      }

      return true;
    } catch (error) {
      console.error(`❌ Search failed:`, error.message);
      return false;
    }
  }

  async testGradeCalculation(childId, childName, expectedGrade) {
    console.log(`\n📊 Testing grade calculation for ${childName}...`);
    
    try {
      const result = await this.client.callTool({
        name: 'search_database',
        arguments: {
          child_id: childId,
          query: 'grades scores percent',
          search_type: 'grades'
        }
      });

      const searchData = JSON.parse(result.content[0].text);
      const grades = searchData.results.grades || [];
      
      if (grades.length === 0) {
        console.log(`   ⚠️  No grades found for ${childName}`);
        return;
      }

      // Calculate average like the debug script does
      let totalEarned = 0;
      let totalPossible = 0;
      
      grades.forEach(grade => {
        if (grade.grade_value && grade.grade_max_value) {
          totalEarned += parseFloat(grade.grade_value);
          totalPossible += parseFloat(grade.grade_max_value);
        }
      });

      const calculatedAverage = totalPossible > 0 ? 
        Math.round((totalEarned / totalPossible) * 100 * 10) / 10 : 0;

      console.log(`   📈 Calculated average: ${calculatedAverage}%`);
      console.log(`   🎯 Expected average: ${expectedGrade}%`);
      console.log(`   📚 Found ${grades.length} graded materials`);
      console.log(`   🧮 Total points: ${totalEarned}/${totalPossible}`);

      if (Math.abs(calculatedAverage - expectedGrade) < 0.1) {
        console.log('   ✅ Grade calculation matches debug data!');
      } else {
        console.log('   ❌ Grade calculation differs from debug data');
      }

    } catch (error) {
      console.error(`   ❌ Grade test failed:`, error.message);
    }
  }

  async runAllTests() {
    console.log('🧪 Starting Simplified MCP Server Tests');
    console.log('=====================================\n');

    // Connect to server
    const connected = await this.connect();
    if (!connected) {
      console.log('❌ Cannot run tests - server connection failed');
      return;
    }

    // Test each child
    for (const child of TEST_CHILDREN) {
      console.log(`\n👤 Testing ${child.name} (${child.id})`);
      console.log('='.repeat(50));

      // Test different search types
      await this.testSearch(child.id, 'assignments homework', 'assignments');
      await this.testSearch(child.id, 'grades scores', 'grades');
      await this.testSearch(child.id, 'overdue late', 'overdue');
      await this.testSearch(child.id, 'recent today', 'recent');
      await this.testSearch(child.id, 'Chapter 12', 'all');
      
      // Test grade calculation
      await this.testGradeCalculation(child.id, child.name, child.expectedGrade);
    }

    console.log('\n🏁 Tests completed!');
    console.log('\nNext steps:');
    console.log('1. ✅ If all tests pass, replace your old MCP server');
    console.log('2. ✅ Update mcpClient.js with the simplified version');
    console.log('3. ✅ Update mcpContext.js with the simplified version');
    console.log('4. 🚀 Test with your chat interface');
  }

  async disconnect() {
    if (this.client) await this.client.close();
    if (this.transport) await this.transport.close();
  }
}

// Run the tests
async function main() {
  const tester = new SimplifiedMCPTester();
  
  try {
    await tester.runAllTests();
  } catch (error) {
    console.error('❌ Test runner failed:', error);
  } finally {
    await tester.disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = SimplifiedMCPTester;