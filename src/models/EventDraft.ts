// EventDraft model for managing draft events

import mongoose, { Schema, Document, Model } from 'mongoose';
import type { EventDraft as EventDraftType, DraftStatus, ValidationError, ProcessingLogEntry } from '../types/draft';
import { CalendarProvider } from '../types/providers';

export interface IEventDraft extends Document {
  // Basic draft information
  userId: mongoose.Types.ObjectId;
  imageId?: string;
  extractionId?: string;
  
  // Draft status and metadata
  status: DraftStatus;
  title: string;
  description?: string;
  
  // Event details
  date?: string;
  time?: string;
  startTime?: Date;
  endTime?: Date;
  timezone: string;
  location?: string;
  attendees: string[];
  category?: string;
  dayOfWeek?: string;
  duration?: string;
  priority?: string;
  organizer?: string;
  contact?: string;
  website?: string;
  recurrence?: string;
  originalImage?: string;
  
  // Calendar provider information
  targetProvider: CalendarProvider;
  targetCalendarId?: string;
  
  // AI extraction metadata
  aiExtracted: boolean;
  confidence?: number;
  extractedFields: string[];
  
  // Validation and processing
  validationErrors: ValidationError[];
  processingLog: ProcessingLogEntry[];
  
  // User modifications
  userModified: boolean;
  modificationHistory: Array<{
    field: string;
    oldValue: any;
    newValue: any;
    modifiedAt: Date;
  }>;
  
  // Creation and sync
  createdEventId?: string;
  syncedAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

const ValidationErrorSchema = new Schema({
  field: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['error', 'warning', 'info'],
    default: 'error'
  },
  code: {
    type: String
  }
}, { _id: false });

const ProcessingLogSchema = new Schema({
  step: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['started', 'completed', 'failed', 'skipped'],
    required: true
  },
  message: {
    type: String
  },
  duration: {
    type: Number // in milliseconds
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: Schema.Types.Mixed
  }
}, { _id: false });

