// Calendar services index - exports all calendar-related functionality

// Base provider and interfaces
export { BaseCalendarProvider } from './base';
import type { CalendarProvider } from '../../../types/providers';
import type { CalendarProviderTokens, ICalendarProvider, CalendarEvent, Calendar } from '../../../types/providers';
export type { 
  ICalendarProvider,
  CalendarProvider,
  CalendarProviderTokens,
  CalendarProviderConfig,
  CalendarEvent,
  Calendar,
  CalendarProviderAccount,
  CalendarProviderFactory as ICalendarProviderFactory,
  ProviderError
} from '../../../types/providers';

// Type alias for backward compatibility
export type CalendarProviderType = CalendarProvider;

// Specific provider implementations
export { GoogleCalendarProvider } from './google';
export { MicrosoftCalendarProvider } from './microsoft';

// Factory and utilities
import { calendarProviderFactory, ProviderUtils } from './factory';
import type { ProviderError } from './factory';
export { 
  CalendarProviderFactory, 
  ProviderUtils,
  calendarProviderFactory 
} from './factory';
export type { ProviderCapabilities } from './factory';

// Provider-specific types
export type {
  GoogleCalendarEvent,
  GoogleCalendar,
  GoogleCalendarListResponse,
  GoogleEventsListResponse,
  GoogleOAuthTokens,
  GoogleTokenInfo,
  GoogleApiError,
  GoogleEventConverter,
  GoogleCalendarConverter
} from '../../../types/google';

export type {
  MicrosoftGraphEvent,
  MicrosoftGraphCalendar,
  MicrosoftGraphCalendarListResponse,
  MicrosoftGraphEventsListResponse,
  MicrosoftOAuthTokens,
  MicrosoftTokenInfo,
  MicrosoftGraphError,
  MicrosoftEventConverter,
  MicrosoftCalendarConverter,
  MicrosoftGraphUser
} from '../../../types/microsoft';

// Utility functions for calendar operations
export class CalendarServiceUtils {
  /**
   * Get all supported calendar provider types
   */
  static getSupportedProviders(): CalendarProviderType[] {
    return calendarProviderFactory.getSupportedProviders();
  }

  /**
   * Check if a provider type is supported
   */
  static isProviderSupported(type: CalendarProviderType): boolean {
    return calendarProviderFactory.isProviderSupported(type);
  }

  /**
   * Get provider capabilities
   */
  static async getProviderCapabilities(type: CalendarProviderType) {
    return calendarProviderFactory.getProviderCapabilities(type);
  }

  /**
   * Validate provider configuration
   */
  static validateProviderConfig(type: CalendarProviderType): boolean {
    return ProviderUtils.validateProviderConfig(type);
  }

  /**
   * Get required environment variables for a provider
   */
  static getRequiredEnvVars(type: CalendarProviderType): string[] {
    return ProviderUtils.getRequiredEnvVars(type);
  }

  /**
   * Get OAuth scopes for a provider
   */
  static getOAuthScopes(type: CalendarProviderType): string[] {
    return ProviderUtils.getOAuthScopes(type);
  }

  /**
   * Get provider display information
   */
  static getProviderInfo(type: CalendarProviderType) {
    return {
      name: ProviderUtils.getProviderDisplayName(type),
      icon: ProviderUtils.getProviderIcon(type),
      color: ProviderUtils.getProviderColor(type),
      authUrl: ProviderUtils.getAuthUrl(type),
      tokenUrl: ProviderUtils.getTokenUrl(type),
      scopes: ProviderUtils.getOAuthScopes(type),
      requiredEnvVars: ProviderUtils.getRequiredEnvVars(type),
    };
  }

  /**
   * Create a calendar provider instance
   */
  static createProvider(
    type: CalendarProviderType,
    tokens: CalendarProviderTokens
  ): ICalendarProvider {
    return calendarProviderFactory.createProvider(type, tokens);
  }

  // Additional utility methods can be added here as needed

  /**
   * Normalize event data across providers
   */
  static normalizeEvent(event: any, providerType: CalendarProviderType): CalendarEvent {
    // This would contain provider-specific normalization logic
    // For now, return the event as-is assuming it's already normalized
    return event as CalendarEvent;
  }

  /**
   * Normalize calendar data across providers
   */
  static normalizeCalendar(calendar: any, providerType: CalendarProviderType): Calendar {
    // This would contain provider-specific normalization logic
    // For now, return the calendar as-is assuming it's already normalized
    return calendar as Calendar;
  }

  /**
   * Convert event to provider-specific format
   */
  static convertEventToProvider(
    event: CalendarEvent,
    providerType: CalendarProviderType
  ): any {
    // This would contain provider-specific conversion logic
    // For now, return the event as-is
    return event;
  }

  /**
   * Validate event data
   */
  static validateEvent(event: Partial<CalendarEvent>): string[] {
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
      errors.push('Event start time must be before end time');
    }

    if (event.attendees && event.attendees.length > 100) {
      errors.push('Too many attendees (maximum 100)');
    }

    if (event.title && event.title.length > 1000) {
      errors.push('Event title too long (maximum 1000 characters)');
    }

    if (event.description && event.description.length > 8000) {
      errors.push('Event description too long (maximum 8000 characters)');
    }

    return errors;
  }

  /**
   * Generate event summary for logging/debugging
   */
  static getEventSummary(event: CalendarEvent): string {
    const start = event.startTime.toISOString();
    const end = event.endTime.toISOString();
    return `"${event.title}" (${start} - ${end})`;
  }

  /**
   * Get calendar summary string
   */
  static getCalendarSummary(calendar: Calendar): string {
    return `"${calendar.name}" (${calendar.id}) - ${calendar.primary ? 'Primary' : 'Secondary'}`;
  }

  /**
   * Check if tokens need refresh (within 5 minutes of expiry)
   */
  static needsTokenRefresh(tokens: CalendarProviderTokens): boolean {
    if (!tokens.expiresAt) {
      return false;
    }

    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    const expirationTime = tokens.expiresAt.getTime() - bufferTime;
    return Date.now() >= expirationTime;
  }

  /**
   * Get time until token expiry
   */
  static getTokenExpiryTime(tokens: CalendarProviderTokens): number | null {
    if (!tokens.expiresAt) {
      return null;
    }

    return tokens.expiresAt.getTime() - Date.now();
  }

  /**
   * Format provider error for user display
   */
  static formatProviderError(error: any): string {
    if (error && typeof error === 'object' && 'providerId' in error && 'code' in error) {
      switch (error.code) {
        case 'TOKEN_EXPIRED':
          return 'Your calendar connection has expired. Please reconnect your account.';
        case 'INSUFFICIENT_PERMISSIONS':
          return 'Insufficient permissions to access your calendar. Please check your account settings.';
        case 'RATE_LIMIT_EXCEEDED':
          return 'Too many requests. Please try again in a few minutes.';
        case 'NETWORK_ERROR':
          return 'Network error. Please check your internet connection and try again.';
        case 'VALIDATION_ERROR':
          return `Invalid data: ${error.message}`;
        default:
          return error.message || 'An error occurred while accessing your calendar.';
      }
    }

    return 'An unexpected error occurred. Please try again.';
  }
}