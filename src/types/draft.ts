// Draft management and validation types

import { CalendarProvider, CalendarEvent } from './providers';

export type DraftStatus = 'pending' | 'processing' | 'ready' | 'published' | 'failed' | 'expired';

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
  
  // Provider-specific fields
  targetProvider?: CalendarProvider;
  targetCalendarId?: string;
  
  // AI extraction metadata
  extractedFromImage?: boolean;
  imageId?: string;
  aiConfidence?: number;
  aiExtractedFields?: string[];
  
  // Validation and processing
  validationErrors?: ValidationError[];
  processingLog?: ProcessingLogEntry[];
  
  // Publishing information
  publishedEventId?: string;
  publishedAt?: Date;
  publishedToCalendar?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ProcessingLogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  message: string;
  details?: Record<string, any>;
}

export interface DraftCreationRequest {
  title: string;
  description?: string;
  startTime?: string | Date;
  endTime?: string | Date;
  location?: string;
  attendees?: string[];
  targetProvider?: CalendarProvider;
  targetCalendarId?: string;
  imageId?: string;
}

export interface DraftUpdateRequest {
  title?: string;
  description?: string;
  startTime?: string | Date;
  endTime?: string | Date;
  location?: string;
  attendees?: string[];
  targetProvider?: CalendarProvider;
  targetCalendarId?: string;
  status?: DraftStatus;
}

export interface DraftPublishRequest {
  calendarId: string;
  provider?: CalendarProvider;
  overrides?: Partial<CalendarEvent>;
}

export interface DraftListQuery {
  userId?: string;
  status?: DraftStatus | DraftStatus[];
  provider?: CalendarProvider;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'startTime';
  sortOrder?: 'asc' | 'desc';
  includeExpired?: boolean;
}

export interface DraftListResponse {
  drafts: EventDraft[];
  total: number;
  hasMore: boolean;
  nextOffset?: number;
}

// Draft validation schemas
export interface DraftValidationRules {
  title: {
    required: boolean;
    minLength?: number;
    maxLength?: number;
  };
  startTime: {
    required: boolean;
    futureOnly?: boolean;
  };
  endTime: {
    required: boolean;
    afterStartTime?: boolean;
  };
  attendees: {
    maxCount?: number;
    emailValidation?: boolean;
  };
  location: {
    maxLength?: number;
  };
}

// Draft statistics and analytics
export interface DraftStatistics {
  total: number;
  byStatus: Record<DraftStatus, number>;
  byProvider: Record<CalendarProvider, number>;
  averageProcessingTime: number;
  successRate: number;
  mostCommonErrors: Array<{
    code: string;
    message: string;
    count: number;
  }>;
}

// Bulk operations
export interface BulkDraftOperation {
  operation: 'publish' | 'delete' | 'updateStatus';
  draftIds: string[];
  parameters?: Record<string, any>;
}

export interface BulkDraftResult {
  successful: string[];
  failed: Array<{
    draftId: string;
    error: string;
  }>;
  total: number;
  successCount: number;
  failureCount: number;
}