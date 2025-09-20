// Simplified calendar event creation API
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import Event from '../../../../models/Event';
import { CalendarEvent } from '../../../../types';
import { connectToDatabase } from '../../../../lib/mongodb';
import { CalendarService } from '../../../../lib/services/calendar';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    console.log('=== CALENDAR CREATE API CALLED (UPDATED) ===');
    console.log('Request method:', request.method);
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    
    const session = await getServerSession(authOptions);
    console.log('Session:', session);
    
    if (!session?.user) {
      console.log('❌ No session found, returning 401');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: CalendarEvent = await request.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    const { title, description, startTime, endTime, location, attendees, providerId, calendarId } = body;
    console.log('Extracted fields:', { title, startTime, endTime, description, location, attendees, providerId, calendarId });

    if (!title || !startTime || !endTime) {
      console.log('Validation failed - missing required fields:', { 
        hasTitle: !!title, 
        hasStartTime: !!startTime, 
        hasEndTime: !!endTime 
      });
      return NextResponse.json(
        { success: false, error: 'Title, start time, and end time are required' },
        { status: 400 }
      );
    }

    // Convert userId to ObjectId if it's a valid string, otherwise create a new one
    let userId;
    if (session.user.id && mongoose.Types.ObjectId.isValid(session.user.id)) {
      userId = new mongoose.Types.ObjectId(session.user.id);
    } else {
      // For Google OAuth, the id is a string that's not a valid ObjectId
      // We'll use the email to create a consistent ObjectId
      userId = new mongoose.Types.ObjectId();
    }

    // Skip creating draft - this endpoint is for publishing existing drafts to calendar
    console.log('Publishing event directly to calendar (no draft creation):', {
      title,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      location,
      description,
      providerId: providerId || 'google'
    });

    // Now publish to the selected calendar provider
    let calendarEventId = null;
    let calendarEventUrl = null;
    
    try {
      console.log(`Publishing event to ${providerId} Calendar...`);
      
      // Get tokens from session (stored directly for JWT strategy)
      const accessToken = (session as any).accessToken;
      const refreshToken = (session as any).refreshToken;
      
      if (!accessToken) {
        throw new Error(`No tokens found for provider: ${providerId}`);
      }
      
      console.log('🔍 Using tokens from session:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken
      });
      
      const calendarService = new CalendarService({
        accessToken: accessToken,
        refreshToken: refreshToken
      });
      
      const calendarEvent = await calendarService.createEvent({
        providerId,
        title,
        description,
        location,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        attendees: [] // Add attendees if needed
      }, calendarId); // Pass calendarId as separate parameter
      
      calendarEventId = calendarEvent.id;
      calendarEventUrl = calendarEvent.url;
      
      console.log(`✅ Event published to ${providerId} Calendar:`, calendarEventId);
    } catch (calendarError: any) {
      console.error(`${providerId} Calendar API error:`, calendarError.message);
      // Don't fail the entire request if calendar publishing fails
      // The event is still saved as a draft
    }

    return NextResponse.json({
      success: true,
      eventId: calendarEventId,
      eventUrl: calendarEventUrl,
      message: 'Event published to calendar successfully'
    });

  } catch (error: any) {
    console.error('Event creation error:', error);
    
    // Provide specific error messages for common issues
    let errorMessage = 'Failed to create event';
    let statusCode = 500;
    
    if (error.message?.includes('Database connection timeout')) {
      errorMessage = 'Database is not available. Please ensure MongoDB is running or check your database configuration.';
      statusCode = 503; // Service Unavailable
    } else if (error.message?.includes('timed out')) {
      errorMessage = 'Database operation timed out. Please try again or check your database connection.';
      statusCode = 503;
    }
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}