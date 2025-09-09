// Simplified consolidated database models

import mongoose, { Schema, Document, Model } from 'mongoose';
import { CalendarProvider, ExtractedEvent, UserProfile, DraftStatus } from '../types';

// User Model
export interface IUser extends Document {
  email: string;
  name: string;
  image?: string;
  timezone: string;
  providers: Array<{
    provider: CalendarProvider;
    providerId: string;
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  }>;
  preferences: {
    confidenceThreshold: number;
    autoPublish: boolean;
    defaultCalendar?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true },
  name: { type: String, required: true },
  image: String,
  timezone: { type: String, default: 'UTC' },
  providers: [{
    provider: { type: String, enum: ['google', 'microsoft'], required: true },
    providerId: { type: String, required: true },
    accessToken: { type: String, required: true },
    refreshToken: String,
    expiresAt: Date
  }],
  preferences: {
    confidenceThreshold: { type: Number, default: 0.8, min: 0, max: 1 },
    autoPublish: { type: Boolean, default: false },
    defaultCalendar: String
  }
}, { timestamps: true });

UserSchema.index({ email: 1 });
UserSchema.index({ 'providers.provider': 1, 'providers.providerId': 1 });

// EventDraft Model
export interface IEventDraft extends Document {
  userId: mongoose.Types.ObjectId;
  status: DraftStatus;
  title: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  location?: string;
  attendees: string[];
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

const EventDraftSchema = new Schema<IEventDraft>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: {
    type: String,
    enum: ['pending', 'processing', 'ready', 'published', 'failed'],
    default: 'pending',
    index: true
  },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  startTime: { type: Date, index: true },
  endTime: { type: Date, index: true },
  location: { type: String, trim: true },
  attendees: [{ type: String, trim: true }],
  targetProvider: { type: String, enum: ['google', 'microsoft'] },
  targetCalendarId: String,
  extractedFromImage: { type: Boolean, default: false },
  imageId: String,
  aiConfidence: { type: Number, min: 0, max: 1 },
  publishedEventId: String,
  publishedAt: Date
}, { timestamps: true });

EventDraftSchema.index({ userId: 1, status: 1 });
EventDraftSchema.index({ userId: 1, createdAt: -1 });

// CalendarMapping Model
export interface ICalendarMapping extends Document {
  userId: mongoose.Types.ObjectId;
  provider: CalendarProvider;
  calendarId: string;
  calendarName: string;
  isPrimary: boolean;
  syncEnabled: boolean;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CalendarMappingSchema = new Schema<ICalendarMapping>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  provider: { type: String, enum: ['google', 'microsoft'], required: true, index: true },
  calendarId: { type: String, required: true, index: true },
  calendarName: { type: String, required: true, trim: true },
  isPrimary: { type: Boolean, default: false, index: true },
  syncEnabled: { type: Boolean, default: true },
  lastSyncAt: Date
}, { timestamps: true });

CalendarMappingSchema.index({ userId: 1, provider: 1 });
CalendarMappingSchema.index({ provider: 1, calendarId: 1 }, { unique: true });

// Export models
export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export const EventDraft: Model<IEventDraft> = mongoose.models.EventDraft || mongoose.model<IEventDraft>('EventDraft', EventDraftSchema);
export const CalendarMapping: Model<ICalendarMapping> = mongoose.models.CalendarMapping || mongoose.model<ICalendarMapping>('CalendarMapping', CalendarMappingSchema);

// Simple initialization helper
export async function initializeModels() {
  try {
    console.log('✅ Database models initialized');
    return true;
  } catch (error) {
    console.error('❌ Error initializing models:', error);
    throw error;
  }
}

// Simple validation helper
export const isValidObjectId = (id: string): boolean => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

export default { User, EventDraft, CalendarMapping, initializeModels, isValidObjectId };