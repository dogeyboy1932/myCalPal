import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import connectToDatabase from '../../../lib/mongodb';
import Event, { IEvent } from '../../../models/Event';
// Removed ICS file generation - storing data directly

// Get recent events from MongoDB
async function getRecentEvents(userId: string, limit: number = 10) {
  try {
    await connectToDatabase();
    
    const events = await Event.find({ userId, status: 'draft' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    
    return events;
  } catch (error) {
    console.error('❌ Error fetching events from MongoDB:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    console.log('🔍 Attempting to get server session...');
    const session = await getServerSession(authOptions);
    console.log('🔍 Session result:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userEmail: session?.user?.email,
      hasAccessToken: !!(session as any)?.accessToken,
      hasRefreshToken: !!(session as any)?.refreshToken
    });
    
    if (!session) {
      console.log('❌ Unauthorized access to recent events API - no session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!session.user) {
      console.log('❌ Unauthorized access to recent events API - no user in session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'draft';
    const limit = parseInt(searchParams.get('limit') || '10');

    console.log(`🔍 API Request Details:`);
    console.log(`  - Status filter: '${status}'`);
    console.log(`  - Limit: ${limit}`);
    console.log(`  - User email: ${session.user?.email}`);
    console.log(`  - Full URL: ${request.url}`);
    
    await connectToDatabase();
    
    // Query for only the authenticated user's events
    const query = {
      userId: session.user?.email || '',
      status: status 
    };
    console.log(`📊 MongoDB Query:`, JSON.stringify(query, null, 2));
    
    const events = await Event.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    
    console.log(`📋 Query Results:`);
    console.log(`  - Found ${events.length} events with status '${status}'`);
    // console.log(`  - Events data:`, JSON.stringify(events, null, 2));
    
    // Also check total count in database for this user
    const userQuery = {
      userId: session.user?.email || ''
    };
    const totalCount = await Event.countDocuments(userQuery);
    const draftCount = await Event.countDocuments({ ...userQuery, status: 'draft' });
    const publishedCount = await Event.countDocuments({ ...userQuery, status: 'published' });
    
    console.log(`📈 Database Stats for user ${session.user?.email}:`);
    console.log(`  - Total events: ${totalCount}`);
    console.log(`  - Draft events: ${draftCount}`);
    console.log(`  - Published events: ${publishedCount}`);
    
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      console.log('Unauthorized access to recent events API');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Adding new recent event via POST:', body);
    
    // TODO: Implement direct MongoDB storage if needed
    console.log('Event data received but not persisted');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding recent event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      console.log('Unauthorized access to update event API');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    console.log('Updating event:', id, 'for user:', session.user?.email);
    
    // Connect to database
    await connectToDatabase();
    
    // Find the existing event
    const existingEvent = await Event.findOne({ 
      id: id, 
      userId: session.user?.email || 'anonymous' 
    });
    
    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    // Update event data
    const updatedEventData = {
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    // Event data updated - no ICS file generation needed
    
    // Update the event in MongoDB
    const updatedEvent = await Event.findOneAndUpdate(
      { id: id, userId: session.user?.email || 'anonymous' },
      updatedEventData,
      { new: true }
    );
    
    console.log('Event updated successfully:', id);
    
    return NextResponse.json({ success: true, event: updatedEvent });
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}