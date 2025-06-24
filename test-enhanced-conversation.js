// Test script to verify enhanced conversation handling is working
const axios = require('axios');

async function testEnhancedConversation() {
  console.log('🧪 Testing Enhanced Conversation Handling...\n');
  
  try {
    // Test with a lesson preparation query
    const lessonPrepResponse = await axios.post('http://localhost:5000/api/chat', {
      message: "What will we learn in today's math lesson?",
      sessionHistory: []
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-child-token' // You'll need a valid token
      }
    });
    
    console.log('✅ Lesson Preparation Query Response:');
    console.log(lessonPrepResponse.data.response);
    console.log('\n---\n');
    
    // Test with a homework help query
    const homeworkResponse = await axios.post('http://localhost:5000/api/chat', {
      message: "Help me with problem 5 on my worksheet",
      sessionHistory: []
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-child-token'
      }
    });
    
    console.log('✅ Homework Help Query Response:');
    console.log(homeworkResponse.data.response);
    console.log('\n---\n');
    
    // Test with a general concept question
    const conceptResponse = await axios.post('http://localhost:5000/api/chat', {
      message: "What is multiplication?",
      sessionHistory: []
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-child-token'
      }
    });
    
    console.log('✅ Concept Question Response:');
    console.log(conceptResponse.data.response);
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Note: You need a valid child authentication token to test the chat API.');
      console.log('This error is expected if you don\'t have a logged-in child session.');
    }
  }
}

testEnhancedConversation();