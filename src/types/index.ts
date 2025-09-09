// Main type definitions and exports

// Core provider types
export * from './providers';
export * from './google';
export * from './microsoft';

// Application types
export * from './draft';
export * from './user';
export * from './config';

// Common utility types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  code?: string;
  details?: Record<string, any>;
  timestamp: string;
}

// File upload types
export interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url?: string;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface ImageProcessingResult {
  id: string;
  originalImage: UploadedFile;
  processedImages?: {
    thumbnail?: UploadedFile;
    medium?: UploadedFile;
    large?: UploadedFile;
  };
  metadata: {
    width: number;
    height: number;
    format: string;
    hasAlpha: boolean;
    density?: number;
    colorSpace?: string;
  };
  processingTime: number;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

// AI extraction types
export interface AIExtractionRequest {
  imageId: string;
  userId: string;
  extractionType: 'event' | 'contact' | 'general';
  options?: {
    language?: string;
    confidenceThreshold?: number;
    includeMetadata?: boolean;
  };
}

export interface AIExtractionResult {
  id: string;
  imageId: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  
  // Extracted event information
  extractedData: {
    title: string;
    date: string;
    time: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    description?: string;
    attendees?: string[];
    category?: string;
    dayOfWeek?: string;
    duration?: number;
    timezone?: string;
    priority?: 'low' | 'medium' | 'high';
    organizer?: string;
    contact?: string;
    website?: string;
    recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
    originalImage?: string;
  };
  
  // AI metadata
  confidence: number;
  processingTime: number;
  model: string;
  extractedFields: string[];
  
  // Error information
  error?: string;
  
  // Timestamps
  createdAt: Date;
  completedAt?: Date;
}

// Date and time utilities
export interface TimeZoneInfo {
  id: string;
  name: string;
  offset: string;
  abbreviation: string;
  isDST: boolean;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number;
  count?: number;
  until?: Date;
  byWeekDay?: number[];
  byMonthDay?: number[];
  byMonth?: number[];
}

// Validation types
export interface ValidationRule {
  field: string;
  type: 'required' | 'email' | 'url' | 'date' | 'number' | 'string' | 'array' | 'custom';
  message: string;
  validator?: (value: any) => boolean;
  options?: Record<string, any>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}

// Search and filtering
export interface SearchQuery {
  query?: string;
  filters?: Record<string, any>;
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
  pagination?: {
    page: number;
    limit: number;
  };
}

export interface SearchResult<T = any> {
  items: T[];
  total: number;
  query: SearchQuery;
  facets?: Record<string, Array<{
    value: string;
    count: number;
  }>>;
}

// Webhook types
export interface WebhookEvent {
  id: string;
  type: string;
  source: 'google' | 'microsoft' | 'system';
  data: Record<string, any>;
  timestamp: Date;
  signature?: string;
}

export interface WebhookSubscription {
  id: string;
  userId: string;
  provider: 'google' | 'microsoft';
  resourceType: 'calendar' | 'event';
  resourceId: string;
  callbackUrl: string;
  expiresAt: Date;
  isActive: boolean;
  createdAt: Date;
}

// System health and monitoring
export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  responseTime?: number;
  details?: Record<string, any>;
}

export interface SystemMetrics {
  timestamp: Date;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  database: {
    connections: number;
    responseTime: number;
  };
  api: {
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
  };
}