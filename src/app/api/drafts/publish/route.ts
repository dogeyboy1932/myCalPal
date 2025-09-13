import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import connectToDatabase from '../../../../lib/mongodb';
import Event from '../../../../models/Event';
import Published from '../../../../models/Published';

// POST /api/drafts/publish - Move a draft to published collection
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { draftId, publishedEventId, calendarProvider, calendarId } = body;
    
    if (!draftId) {
      return NextResponse.json({ error: 'Draft ID is required' }, { status: 400 });
    }

    await connectToDatabase();
    
    // Find the draft event
    const draftEvent = await Event.findOne({
      id: draftId,
      userId: session.user.email,
      status: 'draft'
    });
    
    if (!draftEvent) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }
    
    // Create published event record
    const publishedEvent = new Published({
      id: `published_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: draftEvent.title,
      date: draftEvent.date,
      startTime: draftEvent.startTime,
      endTime: draftEvent.endTime,
      location: draftEvent.location,
      description: draftEvent.description,
      attendees: draftEvent.attendees,
      category: draftEvent.category,
      confidence: draftEvent.confidence,
      userId: session.user.email,
      originalDraftId: draftId,
      publishedEventId: publishedEventId,
      calendarProvider: calendarProvider,
      calendarId: calendarId,
      publishedAt: new Date()
    });
    
    // Save to published collection
    await publishedEvent.save();
    
    // Remove from drafts collection
    await Event.deleteOne({
      id: draftId,
      userId: session.user.email,
      status: 'draft'
    });
    
    console.log(`📤 Moved draft ${draftId} to published collection for user: ${session.user.email}`);
    
    return NextResponse.json({ 
      success: true, 
      publishedId: publishedEvent.id,
      message: 'Draft moved to published collection successfully'
    });
  } catch (error) {
    console.error('Error moving draft to published:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}