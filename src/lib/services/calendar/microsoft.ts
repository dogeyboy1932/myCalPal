// Microsoft Graph API service implementation

import { BaseCalendarProvider, CalendarTokens, CalendarInfo, CreateEventOptions, ListEventsOptions } from './base';
import { CalendarEvent } from '../../../types';

interface MicrosoftGraphEvent {
  id?: string;
  subject: string;
  body?: {
    contentType: 'HTML' | 'Text';
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
  };
  attendees?: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
  }>;
}

interface MicrosoftCalendar {
  id: string;
  name: string;
  description?: string;
  canEdit: boolean;
  isDefaultCalendar?: boolean;
  owner?: {
    name: string;
    address: string;
  };
}

export class MicrosoftCalendarProvider extends BaseCalendarProvider {
  private readonly baseUrl = 'https://graph.microsoft.com/v1.0';

  constructor(tokens: CalendarTokens) {
    super(tokens, 'microsoft');
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    await this.ensureValidTokens();

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.tokens.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Microsoft Graph API error: ${response.status} ${error}`);
    }

    return response.json();
  }

  async createEvent(event: CalendarEvent, options: CreateEventOptions = {}): Promise<any> {
    const calendarId = options.calendarId || 'me/calendar';
    
    const microsoftEvent: MicrosoftGraphEvent = {
      subject: event.title,
      body: {
        contentType: 'Text',
        content: event.description || '',
      },
      start: {
        dateTime: event.startTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: event.endTime.toISOString(),
        timeZone: 'UTC',
      },
    };

    if (event.location) {
      microsoftEvent.location = {
        displayName: event.location,
      };
    }

    const endpoint = calendarId === 'me/calendar' 
      ? '/me/events'
      : `/me/calendars/${calendarId}/events`;

    return this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(microsoftEvent),
    });
  }

  async updateEvent(eventId: string, event: Partial<CalendarEvent>, calendarId?: string): Promise<any> {
    const microsoftEvent: Partial<MicrosoftGraphEvent> = {};

    if (event.title) microsoftEvent.subject = event.title;
    if (event.description) {
      microsoftEvent.body = {
        contentType: 'Text',
        content: event.description,
      };
    }
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
    if (event.location) {
      microsoftEvent.location = {
        displayName: event.location,
      };
    }

    const endpoint = calendarId 
      ? `/me/calendars/${calendarId}/events/${eventId}`
      : `/me/events/${eventId}`;

    return this.makeRequest(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(microsoftEvent),
    });
  }

  async deleteEvent(eventId: string, calendarId?: string): Promise<void> {
    const endpoint = calendarId 
      ? `/me/calendars/${calendarId}/events/${eventId}`
      : `/me/events/${eventId}`;

    await this.makeRequest(endpoint, {
      method: 'DELETE',
    });
  }

  async getEvent(eventId: string, calendarId?: string): Promise<any> {
    const endpoint = calendarId 
      ? `/me/calendars/${calendarId}/events/${eventId}`
      : `/me/events/${eventId}`;

    return this.makeRequest(endpoint);
  }

  async listEvents(options: ListEventsOptions = {}): Promise<any[]> {
    const calendarId = options.calendarId || 'me/calendar';
    let endpoint = calendarId === 'me/calendar' 
      ? '/me/events'
      : `/me/calendars/${calendarId}/events`;

    const params = new URLSearchParams();
    
    if (options.timeMin) {
      params.append('$filter', `start/dateTime ge '${options.timeMin.toISOString()}'`);
    }
    if (options.timeMax) {
      const filter = params.get('$filter');
      const timeMaxFilter = `end/dateTime le '${options.timeMax.toISOString()}'`;
      if (filter) {
        params.set('$filter', `${filter} and ${timeMaxFilter}`);
      } else {
        params.append('$filter', timeMaxFilter);
      }
    }
    if (options.maxResults) {
      params.append('$top', options.maxResults.toString());
    }
    if (options.orderBy === 'startTime') {
      params.append('$orderby', 'start/dateTime');
    } else if (options.orderBy === 'updated') {
      params.append('$orderby', 'lastModifiedDateTime');
    }

    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    const response = await this.makeRequest(endpoint);
    return response.value || [];
  }

  async listCalendars(): Promise<CalendarInfo[]> {
    const response = await this.makeRequest('/me/calendars');
    const calendars: MicrosoftCalendar[] = response.value || [];

    return calendars.map(cal => ({
      id: cal.id,
      name: cal.name,
      description: cal.description,
      isPrimary: cal.isDefaultCalendar || false,
      canWrite: cal.canEdit,
    }));
  }

  async refreshTokens(): Promise<CalendarTokens> {
    if (!this.tokens.refreshToken) {
      throw new Error('No refresh token available for Microsoft Graph');
    }

    const tokenEndpoint = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
    const params = new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      refresh_token: this.tokens.refreshToken,
      grant_type: 'refresh_token',
      scope: process.env.MICROSOFT_GRAPH_SCOPE || 'https://graph.microsoft.com/calendars.readwrite https://graph.microsoft.com/user.read',
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh Microsoft tokens: ${response.status} ${error}`);
    }

    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || this.tokens.refreshToken,
      expiresAt: Date.now() + (data.expires_in * 1000),
    };
  }
}