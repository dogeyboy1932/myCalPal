// CalendarMapping model for tracking calendar connections across providers

import mongoose, { Schema, Document, Model } from 'mongoose';
import { CalendarProvider } from '../types/providers';

export interface ICalendarMapping extends Document {
  // User and provider information
  userId: mongoose.Types.ObjectId;
  provider: CalendarProvider;
  
  // Calendar identification
  calendarId: string; // Provider-specific calendar ID
  calendarName: string;
  calendarDescription?: string;
  
  // Calendar properties
  isPrimary: boolean;
  isReadOnly: boolean;
  color?: string;
  timezone: string;
  
  // Sync settings
  syncEnabled: boolean;
  syncDirection: 'read' | 'write' | 'bidirectional';
  lastSyncAt?: Date;
  nextSyncAt?: Date;
  syncInterval: number; // in minutes
  
  // Sync statistics
  syncStats: {
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    lastSyncDuration?: number; // in milliseconds
    lastSyncError?: string;
    eventsCount: number;
    lastEventSync?: Date;
  };
  
  // Access control
  permissions: {
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
    canShare: boolean;
  };
  
  // Provider-specific metadata
  providerMetadata: {
    etag?: string; // For change detection
    resourceName?: string; // Microsoft Graph resource name
    webLink?: string; // Web URL to calendar
    owner?: {
      email: string;
      name: string;
    };
    accessRole?: string; // owner, reader, writer, etc.
  };
  
  // Status and health
  isActive: boolean;
  healthStatus: 'healthy' | 'warning' | 'error' | 'disconnected';
  lastHealthCheck?: Date;
  healthMessage?: string;
  
  // Timestamps
  connectedAt: Date;
  createdAt: Date;
  updatedAt: Date;

  // Method signatures
  updateSyncStats(success: boolean, duration?: number, error?: string): this;
  scheduleNextSync(): this;
  updateEventCount(count: number): this;
  checkHealth(): this;
  disconnect(): this;
}

const SyncStatsSchema = new Schema({
  totalSyncs: {
    type: Number,
    default: 0
  },
  successfulSyncs: {
    type: Number,
    default: 0
  },
  failedSyncs: {
    type: Number,
    default: 0
  },
  lastSyncDuration: {
    type: Number // in milliseconds
  },
  lastSyncError: {
    type: String
  },
  eventsCount: {
    type: Number,
    default: 0
  },
  lastEventSync: {
    type: Date
  }
}, { _id: false });

