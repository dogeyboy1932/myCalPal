// Multi-provider calendar service using abstraction layer

import { CalendarEvent, CalendarProvider } from '../../types';
import { BaseCalendarProvider, CalendarTokens } from './calendar/base';
import { createCalendarService } from './calendar/factory';



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
    console.log('📋 CalendarService: Creating event...', {
      title: event.title,
      startTime: event.startTime?.toISOString(),
      endTime: event.endTime?.toISOString(),
      calendarId
    });
    
    try {
      const result = await this.provider.createEvent(event, { calendarId });
      
      console.log('✅ CalendarService: Event created successfully:', {
        eventId: result.id,
        htmlLink: result.htmlLink || result.url,
        status: result.status
      });
      
      return result;
    } catch (error: any) {
      console.error('❌ CalendarService: Failed to create event:', {
        error: error.message,
        title: event.title
      });
      throw error;
    }
  }

  async listCalendars() {
    return this.provider.listCalendars();
  }

  async listEvents(calendarId: string = 'primary') {
    return this.provider.listEvents({ calendarId });
  }
}