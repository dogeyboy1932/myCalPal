// Microsoft Graph/Outlook Calendar provider implementation

import { Client } from '@microsoft/microsoft-graph-client';
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import { BaseCalendarProvider } from './base';
import { 
  CalendarEvent, 
  Calendar, 
  CalendarProviderTokens,
  CalendarProvider 
} from '../../../types/providers';
import { 
  MicrosoftGraphEvent, 
  MicrosoftGraphCalendar 
} from '../../../types/microsoft';

// Custom authentication provider for Microsoft Graph
class CustomAuthProvider implements AuthenticationProvider {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async getAccessToken(): Promise<string> {
    return this.accessToken;
  }

  updateAccessToken(newToken: string) {
    this.accessToken = newToken;
  }
}

export class MicrosoftCalendarProvider extends BaseCalendarProvider {
  private graphClient!: Client;
  private authProvider!: CustomAuthProvider;

  constructor(tokens: CalendarProviderTokens, userId: string) {
    super('microsoft', tokens, userId);
    this.initializeClient();
  }

  private initializeClient() {
    this.authProvider = new CustomAuthProvider(this.tokens.accessToken);
    this.graphClient = Client.initWithMiddleware({
      authProvider: this.authProvider,
    });
  }

  async authenticate(tokens: CalendarProviderTokens): Promise<void> {
    this.tokens = tokens;
    this.initializeClient();
  }

  async getCalendars(): Promise<Calendar[]> {
    try {
      await this.ensureValidToken();
      
      const response = await this.graphClient
        .api('/me/calendars')
        .select('id,name,color,canShare,canViewPrivateItems,canEdit,owner,isDefaultCalendar')
        .top(250)
        .get();

      const calendars = response.value || [];
      return calendars.map((cal: MicrosoftGraphCalendar) => this.convertMicrosoftCalendar(cal));
    } catch (error) {
      throw await this.handleApiError(error, 'fetch calendars');
    }
  }

  async getCalendar(calendarId: string): Promise<Calendar> {
    try {
      await this.ensureValidToken();
      
      const calendar = await this.graphClient
        .api(`/me/calendars/${calendarId}`)
        .get();

      return this.convertMicrosoftCalendar(calendar);
    } catch (error) {
      throw this.handleApiError(error, 'getCalendar');
    }
  }

  async getEvent(calendarId: string, eventId: string): Promise<CalendarEvent> {
    try {
      await this.ensureValidToken();
      
      const event = await this.graphClient
        .api(`/me/calendars/${calendarId}/events/${eventId}`)
        .get();

      return this.convertMicrosoftEvent(event);
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
      
      const apiPath = `/me/calendars/${calendarId}/events`;
      let query = this.graphClient.api(apiPath)
        .select('id,subject,body,start,end,location,attendees,isAllDay,recurrence,reminderMinutesBeforeStart,showAs,sensitivity,createdDateTime,lastModifiedDateTime,webLink')
        .top(1000)
        .orderby('start/dateTime');

      if (startDate || endDate) {
        const filters = [];
        if (startDate) {
          filters.push(`start/dateTime ge '${startDate.toISOString()}'`);
        }
        if (endDate) {
          filters.push(`end/dateTime le '${endDate.toISOString()}'`);
        }
        query = query.filter(filters.join(' and '));
      }

      const response = await query.get();
      const events = response.value || [];
      
      return events.map((event: MicrosoftGraphEvent) => this.convertMicrosoftEvent(event));
    } catch (error) {
      throw await this.handleApiError(error, 'fetch events');
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
      
      const microsoftEvent = this.convertToMicrosoftEvent(event);
      
      const response = await this.graphClient
        .api(`/me/calendars/${calendarId}/events`)
        .post(microsoftEvent);

      return this.convertMicrosoftEvent(response);
    } catch (error) {
      throw await this.handleApiError(error, 'create event');
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
      
      const microsoftEvent = this.convertToMicrosoftEvent(event);
      
      const response = await this.graphClient
        .api(`/me/calendars/${calendarId}/events/${eventId}`)
        .patch(microsoftEvent);

      return this.convertMicrosoftEvent(response);
    } catch (error) {
      throw await this.handleApiError(error, 'update event');
    }
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    try {
      await this.ensureValidToken();
      
      await this.graphClient
        .api(`/me/calendars/${calendarId}/events/${eventId}`)
        .delete();
    } catch (error) {
      throw await this.handleApiError(error, 'delete event');
    }
  }

