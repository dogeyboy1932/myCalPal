import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessToken = (session as any).accessToken;
    const refreshToken = (session as any).refreshToken;

    if (!accessToken) {
      return NextResponse.json({ error: 'No access token found' }, { status: 401 });
    }

    // Set up Google Calendar API client
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    auth.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    const calendar = google.calendar({ version: 'v3', auth });

    // Fetch user's calendar list
    const response = await calendar.calendarList.list({
      maxResults: 50, // Limit to 50 calendars
      showHidden: false, // Only show visible calendars
    });

    const calendars = response.data.items?.map(cal => ({
      id: cal.id,
      summary: cal.summary,
      description: cal.description,
      primary: cal.primary || false,
      accessRole: cal.accessRole,
      backgroundColor: cal.backgroundColor,
      foregroundColor: cal.foregroundColor,
    })) || [];

    // Sort calendars with primary first, then alphabetically
    calendars.sort((a, b) => {
      if (a.primary && !b.primary) return -1;
      if (!a.primary && b.primary) return 1;
      return (a.summary || '').localeCompare(b.summary || '');
    });

    return NextResponse.json({ calendars });
  } catch (error: any) {
    console.error('Calendar list error:', error);
    
    if (error.code === 401) {
      return NextResponse.json({ error: 'Token expired or invalid' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch calendars', details: error.message },
      { status: 500 }
    );
  }
}