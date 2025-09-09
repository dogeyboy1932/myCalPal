const fetch = require('node-fetch');

// Test the calendar API endpoint
async function testCalendarAPI() {
  try {
    const response = await fetch('http://localhost:3000/api/calendar/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'next-auth.session-token=test-session' // Mock session
      },
      body: JSON.stringify({
        title: 'API Test Event',
        startTime: '2024-01-16T14:00:00.000Z',
        endTime: '2024-01-16T15:00:00.000Z',
        location: 'Test Location',
        description: 'Testing ObjectId validation fix',
        providerId: 'google'
      })
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response body:', result);
  } catch (error) {
    console.error('Test error:', error);
  }
}

testCalendarAPI();