const PermissionsSchema = new Schema({
  canRead: {
    type: Boolean,
    default: true
  },
  canWrite: {
    type: Boolean,
    default: false
  },
  canDelete: {
    type: Boolean,
    default: false
  },
  canShare: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const ProviderMetadataSchema = new Schema({
  etag: {
    type: String
  },
  resourceName: {
    type: String
  },
  webLink: {
    type: String
  },
  owner: {
    email: {
      type: String
    },
    name: {
      type: String
    }
  },
  accessRole: {
    type: String
  }
}, { _id: false });

const CalendarMappingSchema = new Schema<ICalendarMapping>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  provider: {
    type: String,
    enum: ['google', 'microsoft'],
    required: true,
    index: true
  },
  
  calendarId: {
    type: String,
    required: true,
    index: true
  },
  calendarName: {
    type: String,
    required: true,
    trim: true
  },
  calendarDescription: {
    type: String,
    trim: true
  },
  
  isPrimary: {
    type: Boolean,
    default: false,
    index: true
  },
  isReadOnly: {
    type: Boolean,
    default: false
  },
  color: {
    type: String,
    match: /^#[0-9A-F]{6}$/i // Hex color validation
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  
  syncEnabled: {
    type: Boolean,
    default: true,
    index: true
  },
  syncDirection: {
    type: String,
    enum: ['read', 'write', 'bidirectional'],
    default: 'read'
  },
  lastSyncAt: {
    type: Date,
    index: true
  },
  nextSyncAt: {
    type: Date,
    index: true
  },
  syncInterval: {
    type: Number,
    default: 15, // 15 minutes
    min: 5,
    max: 1440 // max 24 hours
  },
  
  syncStats: {
    type: SyncStatsSchema,
    default: () => ({})
  },
  
  permissions: {
    type: PermissionsSchema,
    default: () => ({})
  },
  
  providerMetadata: {
    type: ProviderMetadataSchema,
    default: () => ({})
  },
  
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  healthStatus: {
    type: String,
    enum: ['healthy', 'warning', 'error', 'disconnected'],
    default: 'healthy',
    index: true
  },
  lastHealthCheck: {
    type: Date
  },
  healthMessage: {
    type: String
  },
  
  connectedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for better query performance
CalendarMappingSchema.index({ userId: 1, provider: 1 });
CalendarMappingSchema.index({ userId: 1, isPrimary: 1 });
CalendarMappingSchema.index({ provider: 1, calendarId: 1 }, { unique: true });
CalendarMappingSchema.index({ syncEnabled: 1, nextSyncAt: 1 });
CalendarMappingSchema.index({ healthStatus: 1, lastHealthCheck: 1 });

// Instance methods
CalendarMappingSchema.methods.updateSyncStats = function(success: boolean, duration?: number, error?: string) {
  this.syncStats.totalSyncs += 1;
  
  if (success) {
    this.syncStats.successfulSyncs += 1;
    this.healthStatus = 'healthy';
    this.healthMessage = undefined;
  } else {
    this.syncStats.failedSyncs += 1;
    this.healthStatus = 'error';
    this.healthMessage = error;
    this.syncStats.lastSyncError = error;
  }
  
  if (duration) {
    this.syncStats.lastSyncDuration = duration;
  }
  
  this.lastSyncAt = new Date();
  this.lastHealthCheck = new Date();
  
  // Schedule next sync
  this.scheduleNextSync();
  
  return this;
};

CalendarMappingSchema.methods.scheduleNextSync = function() {
  if (this.syncEnabled) {
    this.nextSyncAt = new Date(Date.now() + this.syncInterval * 60 * 1000);
  } else {
    this.nextSyncAt = undefined;
  }
  return this;
};

CalendarMappingSchema.methods.updateEventCount = function(count: number) {
  this.syncStats.eventsCount = count;
  this.syncStats.lastEventSync = new Date();
  return this;
};

CalendarMappingSchema.methods.checkHealth = function() {
  this.lastHealthCheck = new Date();
  
  // Basic health checks
  if (!this.isActive) {
    this.healthStatus = 'disconnected';
    this.healthMessage = 'Calendar mapping is inactive';
    return this;
  }
  
  // Check sync failures
  const failureRate = this.syncStats.totalSyncs > 0 
    ? this.syncStats.failedSyncs / this.syncStats.totalSyncs 
    : 0;
    
  if (failureRate > 0.5) {
    this.healthStatus = 'error';
    this.healthMessage = 'High sync failure rate';
  } else if (failureRate > 0.2) {
    this.healthStatus = 'warning';
    this.healthMessage = 'Moderate sync failure rate';
  } else {
    this.healthStatus = 'healthy';
    this.healthMessage = undefined;
  }
  
  return this;
};

CalendarMappingSchema.methods.disconnect = function() {
  this.isActive = false;
  this.syncEnabled = false;
  this.healthStatus = 'disconnected';
  this.healthMessage = 'Calendar disconnected by user';
  this.nextSyncAt = undefined;
  return this;
};

// Static methods
CalendarMappingSchema.statics.findByUser = function(userId: string, provider?: CalendarProvider) {
  const query: any = { userId, isActive: true };
  if (provider) {
    query.provider = provider;
  }
  return this.find(query).sort({ isPrimary: -1, calendarName: 1 });
};

CalendarMappingSchema.statics.findPrimaryCalendar = function(userId: string, provider: CalendarProvider) {
  return this.findOne({
    userId,
    provider,
    isPrimary: true,
    isActive: true
  });
};

CalendarMappingSchema.statics.findDueForSync = function() {
  return this.find({
    syncEnabled: true,
    isActive: true,
    nextSyncAt: { $lte: new Date() }
  }).sort({ nextSyncAt: 1 });
};

CalendarMappingSchema.statics.findUnhealthy = function() {
  return this.find({
    healthStatus: { $in: ['warning', 'error', 'disconnected'] },
    isActive: true
  }).sort({ lastHealthCheck: 1 });
};

CalendarMappingSchema.statics.getSyncStatsByUser = function(userId: string) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), isActive: true } },
    {
      $group: {
        _id: '$provider',
        totalCalendars: { $sum: 1 },
        syncEnabledCalendars: {
          $sum: { $cond: ['$syncEnabled', 1, 0] }
        },
        totalSyncs: { $sum: '$syncStats.totalSyncs' },
        successfulSyncs: { $sum: '$syncStats.successfulSyncs' },
        failedSyncs: { $sum: '$syncStats.failedSyncs' },
        totalEvents: { $sum: '$syncStats.eventsCount' }
      }
    }
  ]);
};

// Pre-save middleware
CalendarMappingSchema.pre('save', function(next) {
  // Ensure only one primary calendar per provider per user
  if (this.isPrimary && this.isModified('isPrimary')) {
    // This will be handled by a post-save hook to avoid conflicts
  }
  
  // Schedule next sync if sync is enabled
  if (this.isModified('syncEnabled') || this.isModified('syncInterval')) {
    this.scheduleNextSync();
  }
  
  next();
});

// Post-save middleware to handle primary calendar uniqueness
CalendarMappingSchema.post('save', async function() {
  if (this.isPrimary) {
    // Unset other primary calendars for the same user and provider
    await (this.constructor as Model<ICalendarMapping>).updateMany(
      {
        userId: this.userId,
        provider: this.provider,
        _id: { $ne: this._id },
        isPrimary: true
      },
      { isPrimary: false }
    );
  }
});

// Create and export the model
const CalendarMapping: Model<ICalendarMapping> = mongoose.models.CalendarMapping || mongoose.model<ICalendarMapping>('CalendarMapping', CalendarMappingSchema);

export default CalendarMapping;