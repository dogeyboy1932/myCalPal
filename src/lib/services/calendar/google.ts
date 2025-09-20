// Google Calendar API service implementation

import { google } from 'googleapis';
import { BaseCalendarProvider, CalendarTokens, CalendarInfo, CreateEventOptions, ListEventsOptions } from './base';
import { CalendarEvent } from '../../../types';

export class GoogleCalendarProvider extends BaseCalendarProvider {
  private oauth2Client: any;

  constructor(tokens: CalendarTokens) {
    super(tokens, 'google');
    
    // Validate required environment variables
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    
    if (!clientId || !clientSecret || !nextAuthUrl) {
      console.error('Missing Google OAuth environment variables:', {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        hasNextAuthUrl: !!nextAuthUrl
      });
      throw new Error('Missing required Google OAuth environment variables');
    }
    
    // Validate tokens
    if (!tokens.accessToken) {
      console.error('Missing access token for Google Calendar');
      throw new Error('Missing access token for Google Calendar');
    }
    
    console.log('🔧 Initializing Google Calendar Provider with tokens:', {
      hasAccessToken: !!tokens.accessToken,
      hasRefreshToken: !!tokens.refreshToken,
      expiresAt: tokens.expiresAt ? new Date(tokens.expiresAt).toISOString() : 'undefined'
    });
    
    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      nextAuthUrl + '/api/auth/callback/google'
    );

    this.oauth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });
    
    console.log('✅ Google OAuth2 client initialized successfully');
  }

  async createEvent(event: CalendarEvent, options: CreateEventOptions = {}): Promise<any> {
    try {
      console.log('📅 Google Calendar: Creating event...', {
        title: event.title,
        startTime: event.startTime?.toISOString(),
        endTime: event.endTime?.toISOString(),
        calendarId: options.calendarId
      });
      
      // Validate event data
      if (!event.title || !event.startTime || !event.endTime) {
        throw new Error('Missing required event fields: title, startTime, or endTime');
      }
      
      if (event.startTime >= event.endTime) {
        throw new Error('Event start time must be before end time');
      }
      
      // Ensure tokens are valid
      await this.ensureValidTokens();
      console.log('✅ Tokens validated successfully');
      
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      const calendarId = options.calendarId || 'primary';
      
      console.log('🔧 Using calendar ID:', calendarId);

      // Get user's timezone from calendar settings if possible
      let timeZone = 'UTC';
      try {
        const calendarDetails = await calendar.calendars.get({ calendarId });
        timeZone = calendarDetails.data.timeZone || 'UTC';
        console.log('📍 Using calendar timezone:', timeZone);
      } catch (tzError) {
        console.warn('⚠️ Could not get calendar timezone, using UTC:', tzError);
      }

      const googleEvent = {
        summary: event.title,
        description: event.description || '',
        location: event.location || '',
        start: {
          dateTime: event.startTime.toISOString(),
          timeZone: timeZone,
        },
        end: {
          dateTime: event.endTime.toISOString(),
          timeZone: timeZone,
        },
        sendNotifications: options.sendNotifications !== false, // Default to true
      };

      console.log('📤 Sending event to Google Calendar:', JSON.stringify(googleEvent, null, 2));

      const response = await calendar.events.insert({
        calendarId,
        requestBody: googleEvent,
      });

      console.log('✅ Event created successfully:', {
        eventId: response.data.id,
        htmlLink: response.data.htmlLink,
        status: response.data.status
      });

      return {
        ...response.data,
        url: response.data.htmlLink // Add convenient URL field
      };
    } catch (error: any) {
      console.error('❌ Google Calendar createEvent failed:', {
        error: error.message,
        status: error.status,
        code: error.code,
        details: error.details
      });
      
      // Provide more specific error messages
      if (error.status === 401) {
        throw new Error('Google Calendar authentication failed. Please re-authenticate your Google account.');
      } else if (error.status === 403) {
        throw new Error('Permission denied. Please ensure you have calendar write access.');
      } else if (error.status === 404) {
        throw new Error('Calendar not found. Please check the calendar ID.');
      } else if (error.code === 'invalid_grant') {
        throw new Error('Token expired or invalid. Please re-authenticate.');
      }
      
      throw new Error(`Google Calendar API error: ${error.message}`);
    }
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
    
    console.log('🔍 Getting event from Google Calendar:', { eventId, calendarId });
    
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    
    try {
      const response = await calendar.events.get({
        calendarId,
        eventId,
      });

      console.log('✅ Event found:', {
        eventId: response.data.id,
        title: response.data.summary,
        status: response.data.status,
        htmlLink: response.data.htmlLink
      });

      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to get event:', {
        eventId,
        error: error.message,
        status: error.status,
        code: error.code
      });
      
      if (error.status === 404) {
        console.error('❌ Event not found in Google Calendar - it may not have been created successfully');
      }
      
      throw error;
    }
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
      console.error('❌ No refresh token available for Google Calendar');
      throw new Error('No refresh token available for Google Calendar');
    }

    try {
      console.log('🔄 Refreshing Google Calendar tokens...');
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      console.log('✅ Tokens refreshed successfully:', {
        hasAccessToken: !!credentials.access_token,
        hasRefreshToken: !!credentials.refresh_token,
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : 'undefined'
      });
      
      const newTokens: CalendarTokens = {
        accessToken: credentials.access_token!,
        refreshToken: credentials.refresh_token || this.tokens.refreshToken,
        expiresAt: credentials.expiry_date,
      };

      this.oauth2Client.setCredentials({
        access_token: newTokens.accessToken,
        refresh_token: newTokens.refreshToken,
      });

      // Update internal tokens
      this.updateTokens(newTokens);

      return newTokens;
    } catch (error: any) {
      console.error('❌ Failed to refresh Google tokens:', {
        error: error.message,
        status: error.status,
        code: error.code
      });
      
      // Provide specific error messages
      if (error.message?.includes('invalid_grant')) {
        throw new Error('Refresh token is invalid or expired. Please re-authenticate your Google account.');
      }
      
      throw new Error(`Failed to refresh Google tokens: ${error.message}`);
    }
  }

  // Test method to verify if a specific event exists
  async testEventExists(eventId: string, calendarId: string = 'primary'): Promise<boolean> {
    try {
      await this.getEvent(eventId, calendarId);
      console.log('✅ Event exists in Google Calendar:', eventId);
      return true;
    } catch (error: any) {
      if (error.status === 404) {
        console.log('❌ Event NOT found in Google Calendar:', eventId);
        return false;
      }
      console.error('❌ Error checking event existence:', error.message);
      throw error;
    }
  }
}