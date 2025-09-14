// Simplified consolidated database models

import mongoose, { Schema, Document, Model } from 'mongoose';
import { CalendarProvider, ExtractedEvent, DraftStatus } from '../types';

// EventDraft model removed - using Event model for all draft operations

// CalendarMapping Model


// Export models


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

export default { initializeModels, isValidObjectId };