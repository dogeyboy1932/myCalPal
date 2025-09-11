const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testMongoDB() {
  const uri = process.env.MONGODB_URI;
  console.log('Connecting to MongoDB...');
  console.log('URI:', uri.replace(/:\/\/([^:]+):([^@]+)@/, '://***:***@')); // Hide password
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB successfully!');
    
    // List all databases
    const adminDb = client.db().admin();
    const databases = await adminDb.listDatabases();
    console.log('\n📁 Available databases:');
    databases.databases.forEach(db => {
      console.log(`  - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });
    
    // Check the calendar-app database specifically
    const db = client.db('calendar-app');
    const collections = await db.listCollections().toArray();
    console.log('\n📋 Collections in default database:');
    if (collections.length === 0) {
      console.log('  No collections found');
    } else {
      for (const collection of collections) {
        console.log(`  - ${collection.name}`);
        const count = await db.collection(collection.name).countDocuments();
        console.log(`    Documents: ${count}`);
        
        if (collection.name === 'events' && count > 0) {
          console.log('    Sample documents:');
          const samples = await db.collection('events').find({}).limit(3).toArray();
          samples.forEach((doc, index) => {
            console.log(`    ${index + 1}. ID: ${doc._id || doc.id}`);
            console.log(`       Title: ${doc.title}`);
            console.log(`       Date: ${doc.date}`);
            console.log(`       UserId: ${doc.userId}`);
          });
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
  } finally {
    await client.close();
    console.log('\n🔌 Connection closed');
  }
}

testMongoDB();