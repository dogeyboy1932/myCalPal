// Simplified consolidated types

// Core event types
export interface ExtractedEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
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



// Draft types - using ExtractedEvent interface for consistency
export type DraftStatus = 'draft' | 'published' | 'failed';

// Removed EventDraft interface - using ExtractedEvent for all draft operations