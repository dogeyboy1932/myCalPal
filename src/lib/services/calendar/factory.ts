// Calendar provider factory for dynamic provider selection

import { BaseCalendarProvider, CalendarTokens } from './base';
import { GoogleCalendarProvider } from './google';
import { MicrosoftCalendarProvider } from './microsoft';
import { CalendarProvider } from '../../../types';

export class CalendarProviderFactory {
  static createProvider(tokens: CalendarTokens, provider: CalendarProvider): BaseCalendarProvider {
    switch (provider) {
      case 'google':
        return new GoogleCalendarProvider(tokens);
      case 'microsoft':
        return new MicrosoftCalendarProvider(tokens);
      default:
        throw new Error(`Unsupported calendar provider: ${provider}`);
    }
  }

  static getSupportedProviders(): CalendarProvider[] {
    return ['google', 'microsoft'];
  }

  static isProviderSupported(provider: string): provider is CalendarProvider {
    return this.getSupportedProviders().includes(provider as CalendarProvider);
  }
}

// Convenience function for creating calendar services
export function createCalendarService(tokens: CalendarTokens, provider: CalendarProvider): BaseCalendarProvider {
  return CalendarProviderFactory.createProvider(tokens, provider);
}