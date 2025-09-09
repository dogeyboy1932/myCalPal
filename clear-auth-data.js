// Simple script to clear NextAuth database collections that might be causing OAuth conflicts

const { MongoClient } = require('mongodb');
const fs = require('fs');

// Read MONGODB_URI from .env or .env.local
let MONGODB_URI;
const envFiles = ['.env.local', '.env'];

for (const envFile of envFiles) {
  try {
    const envContent = fs.readFileSync(envFile, 'utf8');
    const mongoUriMatch = envContent.match(/MONGODB_URI=(.+)/);
    if (mongoUriMatch) {
      MONGODB_URI = mongoUriMatch[1].trim();
      console.log(`Found MONGODB_URI in ${envFile}`);
      break;
    }
  } catch (error) {
    // File doesn't exist, try next one
    continue;
  }
}

if (!MONGODB_URI) {
  console.error('MONGODB_URI not found in .env or .env.local files');
  console.error('Please create a .env file with MONGODB_URI=your-connection-string');
  process.exit(1);
}

async function clearAuthData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    // Clear NextAuth collections that might have conflicting data
    const collections = ['users', 'accounts', 'sessions'];
    
    for (const collectionName of collections) {
      const collection = db.collection(collectionName);
      const result = await collection.deleteMany({});
      console.log(`Cleared ${result.deletedCount} documents from ${collectionName}`);
    }
    
    console.log('✅ All NextAuth data cleared. You can now sign in fresh.');
    
  } catch (error) {
    console.error('❌ Error clearing data:', error);
  } finally {
    await client.close();
  }
}

clearAuthData();