const ModificationHistorySchema = new Schema({
  field: {
    type: String,
    required: true
  },
  oldValue: {
    type: Schema.Types.Mixed
  },
  newValue: {
    type: Schema.Types.Mixed
  },
  modifiedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const EventDraftSchema = new Schema<IEventDraft>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  imageId: {
    type: String,
    index: true
  },
  extractionId: {
    type: String,
    index: true
  },
  
  status: {
    type: String,
    enum: ['pending', 'processing', 'ready', 'published', 'failed', 'expired'],
    default: 'pending',
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  
  date: {
    type: String,
    trim: true
  },
  time: {
    type: String,
    trim: true
  },
  startTime: {
    type: Date,
    index: true
  },
  endTime: {
    type: Date,
    index: true
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  location: {
    type: String,
    trim: true,
    maxlength: 500
  },
  attendees: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  category: {
    type: String,
    trim: true,
    maxlength: 100
  },
  dayOfWeek: {
    type: String,
    trim: true
  },
  duration: {
    type: String,
    trim: true
  },
  priority: {
    type: String,
    trim: true,
    maxlength: 50
  },
  organizer: {
    type: String,
    trim: true,
    maxlength: 200
  },
  contact: {
    type: String,
    trim: true,
    maxlength: 200
  },
  website: {
    type: String,
    trim: true,
    maxlength: 500
  },
  recurrence: {
    type: String,
    trim: true,
    maxlength: 200
  },
  originalImage: {
    type: String,
    trim: true
  },
  
  targetProvider: {
    type: String,
    enum: ['google', 'microsoft'],
    required: true,
    index: true
  },
  targetCalendarId: {
    type: String,
    index: true
  },
  
  aiExtracted: {
    type: Boolean,
    default: false,
    index: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1
  },
  extractedFields: [{
    type: String
  }],
  
  validationErrors: [ValidationErrorSchema],
  processingLog: [ProcessingLogSchema],
  
  userModified: {
    type: Boolean,
    default: false,
    index: true
  },
  modificationHistory: [ModificationHistorySchema],
  
  createdEventId: {
    type: String,
    index: true
  },
  syncedAt: {
    type: Date,
    index: true
  },
  
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    index: { expireAfterSeconds: 0 }
  }
}, {
  timestamps: true
});

// Compound indexes for better query performance
EventDraftSchema.index({ userId: 1, status: 1 });
EventDraftSchema.index({ userId: 1, createdAt: -1 });
EventDraftSchema.index({ targetProvider: 1, status: 1 });
EventDraftSchema.index({ aiExtracted: 1, confidence: -1 });
EventDraftSchema.index({ expiresAt: 1 });

// Instance methods
EventDraftSchema.methods.addValidationError = function(field: string, message: string, severity: 'error' | 'warning' | 'info' = 'error', code?: string) {
  this.validationErrors.push({ field, message, severity, code });
  return this;
};

EventDraftSchema.methods.clearValidationErrors = function() {
  this.validationErrors = [];
  return this;
};

EventDraftSchema.methods.addProcessingLog = function(step: string, status: 'started' | 'completed' | 'failed' | 'skipped', message?: string, duration?: number, metadata?: any) {
  this.processingLog.push({
    step,
    status,
    message,
    duration,
    timestamp: new Date(),
    metadata
  });
  return this;
};

EventDraftSchema.methods.trackModification = function(field: string, oldValue: any, newValue: any) {
  this.userModified = true;
  this.modificationHistory.push({
    field,
    oldValue,
    newValue,
    modifiedAt: new Date()
  });
  return this;
};

EventDraftSchema.methods.validate = function() {
  this.clearValidationErrors();
  
  // Required field validation
  if (!this.title || this.title.trim().length === 0) {
    this.addValidationError('title', 'Event title is required');
  }
  
  if (!this.startTime) {
    this.addValidationError('startTime', 'Start time is required');
  }
  
  if (!this.endTime) {
    this.addValidationError('endTime', 'End time is required');
  }
  
  // Date validation
  if (this.startTime && this.endTime) {
    if (this.startTime >= this.endTime) {
      this.addValidationError('endTime', 'End time must be after start time');
    }
    
    // Check if event is in the past
    if (this.startTime < new Date()) {
      this.addValidationError('startTime', 'Event cannot be scheduled in the past', 'warning');
    }
  }
  
  // Email validation for attendees
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  this.attendees.forEach((email: string, index: number) => {
    if (!emailRegex.test(email)) {
      this.addValidationError(`attendees.${index}`, `Invalid email address: ${email}`);
    }
  });
  
  // Update status based on validation
  this.status = this.validationErrors.filter((e: ValidationError) => e.severity === 'error').length > 0 ? 'failed' : 'ready';
  
  return this.validationErrors.length === 0;
};

EventDraftSchema.methods.isExpired = function(): boolean {
  return this.expiresAt < new Date();
};

EventDraftSchema.methods.extendExpiry = function(days: number = 7) {
  this.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return this;
};

// Static methods
EventDraftSchema.statics.findByUser = function(userId: string, status?: DraftStatus) {
  const query: any = { userId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ createdAt: -1 });
};

EventDraftSchema.statics.findExpired = function() {
  return this.find({ expiresAt: { $lt: new Date() } });
};

EventDraftSchema.statics.findByProvider = function(provider: CalendarProvider, status?: DraftStatus) {
  const query: any = { targetProvider: provider };
  if (status) {
    query.status = status;
  }
  return this.find(query);
};

EventDraftSchema.statics.getStatsByUser = function(userId: string) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgConfidence: { $avg: '$confidence' }
      }
    }
  ]);
};

// Pre-save middleware
EventDraftSchema.pre('save', function(next) {
  // Auto-validate before saving
  if (this.isModified() && this.status === 'pending') {
    this.validate();
  }
  
  // Ensure timezone is set
  if (!this.timezone) {
    this.timezone = 'UTC';
  }
  
  next();
});

// Create and export the model
const EventDraft: Model<IEventDraft> = mongoose.models.EventDraft || mongoose.model<IEventDraft>('EventDraft', EventDraftSchema);

export { EventDraft };
export default EventDraft;