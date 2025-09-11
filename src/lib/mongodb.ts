// MongoDB connection and Mongoose setup

import mongoose from 'mongoose';

interface MongooseConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Global mongoose connection cache to prevent multiple connections in development
let cached: MongooseConnection = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error(
      'Please define the MONGODB_URI environment variable inside .env'
    );
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
    };

    // Ensure we connect to the calendar-app database
    const dbUri = MONGODB_URI.includes('/calendar-app?') ? MONGODB_URI : MONGODB_URI.replace('/?', '/calendar-app?');
    
    cached.promise = mongoose.connect(dbUri, opts).then((mongoose) => {
      console.log('✅ Connected to MongoDB (calendar-app database)');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('❌ MongoDB connection error:', e);
    throw e;
  }

  return cached.conn;
}

// Connection health check
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  details: {
    connected: boolean;
    readyState: number;
    host?: string;
    name?: string;
  };
}> {
  try {
    const connection = mongoose.connection;
    
    return {
      status: connection.readyState === 1 ? 'healthy' : 'unhealthy',
      details: {
        connected: connection.readyState === 1,
        readyState: connection.readyState,
        host: connection.host,
        name: connection.name,
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        connected: false,
        readyState: 0,
      },
    };
  }
}

// Graceful shutdown
export async function disconnectFromDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error disconnecting from MongoDB:', error);
    throw error;
  }
}

// Database connection events
mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Mongoose disconnected from MongoDB');
});

// Handle process termination
process.on('SIGINT', async () => {
  await disconnectFromDatabase();
  process.exit(0);
});

export default connectToDatabase;