// Test the enhanced lesson context parsing
process.env.MCP_SERVER_URL = 'https://klio-mcpserver-production.up.railway.app';
const mcpClient = require('./backend/src/services/mcpClientHttp');
const { formatLearningContextForAI } = require('./backend/src/middleware/mcpContext');

async function testEnhancedContext() {
  console.log('🧪 Testing Enhanced Lesson Context...\n');
  
  const childId = '7aa05bdd-e5be-4027-b255-f576583788c7';
  
  try {
    await mcpClient.connect();
    
    console.log('📚 Getting enhanced learning context...');
    const learningContext = await mcpClient.getLearningContext(childId);
    
    console.log('\n📊 Parsed Lessons:');
    if (learningContext.lessons && learningContext.lessons.length > 0) {
      learningContext.lessons.slice(0, 2).forEach((lesson, i) => {
        console.log(`\n${i + 1}. ${lesson.title}`);
        console.log(`   Subject: ${lesson.subject}`);
        if (lesson.objectives) console.log(`   Objectives: ${lesson.objectives.join(', ')}`);
        if (lesson.focus) console.log(`   Focus: ${lesson.focus}`);
        if (lesson.keywords) console.log(`   Keywords: ${lesson.keywords.join(', ')}`);
        if (lesson.difficulty_level) console.log(`   Level: ${lesson.difficulty_level}`);
        if (lesson.due_date) console.log(`   Due: ${lesson.due_date}`);
      });
    } else {
      console.log('❌ No lessons parsed');
    }
    
    console.log('\n📄 Formatted Context for AI:');
    console.log('=' .repeat(80));
    const formattedContext = formatLearningContextForAI(learningContext);
    console.log(formattedContext);
    console.log('=' .repeat(80));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (mcpClient.disconnect) {
      await mcpClient.disconnect();
    }
  }
}

testEnhancedContext();