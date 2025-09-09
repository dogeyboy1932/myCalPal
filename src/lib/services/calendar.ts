// Multi-provider calendar service using abstraction layer

import { CalendarEvent, CalendarProvider } from '../../types';
import { BaseCalendarProvider, CalendarTokens } from './calendar/base';
import { createCalendarService } from './calendar/factory';

// Legacy interface for backward compatibility
// export interface CalendarTokens {
//   accessToken: string;
//   refreshToken?: string;
// }

// Updated CalendarService that uses the abstraction layer
export class CalendarService {
  private provider: BaseCalendarProvider;

  constructor(tokens: CalendarTokens, providerType: CalendarProvider = 'google') {
    this.provider = createCalendarService(tokens, providerType);
  }

  getProvider(): BaseCalendarProvider {
    return this.provider;
  }

  async createEvent(event: CalendarEvent, calendarId?: string) {
    return this.provider.createEvent(event, { calendarId });
  }

  async listCalendars() {
    return this.provider.listCalendars();
  }

  async listEvents(calendarId: string = 'primary') {
    return this.provider.listEvents({ calendarId });
  }
}

export function createCalendarService2(tokens: CalendarTokens, provider: CalendarProvider = 'google') {
  return new CalendarService(tokens, provider);
}