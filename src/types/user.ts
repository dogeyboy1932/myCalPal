// User profile and multi-provider authentication types

import { CalendarProvider, CalendarProviderAccount } from './providers';

export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  
  // Multi-provider accounts
  connectedProviders: CalendarProviderAccount[];
  defaultProvider?: CalendarProvider;
  
  // User preferences
  preferences: UserPreferences;
  
  // Account metadata
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
}

export interface UserPreferences {
  // Calendar preferences
  defaultCalendarId?: string;
  defaultProvider?: CalendarProvider;
  timeZone: string;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
  
  // Event defaults
  defaultEventDuration: number; // in minutes
  defaultReminders: number[]; // minutes before event
  defaultVisibility: 'public' | 'private';
  
  // AI extraction preferences
  aiExtractionEnabled: boolean;
  aiConfidenceThreshold: number; // 0-1
  autoPublishHighConfidence: boolean;
  
  // Notification preferences
  emailNotifications: {
    draftReady: boolean;
    publishSuccess: boolean;
    publishFailure: boolean;
    weeklyDigest: boolean;
  };
  
  // UI preferences
  theme: 'light' | 'dark' | 'system';
  language: string;
  compactView: boolean;
}

export interface UserSession {
  user: {
    id: string;
    email: string;
    name?: string;
    image?: string;
  };
  connectedProviders: CalendarProvider[];
  defaultProvider?: CalendarProvider;
  expires: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  image?: string;
  preferences: UserPreferences;
  connectedProviders: Array<{
    providerId: CalendarProvider;
    email: string;
    name?: string;
    isActive: boolean;
    lastSyncAt?: Date;
  }>;
  statistics: UserStatistics;
}

export interface UserStatistics {
  totalDrafts: number;
  publishedEvents: number;
  successRate: number;
  averageProcessingTime: number;
  mostUsedProvider: CalendarProvider;
  mostUsedCalendar: string;
  joinedAt: Date;
  lastActivity: Date;
}

// Account management types
export interface ConnectProviderRequest {
  providerId: CalendarProvider;
  authCode?: string;
  redirectUri?: string;
}

export interface DisconnectProviderRequest {
  providerId: CalendarProvider;
  transferDraftsTo?: CalendarProvider;
}

export interface UpdatePreferencesRequest {
  preferences: Partial<UserPreferences>;
}

export interface ProviderSwitchRequest {
  newDefaultProvider: CalendarProvider;
  migrateExistingDrafts?: boolean;
}

// User onboarding types
export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
  order: number;
}

export interface OnboardingProgress {
  userId: string;
  steps: OnboardingStep[];
  currentStep: string;
  completedAt?: Date;
  isCompleted: boolean;
  completionPercentage: number;
}

// User activity tracking
export interface UserActivity {
  id: string;
  userId: string;
  type: 'login' | 'draft_created' | 'draft_published' | 'provider_connected' | 'provider_disconnected' | 'settings_updated';
  description: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

// User settings validation
export interface UserSettingsValidation {
  timeZone: {
    validValues: string[];
  };
  dateFormat: {
    validValues: ('MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD')[];
  };
  timeFormat: {
    validValues: ('12h' | '24h')[];
  };
  defaultEventDuration: {
    min: number;
    max: number;
    step: number;
  };
  aiConfidenceThreshold: {
    min: number;
    max: number;
    step: number;
  };
}

// Account deletion and data export
export interface DataExportRequest {
  userId: string;
  includeImages: boolean;
  includeDrafts: boolean;
  includeActivity: boolean;
  format: 'json' | 'csv';
}

export interface AccountDeletionRequest {
  userId: string;
  reason?: string;
  deleteImmediately: boolean;
  exportDataFirst: boolean;
}