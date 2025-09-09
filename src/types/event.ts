export interface ExtractedEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD format
  time: string; // HH:MM format - for backward compatibility
  startTime?: string; // HH:MM format
  endTime?: string; // HH:MM format
  location?: string;
  description?: string;
  attendees?: string[];
  category?: string;
  // Additional fields for full event support
  dayOfWeek?: string;
  duration?: number; // in minutes
  timezone?: string;
  priority?: 'low' | 'medium' | 'high';
  organizer?: string;
  contact?: string;
  website?: string;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  originalImage?: string;
  confidence: number;
  status: 'draft' | 'published' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO 8601 datetime
  end: string; // ISO 8601 datetime
  location?: string;
  description?: string;
  calendarId?: string;
  source: 'ai-extracted' | 'manual';
}

export interface UploadResponse {
  success: boolean;
  event?: ExtractedEvent;
  error?: string;
}

export interface CalendarProvider {
  id: string;
  name: string;
  type: 'google' | 'outlook' | 'apple';
  connected: boolean;
  email?: string;
}

export interface UserSettings {
  defaultLanguage: string;
  confidenceThreshold: number;
  autoPublish: boolean;
  defaultCalendar?: string;
  timeZone: string;
}