// Test API endpoint to check if a specific event exists in Google Calendar
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { CalendarService } from '../../../../lib/services/calendar';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const eventId = url.searchParams.get('eventId');
    const calendarId = url.searchParams.get('calendarId') || 'primary';

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Testing event existence:', { eventId, calendarId });

    // Get tokens from session
    const accessToken = (session as any).accessToken;
    const refreshToken = (session as any).refreshToken;
    
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'No calendar tokens found' },
        { status: 401 }
      );
    }
    
    const calendarService = new CalendarService({
      accessToken: accessToken,
      refreshToken: refreshToken
    });
    
    const provider = calendarService.getProvider() as any;
    const exists = await provider.testEventExists(eventId, calendarId);
    
    if (exists) {
      const event = await provider.getEvent(eventId, calendarId);
      return NextResponse.json({
        success: true,
        exists: true,
        event: {
          id: event.id,
          title: event.summary,
          start: event.start,
          end: event.end,
          htmlLink: event.htmlLink,
          status: event.status
        }
      });
    } else {
      return NextResponse.json({
        success: true,
        exists: false,
        message: 'Event not found in Google Calendar'
      });
    }

  } catch (error: any) {
    console.error('Test event error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}