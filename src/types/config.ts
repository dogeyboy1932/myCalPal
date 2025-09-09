// Multi-provider configuration and settings types

import { CalendarProvider } from './providers';

export interface AppConfig {
  // Application settings
  app: {
    name: string;
    version: string;
    url: string;
    environment: 'development' | 'staging' | 'production';
  };
  
  // Database configuration
  database: {
    uri: string;
    name: string;
    options?: Record<string, any>;
  };
  
  // Authentication configuration
  auth: {
    secret: string;
    sessionMaxAge: number; // in seconds
    providers: ProviderConfig[];
  };
  
  // File upload configuration
  upload: {
    maxSize: number; // in bytes
    allowedTypes: string[];
    storageType: 'local' | 's3' | 'cloudinary';
    storagePath?: string;
  };
  
  // AI configuration
  ai: {
    provider: 'openai' | 'gemini';
    apiKey: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
  };
  
  // Calendar provider settings
  calendar: {
    defaultProvider: CalendarProvider;
    enableMultiProvider: boolean;
    syncInterval: number; // in minutes
    maxEventsPerSync: number;
  };
  
  // Feature flags
  features: {
    aiExtraction: boolean;
    multiProvider: boolean;
    bulkOperations: boolean;
    analytics: boolean;
    exportData: boolean;
  };
}

export interface ProviderConfig {
  id: CalendarProvider;
  name: string;
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  scopes: string[];
  authUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  additionalParams?: Record<string, string>;
}

export interface GoogleProviderConfig extends ProviderConfig {
  id: 'google';
  apiKey: string;
  calendarApiUrl: string;
}

export interface MicrosoftProviderConfig extends ProviderConfig {
  id: 'microsoft';
  tenantId: string;
  graphApiUrl: string;
  authority?: string;
}

// Runtime configuration
export interface RuntimeConfig {
  isProduction: boolean;
  isDevelopment: boolean;
  isStaging: boolean;
  baseUrl: string;
  apiUrl: string;
  enabledProviders: CalendarProvider[];
  supportedTimeZones: string[];
  supportedLanguages: string[];
  maxDraftAge: number; // in days
  cleanupInterval: number; // in hours
}

// System configuration
export interface SystemConfig {
  // Performance settings
  performance: {
    maxConcurrentRequests: number;
    requestTimeout: number; // in milliseconds
    rateLimiting: {
      windowMs: number;
      maxRequests: number;
    };
  };
  
  // Logging configuration
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    format: 'json' | 'text';
    destinations: ('console' | 'file' | 'database')[];
  };
  
  // Security settings
  security: {
    corsOrigins: string[];
    csrfProtection: boolean;
    helmetOptions?: Record<string, any>;
  };
  
  // Monitoring and health checks
  monitoring: {
    healthCheckInterval: number; // in seconds
    metricsEnabled: boolean;
    alerting: {
      enabled: boolean;
      webhookUrl?: string;
      emailRecipients?: string[];
    };
  };
}

// Configuration validation
export interface ConfigValidationResult {
  isValid: boolean;
  errors: ConfigValidationError[];
  warnings: ConfigValidationWarning[];
}

export interface ConfigValidationError {
  path: string;
  message: string;
  value?: any;
  expectedType?: string;
}

export interface ConfigValidationWarning {
  path: string;
  message: string;
  suggestion?: string;
}

// Environment-specific configurations
export interface EnvironmentConfig {
  development: Partial<AppConfig>;
  staging: Partial<AppConfig>;
  production: Partial<AppConfig>;
}

// Configuration management
export interface ConfigManager {
  load(): Promise<AppConfig>;
  validate(config: AppConfig): ConfigValidationResult;
  get<T = any>(path: string): T;
  set(path: string, value: any): void;
  reload(): Promise<void>;
  watch(callback: (config: AppConfig) => void): void;
}

// Default configurations
export interface DefaultConfigs {
  app: AppConfig;
  providers: Record<CalendarProvider, ProviderConfig>;
  features: Record<string, boolean>;
  limits: {
    maxDraftsPerUser: number;
    maxImagesPerDraft: number;
    maxAttendeesPerEvent: number;
    maxEventDuration: number; // in hours
  };
}

// Configuration update types
export interface ConfigUpdateRequest {
  path: string;
  value: any;
  reason?: string;
  updatedBy: string;
}

export interface ConfigUpdateHistory {
  id: string;
  path: string;
  oldValue: any;
  newValue: any;
  reason?: string;
  updatedBy: string;
  updatedAt: Date;
  rollbackAvailable: boolean;
}