import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
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
  status: 'draft' | 'published';
  userId: string;
  // Removed ICS fields - storing event data directly
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema: Schema = new Schema({
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
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  userId: {
    type: String,
    required: true
  },
  // Removed ICS schema fields - storing event data directly
}, {
  timestamps: true // This adds createdAt and updatedAt automatically
});

// Create indexes for better query performance
EventSchema.index({ userId: 1, createdAt: -1 });
EventSchema.index({ status: 1, userId: 1 });

export default mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);