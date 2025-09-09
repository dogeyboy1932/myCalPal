// Simplified consolidated types

// Core event types
export interface ExtractedEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
  attendees?: string[];
  category?: string;
  confidence: number;
  status: 'draft' | 'published' | 'failed';
  createdAt: string;
  updatedAt: string;
}

// API types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface AIExtractionRequest {
  imageId: string;
  userId: string;
  options?: {
    language?: string;
    confidenceThreshold?: number;
  };
}

export interface AIExtractionResult {
  id: string;
  imageId: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  extractedData: ExtractedEvent;
  confidence: number;
  processingTime: number;
  model: string;
  extractedFields: string[];
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

// Calendar provider types
export type CalendarProvider = 'google';

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
}

export interface CalendarProviderTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

// User types
export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  image?: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  defaultLanguage: string;
  confidenceThreshold: number;
  autoPublish: boolean;
  defaultCalendar?: string;
}

// Draft types
export type DraftStatus = 'pending' | 'processing' | 'ready' | 'published' | 'failed';

export interface EventDraft {
  id: string;
  userId: string;
  status: DraftStatus;
  title: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  location?: string;
  attendees?: string[];
  targetProvider?: CalendarProvider;
  targetCalendarId?: string;
  extractedFromImage?: boolean;
  imageId?: string;
  aiConfidence?: number;
  publishedEventId?: string;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}