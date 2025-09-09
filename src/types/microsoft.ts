// Microsoft Graph/Outlook specific types and interfaces

import { CalendarEvent, Calendar } from './providers';

// Microsoft Graph Calendar API specific types
export interface MicrosoftGraphEvent {
  id?: string;
  subject: string;
  body?: {
    contentType: 'text' | 'html';
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
    displayName?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      countryOrRegion?: string;
      postalCode?: string;
    };
    coordinates?: {
      latitude?: number;
      longitude?: number;
    };
  };
  attendees?: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
    status: {
      response: 'none' | 'organizer' | 'tentativelyAccepted' | 'accepted' | 'declined' | 'notResponded';
      time?: string;
    };
    type: 'required' | 'optional' | 'resource';
  }>;
  organizer?: {
    emailAddress: {
      address: string;
      name?: string;
    };
  };
  showAs?: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown';
  sensitivity?: 'normal' | 'personal' | 'private' | 'confidential';
  importance?: 'low' | 'normal' | 'high';
  isAllDay?: boolean;
  isCancelled?: boolean;
  isOrganizer?: boolean;
  responseRequested?: boolean;
  seriesMasterId?: string;
  type?: 'singleInstance' | 'occurrence' | 'exception' | 'seriesMaster';
  webLink?: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  categories?: string[];
}

export interface MicrosoftGraphCalendar {
  id: string;
  name: string;
  color?: 'auto' | 'lightBlue' | 'lightGreen' | 'lightOrange' | 'lightGray' | 'lightYellow' | 'lightTeal' | 'lightPink' | 'lightBrown' | 'lightRed' | 'maxColor';
  hexColor?: string;
  isDefaultCalendar?: boolean;
  changeKey?: string;
  canShare?: boolean;
  canViewPrivateItems?: boolean;
  canEdit?: boolean;
  allowedOnlineMeetingProviders?: string[];
  defaultOnlineMeetingProvider?: string;
  isTallyingResponses?: boolean;
  isRemovable?: boolean;
  owner?: {
    name?: string;
    address?: string;
  };
}

export interface MicrosoftGraphCalendarListResponse {
  '@odata.context': string;
  '@odata.nextLink'?: string;
  value: MicrosoftGraphCalendar[];
}

export interface MicrosoftGraphEventsListResponse {
  '@odata.context': string;
  '@odata.nextLink'?: string;
  value: MicrosoftGraphEvent[];
}

// Conversion utilities types
export interface MicrosoftEventConverter {
  toMicrosoftEvent(event: Omit<CalendarEvent, 'id' | 'providerId' | 'providerEventId'>): MicrosoftGraphEvent;
  fromMicrosoftEvent(microsoftEvent: MicrosoftGraphEvent): CalendarEvent;
}

export interface MicrosoftCalendarConverter {
  toCalendar(microsoftCalendar: MicrosoftGraphCalendar): Calendar;
  fromCalendar(calendar: Calendar): Partial<MicrosoftGraphCalendar>;
}

// Microsoft Graph API error types
export interface MicrosoftGraphError {
  error: {
    code: string;
    message: string;
    innerError?: {
      'request-id': string;
      date: string;
    };
    details?: Array<{
      code: string;
      message: string;
      target?: string;
    }>;
  };
}

// Microsoft OAuth specific types
export interface MicrosoftOAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  id_token?: string;
}

export interface MicrosoftTokenInfo {
  aud: string;
  iss: string;
  iat: number;
  nbf: number;
  exp: number;
  aio: string;
  name: string;
  oid: string;
  preferred_username: string;
  rh: string;
  sub: string;
  tid: string;
  uti: string;
  ver: string;
}

// Microsoft Graph user info
export interface MicrosoftGraphUser {
  id: string;
  displayName?: string;
  givenName?: string;
  surname?: string;
  userPrincipalName?: string;
  mail?: string;
  mobilePhone?: string;
  officeLocation?: string;
  preferredLanguage?: string;
  jobTitle?: string;
  businessPhones?: string[];
}