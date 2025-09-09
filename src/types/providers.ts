// Calendar provider interfaces and abstractions

export type CalendarProvider = 'google' | 'microsoft';

export interface CalendarProviderConfig {
  id: CalendarProvider;
  name: string;
  enabled: boolean;
  authUrl?: string;
  scopes: string[];
}

export interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees?: string[];
  calendarId?: string;
  providerId: CalendarProvider;
  providerEventId?: string;
}

export interface Calendar {
  id: string;
  name: string;
  description?: string;
  primary?: boolean;
  providerId: CalendarProvider;
  providerCalendarId: string;
  color?: string;
  timeZone?: string;
}

export interface CalendarProviderTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
}

export interface CalendarProviderAccount {
  providerId: CalendarProvider;
  providerAccountId: string;
  email: string;
  name?: string;
  tokens: CalendarProviderTokens;
  isActive: boolean;
  lastSyncAt?: Date;
}

// Abstract calendar provider interface
export interface ICalendarProvider {
  readonly providerId: CalendarProvider;
  
  // Authentication
  authenticate(tokens: CalendarProviderTokens): Promise<void>;
  refreshTokens(refreshToken: string): Promise<CalendarProviderTokens>;
  
  // Calendar operations
  getCalendars(): Promise<Calendar[]>;
  getCalendar(calendarId: string): Promise<Calendar>;
  
  // Event operations
  createEvent(calendarId: string, event: Omit<CalendarEvent, 'id' | 'providerId' | 'providerEventId'>): Promise<CalendarEvent>;
  getEvent(calendarId: string, eventId: string): Promise<CalendarEvent>;
  updateEvent(calendarId: string, eventId: string, event: Partial<CalendarEvent>): Promise<CalendarEvent>;
  deleteEvent(calendarId: string, eventId: string): Promise<void>;
  listEvents(calendarId: string, startDate?: Date, endDate?: Date): Promise<CalendarEvent[]>;
}

export interface CalendarProviderFactory {
  createProvider(providerId: CalendarProvider, tokens: CalendarProviderTokens): ICalendarProvider;
  getSupportedProviders(): CalendarProvider[];
  isProviderSupported(providerId: CalendarProvider): boolean;
}

export interface ProviderError extends Error {
  providerId: CalendarProvider;
  code?: string;
  statusCode?: number;
}