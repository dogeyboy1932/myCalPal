// Base calendar provider interface and abstract implementation

import { 
  ICalendarProvider, 
  CalendarEvent, 
  Calendar, 
  CalendarProvider,
  CalendarProviderTokens,
  ProviderError
} from '../../../types/providers';

export abstract class BaseCalendarProvider implements ICalendarProvider {
  protected provider: CalendarProvider;
  protected tokens: CalendarProviderTokens;
  protected userId: string;

  constructor(provider: CalendarProvider, tokens: CalendarProviderTokens, userId: string) {
    this.provider = provider;
    this.tokens = tokens;
    this.userId = userId;
  }

  // Required by ICalendarProvider interface
  get providerId(): CalendarProvider {
    return this.provider;
  }

  // Abstract methods that must be implemented by concrete providers
  abstract authenticate(tokens: CalendarProviderTokens): Promise<void>;
  abstract getCalendars(): Promise<Calendar[]>;
  abstract getCalendar(calendarId: string): Promise<Calendar>;
  abstract createEvent(calendarId: string, event: Omit<CalendarEvent, 'id' | 'providerId' | 'providerEventId'>): Promise<CalendarEvent>;
  abstract getEvent(calendarId: string, eventId: string): Promise<CalendarEvent>;
  abstract updateEvent(calendarId: string, eventId: string, event: Partial<CalendarEvent>): Promise<CalendarEvent>;
  abstract deleteEvent(calendarId: string, eventId: string): Promise<void>;
  abstract listEvents(calendarId: string, startDate?: Date, endDate?: Date): Promise<CalendarEvent[]>;
  abstract refreshTokens(refreshToken: string): Promise<CalendarProviderTokens>;

  // Common utility methods
  protected createProviderError(message: string, code?: string, originalError?: any): ProviderError {
    const error = new Error(message) as ProviderError;
    error.providerId = this.provider;
    error.code = code;
    error.name = 'ProviderError';
    if (originalError?.status || originalError?.statusCode) {
      error.statusCode = originalError.status || originalError.statusCode;
    }
    return error;
  }

  protected validateEvent(event: Partial<CalendarEvent>): string[] {
    const errors: string[] = [];

    if (!event.title || event.title.trim().length === 0) {
      errors.push('Event title is required');
    }

    if (!event.startTime) {
      errors.push('Event start time is required');
    }

    if (!event.endTime) {
      errors.push('Event end time is required');
    }

    if (event.startTime && event.endTime && event.startTime >= event.endTime) {
      errors.push('Event end time must be after start time');
    }

    if (event.attendees) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      event.attendees.forEach((email, index) => {
        if (!emailRegex.test(email)) {
          errors.push(`Invalid email address at index ${index}: ${email}`);
        }
      });
    }

    return errors;
  }

  protected formatDateTime(date: Date, timezone?: string): string {
    if (timezone) {
      return date.toISOString();
    }
    return date.toISOString();
  }

  protected parseDateTime(dateString: string): Date {
    return new Date(dateString);
  }

  protected async handleApiError(error: any, operation: string): Promise<never> {
    console.error(`${this.provider} API error during ${operation}:`, error);
    
    let message = `Failed to ${operation}`;
    let code = 'UNKNOWN_ERROR';

    if (error.response) {
      // HTTP error response
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 401:
          code = 'UNAUTHORIZED';
          message = 'Authentication failed. Please reconnect your account.';
          break;
        case 403:
          code = 'FORBIDDEN';
          message = 'Insufficient permissions to perform this operation.';
          break;
        case 404:
          code = 'NOT_FOUND';
          message = 'The requested resource was not found.';
          break;
        case 429:
          code = 'RATE_LIMITED';
          message = 'Rate limit exceeded. Please try again later.';
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          code = 'SERVER_ERROR';
          message = 'Server error. Please try again later.';
          break;
        default:
          message = data?.error?.message || data?.message || message;
      }
    } else if (error.code) {
      // Network or other errors
      code = error.code;
      message = error.message || message;
    }

    throw this.createProviderError(message, code, error);
  }

  // Token management helpers
  protected isTokenExpired(): boolean {
    if (!this.tokens.expiresAt) {
      return false;
    }
    
    // Add 5-minute buffer
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    return this.tokens.expiresAt.getTime() - bufferTime <= Date.now();
  }

  protected async ensureValidToken(): Promise<void> {
    if (this.isTokenExpired()) {
      try {
        if (!this.tokens.refreshToken) {
          throw new Error('No refresh token available');
        }
        this.tokens = await this.refreshTokens(this.tokens.refreshToken);
      } catch (error) {
        throw this.createProviderError(
          'Failed to refresh access token',
          'TOKEN_REFRESH_FAILED',
          error
        );
      }
    }
  }

  // Common HTTP request helper
  protected async makeRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    await this.ensureValidToken();

    const headers = {
      'Authorization': `Bearer ${this.tokens.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = {
        response: {
          status: response.status,
          statusText: response.statusText,
          data: await response.json().catch(() => ({})),
        },
      };
      throw error;
    }

    return response.json();
  }

  // Utility methods for date/time handling
  protected convertToProviderTimezone(date: Date, timezone: string): Date {
    // This is a simplified implementation
    // In a real application, you might want to use a library like date-fns-tz
    return date;
  }

  protected convertFromProviderTimezone(date: Date, timezone: string): Date {
    // This is a simplified implementation
    return date;
  }

  // Event validation and normalization
  protected normalizeEvent(event: any): CalendarEvent {
    return {
      id: event.id || '',
      title: event.title || event.summary || '',
      description: event.description || '',
      startTime: this.parseDateTime(event.startTime || event.start?.dateTime || event.start?.date),
      endTime: this.parseDateTime(event.endTime || event.end?.dateTime || event.end?.date),
      location: event.location || '',
      attendees: event.attendees?.map((a: any) => a.email || a.emailAddress?.address).filter(Boolean) || [],
      providerId: this.provider,
      providerEventId: event.id || event.providerEventId,
    };
  }

  protected normalizeCalendar(calendar: any): Calendar {
    return {
      id: calendar.id || '',
      name: calendar.name || calendar.summary || calendar.displayName || '',
      description: calendar.description || '',
      primary: calendar.isPrimary || calendar.primary || false,
      providerId: this.provider,
      providerCalendarId: calendar.id || '',
      color: calendar.color || calendar.colorId || '#1976D2',
      timeZone: calendar.timezone || calendar.timeZone || 'UTC',
    };
  }

  // Health check method
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message?: string }> {
    try {
      await this.ensureValidToken();
      // Try to fetch calendars as a basic health check
      await this.getCalendars();
      return { status: 'healthy' };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Getter methods
  getProvider(): CalendarProvider {
    return this.provider;
  }

  getUserId(): string {
    return this.userId;
  }

  getTokens(): CalendarProviderTokens {
    return { ...this.tokens }; // Return a copy to prevent mutation
  }
}