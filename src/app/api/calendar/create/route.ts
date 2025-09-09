import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { google } from 'googleapis';

// Extend the session type to include tokens
interface ExtendedSession {
  accessToken?: string;
  refreshToken?: string;
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession;
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { title, date, time, startTime, endTime, location, description } = await request.json();

    if (!title || !date || (!time && !startTime)) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: title, date, and either time or startTime' },
        { status: 400 }
      );
    }

    // Handle time field conversion
    let eventStartTime = startTime;
    let eventEndTime = endTime;
    
    if (time && !startTime) {
      // If only time is provided, use it as startTime and add 1 hour for endTime
      eventStartTime = time;
      if (!eventEndTime) {
        // Parse time and add 1 hour
        const timeMatch = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const ampm = timeMatch[3]?.toUpperCase();
          
          if (ampm === 'PM' && hours !== 12) hours += 12;
          if (ampm === 'AM' && hours === 12) hours = 0;
          
          const endHours = (hours + 1) % 24;
          const endAmPm = endHours >= 12 ? 'PM' : 'AM';
          const displayHours = endHours === 0 ? 12 : endHours > 12 ? endHours - 12 : endHours;
          
          eventEndTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${endAmPm}`;
        } else {
          // Fallback: add 1 hour as text
          eventEndTime = time;
        }
      }
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    );

    // Set credentials
    oauth2Client.setCredentials({
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
    });

    // Create calendar instance
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Parse date and time
    let startDateTime: Date;
    let endDateTime: Date;
    
    try {
      // Try to parse as ISO format first (YYYY-MM-DD)
      if (eventStartTime.includes(':')) {
        // Time format like "2:00 PM" or "14:00"
        const timeMatch = eventStartTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const ampm = timeMatch[3]?.toUpperCase();
          
          if (ampm === 'PM' && hours !== 12) hours += 12;
          if (ampm === 'AM' && hours === 12) hours = 0;
          
          startDateTime = new Date(date);
          startDateTime.setHours(hours, minutes, 0, 0);
        } else {
          // Fallback to simple parsing
          startDateTime = new Date(`${date}T${eventStartTime}:00`);
        }
      } else {
        // Assume it's already in a parseable format
        startDateTime = new Date(`${date}T${eventStartTime}:00`);
      }
      
      // Handle end time
      if (eventEndTime && eventEndTime.includes(':')) {
        const endTimeMatch = eventEndTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (endTimeMatch) {
          let endHours = parseInt(endTimeMatch[1]);
          const endMinutes = parseInt(endTimeMatch[2]);
          const endAmpm = endTimeMatch[3]?.toUpperCase();
          
          if (endAmpm === 'PM' && endHours !== 12) endHours += 12;
          if (endAmpm === 'AM' && endHours === 12) endHours = 0;
          
          endDateTime = new Date(date);
          endDateTime.setHours(endHours, endMinutes, 0, 0);
        } else {
          endDateTime = new Date(`${date}T${eventEndTime}:00`);
        }
      } else {
        // Default to 1 hour after start time
        endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
      }
    } catch (error) {
      console.error('Date parsing error:', error);
      return NextResponse.json(
        { success: false, error: 'Invalid date or time format' },
        { status: 400 }
      );
    }

    // Create event object
    const event = {
      summary: title,
      location: location || undefined,
      description: description || undefined,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'America/New_York', // You might want to make this configurable
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'America/New_York',
      },
      reminders: {
        useDefault: true,
      },
    };

    // Insert event into calendar
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    if (response.status === 200 && response.data) {
      return NextResponse.json({
        success: true,
        eventId: response.data.id,
        eventUrl: response.data.htmlLink,
        message: 'Event created successfully'
      });
    } else {
      throw new Error('Failed to create calendar event');
    }

  } catch (error) {
    console.error('Calendar creation error:', error);
    
    // Handle specific Google API errors
    if (error instanceof Error) {
      if (error.message.includes('invalid_grant')) {
        return NextResponse.json(
          { success: false, error: 'Authentication expired. Please sign in again.' },
          { status: 401 }
        );
      }
      
      if (error.message.includes('insufficient permissions')) {
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions to access calendar.' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create calendar event' 
      },
      { status: 500 }
    );
  }
}