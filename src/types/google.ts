// Google Calendar specific types and interfaces

import { CalendarEvent, Calendar } from './providers';

// Google Calendar API specific types
export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  }>;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  visibility?: 'default' | 'public' | 'private' | 'confidential';
  colorId?: string;
  htmlLink?: string;
  created?: string;
  updated?: string;
  creator?: {
    email?: string;
    displayName?: string;
  };
  organizer?: {
    email?: string;
    displayName?: string;
  };
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  backgroundColor?: string;
  foregroundColor?: string;
  colorId?: string;
  timeZone?: string;
  accessRole?: 'freeBusyReader' | 'reader' | 'writer' | 'owner';
  selected?: boolean;
}

export interface GoogleCalendarListResponse {
  kind: 'calendar#calendarList';
  etag: string;
  nextPageToken?: string;
  items: GoogleCalendar[];
}

export interface GoogleEventsListResponse {
  kind: 'calendar#events';
  etag: string;
  summary: string;
  description?: string;
  updated: string;
  timeZone: string;
  accessRole: string;
  nextPageToken?: string;
  items: GoogleCalendarEvent[];
}

// Conversion utilities types
export interface GoogleEventConverter {
  toGoogleEvent(event: Omit<CalendarEvent, 'id' | 'providerId' | 'providerEventId'>): GoogleCalendarEvent;
  fromGoogleEvent(googleEvent: GoogleCalendarEvent): CalendarEvent;
}

export interface GoogleCalendarConverter {
  toCalendar(googleCalendar: GoogleCalendar): Calendar;
  fromCalendar(calendar: Calendar): Partial<GoogleCalendar>;
}

// Google API error types
export interface GoogleApiError {
  error: {
    code: number;
    message: string;
    errors?: Array<{
      domain: string;
      reason: string;
      message: string;
      location?: string;
      locationType?: string;
    }>;
  };
}

// Google OAuth specific types
export interface GoogleOAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

export interface GoogleTokenInfo {
  azp: string;
  aud: string;
  sub: string;
  scope: string;
  exp: number;
  expires_in: number;
  email: string;
  email_verified: boolean;
  access_type: string;
}