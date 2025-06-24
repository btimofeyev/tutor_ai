// Debug script to check child data in database
process.env.MCP_SERVER_URL = 'https://klio-mcpserver-production.up.railway.app';
const mcpClient = require('./backend/src/services/mcpClientHttp');

async function debugChildData() {
  console.log('🔍 Debugging Child Data...\n');
  
  const childId = '7aa05bdd-e5be-4027-b255-f576583788c7';
  
  try {
    await mcpClient.connect();
    
    console.log('1️⃣ Testing subjects search...');
    const subjects = await mcpClient.search(childId, '', 'subjects');
    console.log('Subjects result:', subjects);
    
    console.log('\n2️⃣ Testing lessons search...');
    const lessons = await mcpClient.search(childId, '', 'lessons');
    console.log('Lessons result:', lessons);
    
    console.log('\n3️⃣ Testing assignments search...');
    const assignments = await mcpClient.search(childId, '', 'assignments');
    console.log('Assignments result:', assignments);
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    if (mcpClient.disconnect) {
      await mcpClient.disconnect();
    }
  }
}

debugChildData();