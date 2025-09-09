// Google Calendar provider implementation

import { google } from 'googleapis';
import { BaseCalendarProvider } from './base';
import { 
  CalendarEvent, 
  Calendar, 
  CalendarProviderTokens,
  CalendarProvider
} from '../../../types/providers';
import { 
  GoogleCalendarEvent, 
  GoogleCalendar
} from '../../../types/google';

export class GoogleCalendarProvider extends BaseCalendarProvider {
  private calendar: any;
  private oauth2Client: any;

  constructor(tokens: CalendarProviderTokens, userId: string) {
    super('google', tokens, userId);
    this.initializeClient();
  }

  private initializeClient() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    this.oauth2Client.setCredentials({
      access_token: this.tokens.accessToken,
      refresh_token: this.tokens.refreshToken,
      expiry_date: this.tokens.expiresAt?.getTime(),
    });

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  async authenticate(tokens: CalendarProviderTokens): Promise<void> {
    this.tokens = tokens;
    this.initializeClient();
  }

  async getCalendars(): Promise<Calendar[]> {
    try {
      await this.ensureValidToken();
      
      const response = await this.calendar.calendarList.list({
        maxResults: 250,
        showDeleted: false,
        showHidden: false,
      });

      const calendars = response.data.items || [];
      return calendars.map((cal: GoogleCalendar) => this.convertGoogleCalendar(cal));
    } catch (error) {
      await this.handleApiError(error, 'fetch calendars');
      return [];
    }
  }

  async getCalendar(calendarId: string): Promise<Calendar> {
    try {
      await this.ensureValidToken();
      
      const response = await this.calendar.calendars.get({
        calendarId: calendarId,
      });

      return this.convertGoogleCalendar(response.data);
    } catch (error) {
      throw this.handleApiError(error, 'getCalendar');
    }
  }

  async getEvent(calendarId: string, eventId: string): Promise<CalendarEvent> {
    try {
      await this.ensureValidToken();
      
      const response = await this.calendar.events.get({
        calendarId: calendarId,
        eventId: eventId,
      });

      return this.convertGoogleEvent(response.data);
    } catch (error) {
      throw this.handleApiError(error, 'getEvent');
    }
  }

  async listEvents(
    calendarId: string, 
    startDate?: Date, 
    endDate?: Date
  ): Promise<CalendarEvent[]> {
    try {
      await this.ensureValidToken();
      
      const params: any = {
        calendarId,
        maxResults: 2500,
        singleEvents: true,
        orderBy: 'startTime',
        showDeleted: false,
      };

      if (startDate) {
        params.timeMin = startDate.toISOString();
      }

      if (endDate) {
        params.timeMax = endDate.toISOString();
      }

      const response = await this.calendar.events.list(params);
      const events = response.data.items || [];
      
      return events.map((event: GoogleCalendarEvent) => this.convertGoogleEvent(event));
    } catch (error) {
      await this.handleApiError(error, 'fetch events');
      return [];
    }
  }

  async createEvent(
    calendarId: string, 
    event: Omit<CalendarEvent, 'id' | 'providerId' | 'providerEventId'>
  ): Promise<CalendarEvent> {
    try {
      const validationErrors = this.validateEvent(event);
      if (validationErrors.length > 0) {
        throw this.createProviderError(
          `Event validation failed: ${validationErrors.join(', ')}`,
          'VALIDATION_ERROR'
        );
      }

      await this.ensureValidToken();
      
      const googleEvent = this.convertToGoogleEvent(event);
      
      const response = await this.calendar.events.insert({
        calendarId,
        resource: googleEvent,
        sendUpdates: 'all', // Send email notifications to attendees
      });

      return this.convertGoogleEvent(response.data);
    } catch (error) {
      await this.handleApiError(error, 'create event');
      throw error;
    }
  }

  async updateEvent(
    calendarId: string, 
    eventId: string, 
    event: Partial<CalendarEvent>
  ): Promise<CalendarEvent> {
    try {
      const validationErrors = this.validateEvent(event);
      if (validationErrors.length > 0) {
        throw this.createProviderError(
          `Event validation failed: ${validationErrors.join(', ')}`,
          'VALIDATION_ERROR'
        );
      }

      await this.ensureValidToken();
      
      const googleEvent = this.convertToGoogleEvent(event);
      
      const response = await this.calendar.events.update({
        calendarId,
        eventId,
        resource: googleEvent,
        sendUpdates: 'all',
      });

      return this.convertGoogleEvent(response.data);
    } catch (error) {
      await this.handleApiError(error, 'update event');
      throw error;
    }
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    try {
      await this.ensureValidToken();
      
      await this.calendar.events.delete({
        calendarId,
        eventId,
        sendUpdates: 'all',
      });
    } catch (error) {
      await this.handleApiError(error, 'delete event');
    }
  }

