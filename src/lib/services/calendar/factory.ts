// Calendar provider factory for managing different calendar providers

import {
  CalendarProvider,
  ICalendarProvider,
  CalendarProviderTokens,
  CalendarProviderFactory as ICalendarProviderFactory,
  ProviderError
} from '../../../types/providers';
import { GoogleCalendarProvider } from './google';
import { MicrosoftCalendarProvider } from './microsoft';

export class CalendarProviderFactory implements ICalendarProviderFactory {
  private static instance: CalendarProviderFactory;
  private providers: Map<string, ICalendarProvider> = new Map();

  private constructor() {}

  static getInstance(): CalendarProviderFactory {
    if (!CalendarProviderFactory.instance) {
      CalendarProviderFactory.instance = new CalendarProviderFactory();
    }
    return CalendarProviderFactory.instance;
  }

  createProvider(
    providerId: CalendarProvider,
    tokens: CalendarProviderTokens
  ): ICalendarProvider {
    // Create provider based on type
    let provider: ICalendarProvider;
    
    switch (providerId) {
      case 'google':
        provider = new GoogleCalendarProvider(tokens, 'default');
        break;
      case 'microsoft':
        provider = new MicrosoftCalendarProvider(tokens, 'default');
        break;
      default:
        throw new Error(`Unsupported provider: ${providerId}`);
    }
    
    return provider;
  }


  getSupportedProviders(): CalendarProvider[] {
    return ['google', 'microsoft'];
  }

  isProviderSupported(providerId: CalendarProvider): boolean {
    return ['google', 'microsoft'].includes(providerId);
  }

  getProviderCapabilities(providerId: CalendarProvider): ProviderCapabilities {
    const baseCapabilities: ProviderCapabilities = {
      canCreateEvents: true,
      canUpdateEvents: true,
      canDeleteEvents: true,
      canListCalendars: true,
      canListEvents: true,
      supportsRecurrence: true,
      supportsReminders: true,
      supportsAttendees: true,
      supportsTimezones: true,
      supportsColors: true,
      supportsFreeBusy: true,
      supportsCalendarSharing: false,
      supportsCategories: false,
      supportsSensitivity: false,
      maxEventDuration: 24 * 60 * 60 * 1000, // 24 hours
      maxRecurrenceCount: 1000,
      maxAttendeesPerEvent: 100,
      maxEventsPerRequest: 250,
      maxCalendarsPerUser: 50,
      maxRemindersPerEvent: 5,
      supportedRecurrenceTypes: ['daily', 'weekly', 'monthly', 'yearly'],
      supportedReminderMethods: ['email', 'popup']
    };

    switch (providerId) {
      case 'google':
        return {
          ...baseCapabilities,
          supportsCalendarSharing: true,
          supportsCategories: true,
          maxEventsPerRequest: 2500
        };
      case 'microsoft':
        return {
          ...baseCapabilities,
          supportsSensitivity: true,
          maxEventsPerRequest: 1000
        };
      default:
        throw new Error(`Unsupported provider: ${providerId}`);
    }
  }
}

// Provider capabilities interface
export interface ProviderCapabilities {
  canCreateEvents: boolean;
  canUpdateEvents: boolean;
  canDeleteEvents: boolean;
  canListCalendars: boolean;
  canListEvents: boolean;
  supportsRecurrence: boolean;
  supportsReminders: boolean;
  supportsAttendees: boolean;
  supportsTimezones: boolean;
  supportsColors?: boolean;
  supportsFreeBusy?: boolean;
  supportsCalendarSharing?: boolean;
  supportsCategories?: boolean;
  supportsSensitivity?: boolean;
  maxEventDuration: number; // in milliseconds
  maxRecurrenceCount: number;
  maxAttendeesPerEvent: number;
  maxEventsPerRequest: number;
  maxCalendarsPerUser: number;
  maxRemindersPerEvent: number;
  supportedRecurrenceTypes: string[];
  supportedReminderMethods: string[];
}

// Utility functions for provider management
export class ProviderUtils {
  static getProviderDisplayName(type: CalendarProvider): string {
    const displayNames: Record<CalendarProvider, string> = {
      google: 'Google Calendar',
      microsoft: 'Microsoft Outlook',
    };
    return displayNames[type] || type;
  }

  static getProviderIcon(type: CalendarProvider): string {
    const icons: Record<CalendarProvider, string> = {
      google: '🗓️',
      microsoft: '📅',
    };
    return icons[type] || '📆';
  }

  static getProviderColor(type: CalendarProvider): string {
    const colors: Record<CalendarProvider, string> = {
      google: '#4285F4',
      microsoft: '#0078D4',
    };
    return colors[type] || '#666666';
  }

  static getOAuthScopes(type: CalendarProvider): string[] {
    const scopes: Record<CalendarProvider, string[]> = {
      google: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ],
      microsoft: [
        'https://graph.microsoft.com/Calendars.ReadWrite',
        'https://graph.microsoft.com/User.Read',
        'offline_access',
      ],
    };
    return scopes[type] || [];
  }

  static getAuthUrl(type: CalendarProvider): string {
    const authUrls: Record<CalendarProvider, string> = {
      google: 'https://accounts.google.com/o/oauth2/v2/auth',
      microsoft: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    };
    return authUrls[type] || '';
  }

  static getTokenUrl(type: CalendarProvider): string {
    const tokenUrls: Record<CalendarProvider, string> = {
      google: 'https://oauth2.googleapis.com/token',
      microsoft: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    };
    return tokenUrls[type] || '';
  }

  static validateProviderConfig(type: CalendarProvider): boolean {
    switch (type) {
      case 'google':
        return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
      case 'microsoft':
        return !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
      default:
        return false;
    }
  }

  static getRequiredEnvVars(type: CalendarProvider): string[] {
    const envVars: Record<CalendarProvider, string[]> = {
      google: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
      microsoft: ['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET'],
    };
    return envVars[type] || [];
  }
}

// Export singleton instance
export const calendarProviderFactory = CalendarProviderFactory.getInstance();

// Re-export ProviderError for convenience
export type { ProviderError };