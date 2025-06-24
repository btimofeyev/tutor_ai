// Test script to verify enhanced MCP context
process.env.MCP_SERVER_URL = 'https://klio-mcpserver-production.up.railway.app';
const mcpClient = require('./backend/src/services/mcpClientHttp');

async function testMCPContext() {
  console.log('🧪 Testing Enhanced MCP Context...\n');
  
  // Test child ID (you may need to update this with a valid child ID)
  const childId = '7aa05bdd-e5be-4027-b255-f576583788c7';
  
  try {
    console.log('📡 Connecting to MCP server...');
    await mcpClient.connect();
    
    console.log('\n🔍 Testing comprehensive search (type: all)...');
    const allContext = await mcpClient.search(childId, '', 'all');
    
    if (allContext.raw_response) {
      console.log('\n📄 Raw Response:');
      console.log('=' .repeat(80));
      console.log(allContext.raw_response);
      console.log('=' .repeat(80));
    }
    
    console.log('\n📚 Testing getLearningContext()...');
    const learningContext = await mcpClient.getLearningContext(childId);
    
    console.log('\n📊 Context Summary:');
    console.log(`- Lessons: ${learningContext.lessons?.length || 0}`);
    console.log(`- Overdue: ${learningContext.overdue?.length || 0}`);
    console.log(`- Tests: ${learningContext.tests?.length || 0}`);
    console.log(`- Quizzes: ${learningContext.quizzes?.length || 0}`);
    console.log(`- Worksheets: ${learningContext.worksheets?.length || 0}`);
    console.log(`- Study Materials: ${learningContext.studyMaterials?.length || 0}`);
    console.log(`- Recent Work: ${learningContext.recentWork?.length || 0}`);
    
    if (learningContext.lessons?.length > 0) {
      console.log('\n📚 Sample Lessons:');
      learningContext.lessons.slice(0, 3).forEach((lesson, i) => {
        console.log(`${i + 1}. ${lesson.title} (${lesson.subject})`);
        if (lesson.description) {
          console.log(`   ${lesson.description}`);
        }
      });
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  } finally {
    if (mcpClient.disconnect) {
      await mcpClient.disconnect();
    }
  }
}

// Run the test
testMCPContext();