  async refreshTokens(refreshToken: string): Promise<CalendarProviderTokens> {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      const newTokens: CalendarProviderTokens = {
        accessToken: credentials.access_token!,
        refreshToken: credentials.refresh_token || this.tokens.refreshToken,
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined,
        scope: this.tokens.scope,
      };

      // Update internal tokens
      this.tokens = newTokens;
      this.oauth2Client.setCredentials({
        access_token: newTokens.accessToken,
        refresh_token: newTokens.refreshToken,
        expiry_date: newTokens.expiresAt?.getTime(),
      });

      return newTokens;
    } catch (error) {
      throw this.createProviderError(
        'Failed to refresh Google tokens',
        'TOKEN_REFRESH_FAILED',
        error
      );
    }
  }

  // Google-specific conversion methods
  private convertGoogleCalendar(googleCalendar: GoogleCalendar): Calendar {
    return {
      id: googleCalendar.id || '',
      name: googleCalendar.summary || '',
      description: googleCalendar.description || '',
      timeZone: googleCalendar.timeZone || 'UTC',
      color: this.convertGoogleColor(googleCalendar.colorId),
      primary: googleCalendar.primary || false,
      providerId: 'google' as CalendarProvider,
      providerCalendarId: googleCalendar.id || ''
    };
  }

  private convertGoogleEvent(googleEvent: GoogleCalendarEvent): CalendarEvent {
    const startTime = this.parseGoogleDateTime(googleEvent.start);
    const endTime = this.parseGoogleDateTime(googleEvent.end);
    
    return {
      id: googleEvent.id || '',
      title: googleEvent.summary || '',
      description: googleEvent.description || '',
      startTime,
      endTime,
      location: googleEvent.location || '',
      attendees: (googleEvent.attendees || []).map(a => a.email).filter(Boolean),
      calendarId: googleEvent.organizer?.email || '',
      providerId: 'google' as CalendarProvider,
      providerEventId: googleEvent.id || ''
    };
  }

  private convertToGoogleEvent(event: Partial<CalendarEvent>): Partial<GoogleCalendarEvent> {
    const googleEvent: Partial<GoogleCalendarEvent> = {
      summary: event.title,
      description: event.description,
      location: event.location,
    };

    // Handle start and end times
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

    // Handle attendees
    if (event.attendees && event.attendees.length > 0) {
      googleEvent.attendees = event.attendees.map(email => ({
        email,
        responseStatus: 'needsAction',
      }));
    }

    // Note: Recurrence and reminders are not part of the CalendarEvent interface
    // These would need to be handled separately if needed

    return googleEvent;
  }

  private parseGoogleDateTime(dateTime: any): Date {
    if (dateTime?.dateTime) {
      return new Date(dateTime.dateTime);
    } else if (dateTime?.date) {
      return new Date(dateTime.date + 'T00:00:00');
    }
    return new Date();
  }

  private convertGoogleColor(colorId?: string): string {
    // Google Calendar color mapping
    const colorMap: Record<string, string> = {
      '1': '#7986CB', // Lavender
      '2': '#33B679', // Sage
      '3': '#8E24AA', // Grape
      '4': '#E67C73', // Flamingo
      '5': '#F6BF26', // Banana
      '6': '#F4511E', // Tangerine
      '7': '#039BE5', // Peacock
      '8': '#9E9E9E', // Graphite
      '9': '#9FC6E7', // Blueberry
      '10': '#4285F4', // Basil
      '11': '#EA4335', // Tomato
    };

    return colorMap[colorId || '1'] || '#1976D2';
  }

  private convertGoogleReminders(reminders: any): number[] {
    if (!reminders?.overrides) {
      return reminders?.useDefault ? [15] : [];
    }

    return reminders.overrides
      .filter((r: any) => r.method === 'popup')
      .map((r: any) => r.minutes)
      .filter((minutes: number) => typeof minutes === 'number');
  }

  // Google-specific utility methods
  async getCalendarColors(): Promise<Record<string, string>> {
    try {
      await this.ensureValidToken();
      
      const response = await this.calendar.colors.get();
      const colors: Record<string, string> = {};
      
      if (response.data.calendar) {
        Object.entries(response.data.calendar).forEach(([id, color]: [string, any]) => {
          colors[id] = color.background;
        });
      }
      
      return colors;
    } catch (error) {
      console.warn('Failed to fetch Google Calendar colors:', error);
      return {};
    }
  }

  async getFreeBusy(
    calendarIds: string[],
    startTime: Date,
    endTime: Date
  ): Promise<Record<string, Array<{ start: Date; end: Date }>>> {
    try {
      await this.ensureValidToken();
      
      const response = await this.calendar.freebusy.query({
        resource: {
          timeMin: startTime.toISOString(),
          timeMax: endTime.toISOString(),
          items: calendarIds.map(id => ({ id })),
        },
      });

      const freeBusy: Record<string, Array<{ start: Date; end: Date }>> = {};
      
      Object.entries(response.data.calendars || {}).forEach(([calendarId, data]: [string, any]) => {
        freeBusy[calendarId] = (data.busy || []).map((period: any) => ({
          start: new Date(period.start),
          end: new Date(period.end),
        }));
      });
      
      return freeBusy;
    } catch (error) {
      await this.handleApiError(error, 'fetch free/busy information');
      throw error;
    }
  }
}