  async refreshTokens(refreshToken: string): Promise<CalendarProviderTokens> {
    try {
      const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          refresh_token: this.tokens.refreshToken!,
          grant_type: 'refresh_token',
          scope: this.tokens.scope || 'https://graph.microsoft.com/Calendars.ReadWrite offline_access',
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      const newTokens: CalendarProviderTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || this.tokens.refreshToken,
        expiresAt: new Date(Date.now() + (data.expires_in * 1000)),
        scope: data.scope || this.tokens.scope,
      };

      // Update internal tokens and auth provider
      this.tokens = newTokens;
      this.authProvider.updateAccessToken(newTokens.accessToken);

      return newTokens;
    } catch (error) {
      throw this.createProviderError(
        'Failed to refresh Microsoft tokens',
        'TOKEN_REFRESH_FAILED',
        error
      );
    }
  }

  // Microsoft-specific conversion methods
  private convertMicrosoftCalendar(microsoftCalendar: MicrosoftGraphCalendar): Calendar {
    return {
      id: microsoftCalendar.id || '',
      name: microsoftCalendar.name || '',
      description: '',
      timeZone: 'UTC', // Microsoft Graph doesn't provide timezone at calendar level
      color: this.convertMicrosoftColor(microsoftCalendar.color),
      primary: microsoftCalendar.isDefaultCalendar || false,
      providerId: 'microsoft' as CalendarProvider,
      providerCalendarId: microsoftCalendar.id || '',
    };
  }

  private convertMicrosoftEvent(microsoftEvent: MicrosoftGraphEvent): CalendarEvent {
    const startTime = this.parseMicrosoftDateTime(microsoftEvent.start);
    const endTime = this.parseMicrosoftDateTime(microsoftEvent.end);
    
    return {
      id: microsoftEvent.id || '',
      title: microsoftEvent.subject || '',
      description: microsoftEvent.body?.content || '',
      startTime,
      endTime,
      location: this.extractLocationString(microsoftEvent.location),
      attendees: (microsoftEvent.attendees || []).map(a => a.emailAddress?.address).filter(Boolean),
      calendarId: '',
      providerId: 'microsoft' as CalendarProvider,
      providerEventId: microsoftEvent.id || '',
    };
  }

  private convertToMicrosoftEvent(event: Partial<CalendarEvent>): Partial<MicrosoftGraphEvent> {
    const microsoftEvent: Partial<MicrosoftGraphEvent> = {
      subject: event.title,
      body: {
        contentType: 'text',
        content: event.description || '',
      },
    };

    // Handle start and end times
    if (event.startTime) {
      microsoftEvent.start = {
        dateTime: event.startTime.toISOString(),
        timeZone: 'UTC',
      };
    }

    if (event.endTime) {
      microsoftEvent.end = {
        dateTime: event.endTime.toISOString(),
        timeZone: 'UTC',
      };
    }

    // Handle location
    if (event.location) {
      microsoftEvent.location = {
        displayName: event.location,
      };
    }

    // Handle attendees
    if (event.attendees && event.attendees.length > 0) {
      microsoftEvent.attendees = event.attendees.map(email => ({
        emailAddress: {
          address: email,
          name: email,
        },
        status: {
          response: 'none',
        },
        type: 'required',
      }));
    }

    // Note: Reminders and recurrence are not part of the CalendarEvent interface
    // These would need to be handled separately if needed

    return microsoftEvent;
  }

  private parseMicrosoftDateTime(dateTime: any): Date {
    if (dateTime?.dateTime) {
      return new Date(dateTime.dateTime);
    }
    return new Date();
  }

  private convertMicrosoftColor(color?: string): string {
    // Microsoft Graph color mapping
    const colorMap: Record<string, string> = {
      'lightBlue': '#87CEEB',
      'lightGreen': '#90EE90',
      'lightOrange': '#FFB347',
      'lightGray': '#D3D3D3',
      'lightYellow': '#FFFFE0',
      'lightTeal': '#AFEEEE',
      'lightPink': '#FFB6C1',
      'lightBrown': '#DEB887',
      'lightRed': '#FFA07A',
      'maxColor': '#FF69B4',
    };

    return colorMap[color || 'lightBlue'] || '#1976D2';
  }

  private extractLocationString(location: any): string {
    if (typeof location === 'string') {
      return location;
    }
    if (location?.displayName) {
      return location.displayName;
    }
    if (location?.address) {
      const addr = location.address;
      return [addr.street, addr.city, addr.state, addr.countryOrRegion]
        .filter(Boolean)
        .join(', ');
    }
    return '';
  }

  private convertMicrosoftRecurrence(recurrence: any): string[] {
    if (!recurrence?.pattern) {
      return [];
    }

    const pattern = recurrence.pattern;
    const rruleComponents = ['RRULE:'];

    // Frequency mapping
    const freqMap: Record<string, string> = {
      'daily': 'DAILY',
      'weekly': 'WEEKLY',
      'monthly': 'MONTHLY',
      'yearly': 'YEARLY',
    };

    if (pattern.type && freqMap[pattern.type]) {
      rruleComponents.push(`FREQ=${freqMap[pattern.type]}`);
    }

    if (pattern.interval) {
      rruleComponents.push(`INTERVAL=${pattern.interval}`);
    }

    if (recurrence.range?.numberOfOccurrences) {
      rruleComponents.push(`COUNT=${recurrence.range.numberOfOccurrences}`);
    } else if (recurrence.range?.endDate) {
      rruleComponents.push(`UNTIL=${recurrence.range.endDate.replace(/-/g, '')}`);
    }

    return [rruleComponents.join(';')];
  }

  private convertToMicrosoftRecurrence(recurrence: string[]): any {
    if (!recurrence || recurrence.length === 0) {
      return null;
    }

    // Basic RRULE parsing - this is a simplified implementation
    const rrule = recurrence[0];
    const parts = rrule.replace('RRULE:', '').split(';');
    const ruleObj: Record<string, string> = {};

    parts.forEach(part => {
      const [key, value] = part.split('=');
      if (key && value) {
        ruleObj[key] = value;
      }
    });

    const pattern: any = {};
    const range: any = {};

    // Map frequency
    if (ruleObj.FREQ) {
      const freqMap: Record<string, string> = {
        'DAILY': 'daily',
        'WEEKLY': 'weekly',
        'MONTHLY': 'monthly',
        'YEARLY': 'yearly',
      };
      pattern.type = freqMap[ruleObj.FREQ] || 'daily';
    }

    if (ruleObj.INTERVAL) {
      pattern.interval = parseInt(ruleObj.INTERVAL, 10);
    }

    if (ruleObj.COUNT) {
      range.type = 'numbered';
      range.numberOfOccurrences = parseInt(ruleObj.COUNT, 10);
    } else if (ruleObj.UNTIL) {
      range.type = 'endDate';
      range.endDate = ruleObj.UNTIL;
    } else {
      range.type = 'noEnd';
    }

    return { pattern, range };
  }

  private convertMicrosoftStatus(showAs?: string): string {
    const statusMap: Record<string, string> = {
      'free': 'confirmed',
      'tentative': 'tentative',
      'busy': 'confirmed',
      'oof': 'confirmed',
      'workingElsewhere': 'confirmed',
    };

    return statusMap[showAs || 'busy'] || 'confirmed';
  }

  private convertMicrosoftSensitivity(sensitivity?: string): string {
    const visibilityMap: Record<string, string> = {
      'normal': 'default',
      'personal': 'private',
      'private': 'private',
      'confidential': 'confidential',
    };

    return visibilityMap[sensitivity || 'normal'] || 'default';
  }

  // Microsoft-specific utility methods
  async getCalendarView(
    calendarId: string,
    startTime: Date,
    endTime: Date
  ): Promise<CalendarEvent[]> {
    try {
      await this.ensureValidToken();
      
      const response = await this.graphClient
        .api(`/me/calendars/${calendarId}/calendarView`)
        .query({
          startDateTime: startTime.toISOString(),
          endDateTime: endTime.toISOString(),
        })
        .select('id,subject,body,start,end,location,attendees,isAllDay,recurrence,reminderMinutesBeforeStart,showAs,sensitivity,createdDateTime,lastModifiedDateTime,webLink')
        .top(1000)
        .get();

      const events = response.value || [];
      return events.map((event: MicrosoftGraphEvent) => this.convertMicrosoftEvent(event));
    } catch (error) {
      throw await this.handleApiError(error, 'fetch calendar view');
    }
  }

  async getFreeBusy(
    emails: string[],
    startTime: Date,
    endTime: Date
  ): Promise<Record<string, Array<{ start: Date; end: Date; status: string }>>> {
    try {
      await this.ensureValidToken();
      
      const response = await this.graphClient
        .api('/me/calendar/getSchedule')
        .post({
          schedules: emails,
          startTime: {
            dateTime: startTime.toISOString(),
            timeZone: 'UTC',
          },
          endTime: {
            dateTime: endTime.toISOString(),
            timeZone: 'UTC',
          },
          availabilityViewInterval: 15,
        });

      const freeBusy: Record<string, Array<{ start: Date; end: Date; status: string }>> = {};
      
      response.value?.forEach((schedule: any, index: number) => {
        const email = emails[index];
        freeBusy[email] = (schedule.busyViewData || []).map((period: any) => ({
          start: new Date(period.start.dateTime),
          end: new Date(period.end.dateTime),
          status: period.status || 'busy',
        }));
      });
      
      return freeBusy;
    } catch (error) {
      throw await this.handleApiError(error, 'fetch free/busy information');
    }
  }
}