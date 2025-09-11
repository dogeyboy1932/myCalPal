const { connectToDatabase } = require('./src/lib/mongodb.ts');
const Event = require('./src/models/Event.ts').default;
require('dotenv').config();

async function testEventSave() {
  try {
    console.log('🔌 Connecting to database...');
    await connectToDatabase();
    
    console.log('💾 Creating test event...');
    const testEvent = {
      id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: 'Test Event from Script',
      date: '2024-01-15',
      time: '14:00',
      location: 'Test Location',
      description: 'This is a test event to verify database connection',
      status: 'draft',
      userId: 'test-user',
      confidence: 0.95
    };
    
    const savedEvent = await Event.create(testEvent);
    console.log('✅ Event saved successfully!');
    console.log('Event ID:', savedEvent._id);
    console.log('Custom ID:', savedEvent.id);
    console.log('Title:', savedEvent.title);
    
    // Count total events
    const totalEvents = await Event.countDocuments();
    console.log(`📊 Total events in database: ${totalEvents}`);
    
    // List recent events
    console.log('\n📋 Recent events:');
    const recentEvents = await Event.find({}).sort({ createdAt: -1 }).limit(5);
    recentEvents.forEach((event, index) => {
      console.log(`${index + 1}. ${event.title} (${event.id}) - ${event.userId}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

testEventSave();