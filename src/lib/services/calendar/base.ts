// Abstract calendar provider interface

import { CalendarEvent, CalendarProvider } from '../../../types';

export interface CalendarTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface CalendarInfo {
  id: string;
  name: string;
  description?: string;
  isPrimary?: boolean;
  canWrite?: boolean;
  timeZone?: string;
}

export interface CreateEventOptions {
  calendarId?: string;
  sendNotifications?: boolean;
}

export interface ListEventsOptions {
  calendarId?: string;
  timeMin?: Date;
  timeMax?: Date;
  maxResults?: number;
  orderBy?: 'startTime' | 'updated';
}

// Abstract base class for calendar providers
export abstract class BaseCalendarProvider {
  protected tokens: CalendarTokens;
  protected provider: CalendarProvider;

  constructor(tokens: CalendarTokens, provider: CalendarProvider) {
    this.tokens = tokens;
    this.provider = provider;
  }

  // Abstract methods that must be implemented by concrete providers
  abstract createEvent(event: CalendarEvent, options?: CreateEventOptions): Promise<any>;
  abstract updateEvent(eventId: string, event: Partial<CalendarEvent>, calendarId?: string): Promise<any>;
  abstract deleteEvent(eventId: string, calendarId?: string): Promise<void>;
  abstract getEvent(eventId: string, calendarId?: string): Promise<any>;
  abstract listEvents(options?: ListEventsOptions): Promise<any[]>;
  abstract listCalendars(): Promise<CalendarInfo[]>;
  abstract refreshTokens(): Promise<CalendarTokens>;

  // Common utility methods
  getProvider(): CalendarProvider {
    return this.provider;
  }

  getTokens(): CalendarTokens {
    return this.tokens;
  }

  updateTokens(tokens: CalendarTokens): void {
    this.tokens = tokens;
  }

  // Check if tokens are expired
  isTokenExpired(): boolean {
    if (!this.tokens.expiresAt) return false;
    return Date.now() >= this.tokens.expiresAt;
  }

  // Ensure tokens are valid, refresh if needed
  async ensureValidTokens(): Promise<void> {
    if (this.isTokenExpired()) {
      this.tokens = await this.refreshTokens();
    }
  }
}

// Factory function type
export type CalendarProviderFactory = (tokens: CalendarTokens, provider: CalendarProvider) => BaseCalendarProvider;