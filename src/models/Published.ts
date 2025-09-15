import mongoose, { Schema, Document } from 'mongoose';

export interface IPublished extends Document {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  description?: string;
  attendees?: string[];
  category?: string;
  confidence?: number;
  userId: string;
  originalDraftId: string; // Reference to the original draft ID
  publishedEventId?: string; // Calendar provider event ID
  calendarProvider?: string; // google, microsoft, etc.
  calendarId?: string; // Specific calendar ID within provider
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date;
}

const PublishedSchema: Schema = new Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: false
  },
  description: {
    type: String,
    required: false
  },
  attendees: {
    type: [String],
    default: []
  },
  category: {
    type: String,
    required: false
  },
  confidence: {
    type: Number,
    required: false,
    min: 0,
    max: 1
  },
  userId: {
    type: String,
    required: true
  },
  originalDraftId: {
    type: String,
    required: true
  },
  publishedEventId: {
    type: String,
    required: false
  },
  calendarProvider: {
    type: String,
    required: false
  },
  calendarId: {
    type: String,
    required: false
  },
  publishedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // This adds createdAt and updatedAt automatically
});

// Create indexes for better query performance
PublishedSchema.index({ userId: 1, publishedAt: -1 });
PublishedSchema.index({ originalDraftId: 1 });
PublishedSchema.index({ publishedEventId: 1 });

const Published = mongoose.models.Published || mongoose.model<IPublished>('Published', PublishedSchema);
export default Published;