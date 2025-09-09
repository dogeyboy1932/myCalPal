// User model with multi-provider support

import mongoose, { Schema, Document, Model } from 'mongoose';
import { UserProfile, UserPreferences, UserStatistics, UserActivity } from '../types/user';
import { CalendarProvider } from '../types/providers';

export interface IUser extends Document {
  // Basic user information
  email: string;
  name: string;
  image?: string;
  
  // Multi-provider authentication
  providers: Array<{
    provider: CalendarProvider;
    providerId: string;
    email: string;
    accessToken: string;
    refreshToken?: string;
    tokenExpiry?: Date;
    scope: string[];
    isActive: boolean;
    connectedAt: Date;
    lastSyncAt?: Date;
  }>;
  
  // User preferences
  preferences: {
    defaultCalendarProvider: CalendarProvider;
    timezone: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
    weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday
    defaultEventDuration: number; // in minutes
    notifications: {
      email: boolean;
      push: boolean;
      desktop: boolean;
      reminderMinutes: number[];
    };
    privacy: {
      shareCalendar: boolean;
      allowPublicEvents: boolean;
      showBusyTime: boolean;
    };
    ai: {
      autoExtraction: boolean;
      confidenceThreshold: number;
      autoCreateEvents: boolean;
      suggestMeetingTimes: boolean;
    };
  };
  
  // Usage statistics
  statistics: {
    totalEventsCreated: number;
    totalImagesProcessed: number;
    totalAIExtractions: number;
    lastLoginAt: Date;
    accountCreatedAt: Date;
    totalLoginCount: number;
  };
  
  // Account status
  isActive: boolean;
  isEmailVerified: boolean;
  isPremium: boolean;
  subscriptionExpiry?: Date;
  
  // Onboarding and setup
  onboardingCompleted: boolean;
  onboardingSteps: {
    profileSetup: boolean;
    calendarConnection: boolean;
    firstEventCreated: boolean;
    preferencesSet: boolean;
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
  
  // Instance methods
  getProviderAccount(provider: CalendarProvider): any;
  hasProvider(provider: CalendarProvider): boolean;
  updateLastActive(): Promise<IUser>;
  incrementStatistic(field: keyof IUser['statistics'], increment?: number): Promise<IUser>;
}

const ProviderSchema = new Schema({
  provider: {
    type: String,
    enum: ['google', 'microsoft'],
    required: true
  },
  providerId: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String
  },
  tokenExpiry: {
    type: Date
  },
  scope: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  connectedAt: {
    type: Date,
    default: Date.now
  },
  lastSyncAt: {
    type: Date
  }
});

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String
  },
  
  providers: [ProviderSchema],
  
  preferences: {
    defaultCalendarProvider: {
      type: String,
      enum: ['google', 'microsoft'],
      default: 'google'
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    dateFormat: {
      type: String,
      default: 'MM/DD/YYYY'
    },
    timeFormat: {
      type: String,
      enum: ['12h', '24h'],
      default: '12h'
    },
    weekStartsOn: {
      type: Number,
      min: 0,
      max: 6,
      default: 0
    },
    defaultEventDuration: {
      type: Number,
      default: 60
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      desktop: {
        type: Boolean,
        default: false
      },
      reminderMinutes: [{
        type: Number,
        default: [15, 60]
      }]
    },
    privacy: {
      shareCalendar: {
        type: Boolean,
        default: false
      },
      allowPublicEvents: {
        type: Boolean,
        default: false
      },
      showBusyTime: {
        type: Boolean,
        default: true
      }
    },
    ai: {
      autoExtraction: {
        type: Boolean,
        default: true
      },
      confidenceThreshold: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.8
      },
      autoCreateEvents: {
        type: Boolean,
        default: false
      },
      suggestMeetingTimes: {
        type: Boolean,
        default: true
      }
    }
  },
  
  statistics: {
    totalEventsCreated: {
      type: Number,
      default: 0
    },
    totalImagesProcessed: {
      type: Number,
      default: 0
    },
    totalAIExtractions: {
      type: Number,
      default: 0
    },
    lastLoginAt: {
      type: Date,
      default: Date.now
    },
    accountCreatedAt: {
      type: Date,
      default: Date.now
    },
    totalLoginCount: {
      type: Number,
      default: 0
    }
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  subscriptionExpiry: {
    type: Date
  },
  
  onboardingCompleted: {
    type: Boolean,
    default: false
  },
  onboardingSteps: {
    profileSetup: {
      type: Boolean,
      default: false
    },
    calendarConnection: {
      type: Boolean,
      default: false
    },
    firstEventCreated: {
      type: Boolean,
      default: false
    },
    preferencesSet: {
      type: Boolean,
      default: false
    }
  },
  
  lastActiveAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      // Remove sensitive information when converting to JSON
      if (ret.providers) {
        ret.providers = ret.providers.map((provider: any) => ({
          ...provider,
          accessToken: '[REDACTED]',
          refreshToken: '[REDACTED]'
        }));
      }
      return ret;
    }
  }
});

// Indexes for better query performance
UserSchema.index({ email: 1 });
UserSchema.index({ 'providers.provider': 1, 'providers.providerId': 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ lastActiveAt: -1 });

// Instance methods
UserSchema.methods.getProviderAccount = function(provider: CalendarProvider) {
  return this.providers.find((p: any) => p.provider === provider && p.isActive);
};

UserSchema.methods.hasProvider = function(provider: CalendarProvider): boolean {
  return this.providers.some((p: any) => p.provider === provider && p.isActive);
};

UserSchema.methods.updateLastActive = function() {
  this.lastActiveAt = new Date();
  return this.save();
};

UserSchema.methods.incrementStatistic = function(field: keyof IUser['statistics'], increment: number = 1) {
  (this.statistics as any)[field] += increment;
  return this.save();
};

// Static methods
UserSchema.statics.findByProvider = function(provider: CalendarProvider, providerId: string) {
  return this.findOne({
    'providers.provider': provider,
    'providers.providerId': providerId,
    'providers.isActive': true
  });
};

UserSchema.statics.findActiveUsers = function() {
  return this.find({ isActive: true });
};

// Pre-save middleware
UserSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.updatedAt = new Date();
  }
  next();
});

// Create and export the model
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;