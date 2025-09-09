// Simplified calendar service

import { google } from 'googleapis';
import { CalendarEvent, CalendarProvider } from '../../types';

export interface CalendarTokens {
  accessToken: string;
  refreshToken?: string;
}

export class CalendarService {
  private oauth2Client: any;

  constructor(tokens: CalendarTokens, provider: CalendarProvider = 'google') {
    if (provider !== 'google') {
      throw new Error('Only Google Calendar is supported');
    }

    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    );

    this.oauth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });
  }

  async createEvent(event: CalendarEvent): Promise<{ id: string; url: string }> {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    const googleEvent = {
      summary: event.title,
      location: event.location,
      description: event.description,
      start: {
        dateTime: new Date(event.startTime).toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: new Date(event.endTime).toISOString(),
        timeZone: 'UTC',
      },
      attendees: event.attendees?.map(email => ({ email })),
      reminders: {
        useDefault: true,
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: googleEvent,
    });

    if (!response.data.id || !response.data.htmlLink) {
      throw new Error('Failed to create calendar event');
    }

    return {
      id: response.data.id,
      url: response.data.htmlLink,
    };
  }

  async listCalendars() {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    const response = await calendar.calendarList.list();
    return response.data.items || [];
  }

  async listEvents(calendarId: string = 'primary') {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    const response = await calendar.events.list({
      calendarId,
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });
    return response.data.items || [];
  }
}

export function createCalendarService(tokens: CalendarTokens, provider: CalendarProvider = 'google') {
  return new CalendarService(tokens, provider);
}