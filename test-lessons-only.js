// Test lessons search specifically
process.env.MCP_SERVER_URL = 'https://klio-mcpserver-production.up.railway.app';
const mcpClient = require('./backend/src/services/mcpClientHttp');

async function testLessonsOnly() {
  console.log('🧪 Testing Lessons Search Only...\n');
  
  const childId = '7aa05bdd-e5be-4027-b255-f576583788c7';
  
  try {
    await mcpClient.connect();
    
    console.log('📚 Testing ONLY lessons search...');
    const lessons = await mcpClient.search(childId, '', 'lessons');
    
    console.log('\n📊 Lessons Result:');
    console.log(JSON.stringify(lessons, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (mcpClient.disconnect) {
      await mcpClient.disconnect();
    }
  }
}

testLessonsOnly();