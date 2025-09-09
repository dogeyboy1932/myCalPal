// Database models exports

export { default as User } from './User';
export { default as EventDraft } from './EventDraft';
export { default as CalendarMapping } from './CalendarMapping';

// Re-export types for convenience
export type { IUser } from './User';
export type { IEventDraft } from './EventDraft';
export type { ICalendarMapping } from './CalendarMapping';

// Model utilities
export const Models = {
  User: () => import('./User').then(m => m.default),
  EventDraft: () => import('./EventDraft').then(m => m.default),
  CalendarMapping: () => import('./CalendarMapping').then(m => m.default),
};

// Database initialization helper
export async function initializeModels() {
  try {
    // Import all models to ensure they're registered with Mongoose
    await Promise.all([
      import('./User'),
      import('./EventDraft'),
      import('./CalendarMapping'),
    ]);
    
    console.log('✅ All database models initialized');
    return true;
  } catch (error) {
    console.error('❌ Error initializing database models:', error);
    throw error;
  }
}

// Model validation helpers
export const ModelValidators = {
  isValidObjectId: (id: string): boolean => {
    return /^[0-9a-fA-F]{24}$/.test(id);
  },
  
  isValidEmail: (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },
  
  isValidTimezone: (timezone: string): boolean => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  },
  
  isValidHexColor: (color: string): boolean => {
    return /^#[0-9A-F]{6}$/i.test(color);
  }
};

// Common query helpers
export const QueryHelpers = {
  // Pagination helper
  paginate: (page: number = 1, limit: number = 10) => {
    const skip = (page - 1) * limit;
    return { skip, limit };
  },
  
  // Date range helper
  dateRange: (start?: Date, end?: Date) => {
    const query: any = {};
    if (start || end) {
      query.createdAt = {};
      if (start) query.createdAt.$gte = start;
      if (end) query.createdAt.$lte = end;
    }
    return query;
  },
  
  // Search helper
  textSearch: (fields: string[], query: string) => {
    if (!query) return {};
    
    const searchRegex = new RegExp(query, 'i');
    return {
      $or: fields.map(field => ({ [field]: searchRegex }))
    };
  }
};

// Database health check
export async function checkModelsHealth() {
  const results = {
    User: { status: 'unknown', count: 0, error: null as string | null },
    EventDraft: { status: 'unknown', count: 0, error: null as string | null },
    CalendarMapping: { status: 'unknown', count: 0, error: null as string | null },
  };
  
  try {
    const User = (await import('./User')).default;
    results.User.count = await User.countDocuments();
    results.User.status = 'healthy';
  } catch (error) {
    results.User.status = 'error';
    results.User.error = error instanceof Error ? error.message : 'Unknown error';
  }
  
  try {
    const EventDraft = (await import('./EventDraft')).default;
    results.EventDraft.count = await EventDraft.countDocuments();
    results.EventDraft.status = 'healthy';
  } catch (error) {
    results.EventDraft.status = 'error';
    results.EventDraft.error = error instanceof Error ? error.message : 'Unknown error';
  }
  
  try {
    const CalendarMapping = (await import('./CalendarMapping')).default;
    results.CalendarMapping.count = await CalendarMapping.countDocuments();
    results.CalendarMapping.status = 'healthy';
  } catch (error) {
    results.CalendarMapping.status = 'error';
    results.CalendarMapping.error = error instanceof Error ? error.message : 'Unknown error';
  }
  
  return results;
}