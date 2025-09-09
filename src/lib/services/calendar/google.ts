// Google Calendar API service implementation

import { google } from 'googleapis';
import { BaseCalendarProvider, CalendarTokens, CalendarInfo, CreateEventOptions, ListEventsOptions } from './base';
import { CalendarEvent } from '../../../types';

export class GoogleCalendarProvider extends BaseCalendarProvider {
  private oauth2Client: any;

  constructor(tokens: CalendarTokens) {
    super(tokens, 'google');
    
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

  async createEvent(event: CalendarEvent, options: CreateEventOptions = {}): Promise<any> {
    await this.ensureValidTokens();
    
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    const calendarId = options.calendarId || 'primary';

    const googleEvent = {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: {
        dateTime: event.startTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: event.endTime.toISOString(),
        timeZone: 'UTC',
      },
      sendNotifications: options.sendNotifications || false,
    };

    const response = await calendar.events.insert({
      calendarId,
      requestBody: googleEvent,
    });

    return response.data;
  }

  async updateEvent(eventId: string, event: Partial<CalendarEvent>, calendarId: string = 'primary'): Promise<any> {
    await this.ensureValidTokens();
    
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    const googleEvent: any = {};
    if (event.title) googleEvent.summary = event.title;
    if (event.description) googleEvent.description = event.description;
    if (event.location) googleEvent.location = event.location;
    if (event.startTime) {
      googleEvent.start = {
        dateTime: event.startTime.toISOString(),
        timeZone: 'UTC',
      };
    }
    if (event.endTime) {
      googleEvent.end = {
        dateTime: event.endTime.toISOString(),
        timeZone: 'UTC',
      };
    }

    const response = await calendar.events.update({
      calendarId,
      eventId,
      requestBody: googleEvent,
    });

    return response.data;
  }

  async deleteEvent(eventId: string, calendarId: string = 'primary'): Promise<void> {
    await this.ensureValidTokens();
    
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    
    await calendar.events.delete({
      calendarId,
      eventId,
    });
  }

  async getEvent(eventId: string, calendarId: string = 'primary'): Promise<any> {
    await this.ensureValidTokens();
    
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    
    const response = await calendar.events.get({
      calendarId,
      eventId,
    });

    return response.data;
  }

  async listEvents(options: ListEventsOptions = {}): Promise<any[]> {
    await this.ensureValidTokens();
    
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    const calendarId = options.calendarId || 'primary';

    const requestOptions: any = {
      calendarId,
      singleEvents: true,
    };

    if (options.timeMin) requestOptions.timeMin = options.timeMin.toISOString();
    if (options.timeMax) requestOptions.timeMax = options.timeMax.toISOString();
    if (options.maxResults) requestOptions.maxResults = options.maxResults;
    if (options.orderBy) requestOptions.orderBy = options.orderBy;

    const response = await calendar.events.list(requestOptions);
    return response.data.items || [];
  }

  async listCalendars(): Promise<CalendarInfo[]> {
    await this.ensureValidTokens();
    
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    const response = await calendar.calendarList.list();
    const calendars = response.data.items || [];

    return calendars.map(cal => ({
      id: cal.id!,
      name: cal.summary!,
      description: cal.description || '',
      isPrimary: cal.primary || false,
      canWrite: cal.accessRole === 'owner' || cal.accessRole === 'writer',
      timeZone: cal.timeZone || 'UTC',
    }));
  }

  async refreshTokens(): Promise<CalendarTokens> {
    if (!this.tokens.refreshToken) {
      throw new Error('No refresh token available for Google Calendar');
    }

    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      const newTokens: CalendarTokens = {
        accessToken: credentials.access_token!,
        refreshToken: credentials.refresh_token || this.tokens.refreshToken,
        expiresAt: credentials.expiry_date,
      };

      this.oauth2Client.setCredentials({
        access_token: newTokens.accessToken,
        refresh_token: newTokens.refreshToken,
      });

      return newTokens;
    } catch (error) {
      throw new Error(`Failed to refresh Google tokens: ${error}`);
    }
  }
}