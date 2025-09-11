import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import connectToDatabase from '../../../lib/mongodb';
import Event, { IEvent } from '../../../models/Event';
// Removed ICS file generation - storing data directly

// Add a recent event to in-memory cache (MongoDB save handled elsewhere)
export async function addRecentEvent(event: any) {
  try {
    console.log('Adding recent event to cache:', event.id);
    // Just return the event - MongoDB save is handled by the caller
    // This function now only serves as a cache/logging mechanism
    return event;
  } catch (error) {
    console.error('❌ Error processing recent event:', error);
    throw error;
  }
}

// Get recent events from MongoDB
export async function getRecentEvents(userId: string, limit: number = 10) {
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
    const session = await getServerSession(authOptions);
    if (!session) {
      console.log('Unauthorized access to recent events API');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Fetching recent events for user:', session.user?.email);
    const recentEvents = await getRecentEvents(session.user?.email || '');
    console.log('Returning recent events:', recentEvents.length);
    
    return NextResponse.json({ events: recentEvents });
  } catch (error) {
    console.error('Error fetching recent events:', error);
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
    
    addRecentEvent(body);
    
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