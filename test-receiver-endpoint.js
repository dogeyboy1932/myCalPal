// Simple test using built-in fetch to test receiver endpoint
const fs = require('fs');
const path = require('path');

async function testReceiverEndpoint() {
  console.log('🧪 Testing if receiver endpoint saves to MongoDB...');
  
  try {
    // Test with a simple text payload first
    const testData = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-receiver-token': process.env.IMAGE_RECEIVER_TOKEN || 'test-token'
      },
      body: new URLSearchParams({
        'text': 'Meeting with John tomorrow at 3 PM in conference room A',
        'source': 'test',
        'discordMessageId': 'test-message-123',
        'discordChannelId': 'test-channel-456',
        'discordAuthorId': 'test-author-789'
      })
    };
    
    console.log('📤 Sending test request to receiver endpoint...');
    
    const response = await fetch('http://localhost:3001/api/receiver/image', testData);
    
    const result = await response.json();
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response body:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Receiver endpoint is working!');
      if (result.event) {
        console.log('📅 Event created:', {
          id: result.event.id,
          title: result.event.title,
          date: result.event.date
        });
      }
    } else {
      console.log('❌ Receiver endpoint failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testReceiverEndpoint();