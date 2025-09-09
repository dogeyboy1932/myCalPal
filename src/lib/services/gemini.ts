// Google Gemini API integration for AI-powered information extraction

import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIExtractionRequest, AIExtractionResult } from '../../types';

export interface ExtractedEventData {
  title: string;
  date: string; // YYYY-MM-DD format
  time: string; // HH:MM format - for backward compatibility
  startTime?: string;
  endTime?: string;
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
}

export interface GeminiExtractionOptions {
  language?: string;
  confidenceThreshold?: number;
  includeMetadata?: boolean;
  maxTokens?: number;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  /**
   * Extract event information from an image using Google Gemini
   */
  async extractEventFromImage(
    imageBuffer: Buffer,
    mimeType: string,
    options: GeminiExtractionOptions = {}
  ): Promise<ExtractedEventData> {
    try {
      const prompt = this.buildExtractionPrompt(options);
      
      const imagePart = {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: mimeType
        }
      };

      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      return this.parseExtractionResponse(text, options.confidenceThreshold || 0.7);
    } catch (error) {
      console.error('Gemini extraction error:', error);
      throw new Error(`Failed to extract event information: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build the extraction prompt for Gemini
   */
  private buildExtractionPrompt(options: GeminiExtractionOptions): string {
    const language = options.language || 'English';
    
    return `
Analyze this image and extract calendar event information. Look for:

1. **REQUIRED FIELDS**:
   - Event title/name
   - Date (YYYY-MM-DD format)

2. **OPTIONAL FIELDS** (extract if visible):
   - Time (HH:MM format) - single time or start time
   - Start time (HH:MM format)
   - End time (HH:MM format)
   - Location/venue/address
   - Description/details/notes
   - Attendees/participants
   - Event category/type
   - Day of week
   - Duration (in minutes)
   - Timezone
   - Priority level
   - Organizer/host
   - Contact information
   - Website/URL
   - Recurrence pattern

Please respond in valid JSON format:
{
  "title": "event title - REQUIRED",
  "date": "YYYY-MM-DD format - REQUIRED",
  "time": "HH:MM format or null",
  "startTime": "HH:MM format or null",
  "endTime": "HH:MM format or null",
  "location": "location or null",
  "description": "description or null",
  "attendees": ["list of attendees or empty array"],
  "category": "event category or null",
  "dayOfWeek": "day name or null",
  "duration": "duration in minutes or null",
  "timezone": "timezone or null",
  "priority": "low/medium/high or null",
  "organizer": "organizer name or null",
  "contact": "contact info or null",
  "website": "website URL or null",
  "recurrence": "none/daily/weekly/monthly/yearly or null",
  "confidence": 0.95
}

Rules:
- TITLE and DATE are mandatory
- Use descriptive text for missing titles
- Infer dates from context when possible
- If only one time is visible, put it in both 'time' and 'startTime'
- Only extract information that is clearly visible in the image
- Use null for optional fields that cannot be determined
- Provide a confidence score between 0 and 1
- Respond in ${language}
- Return only valid JSON, no additional text
`;
  }

  /**
   * Parse the Gemini response and validate the extracted data
   */
  private parseExtractionResponse(
    responseText: string,
    confidenceThreshold: number
  ): ExtractedEventData {
    try {
      // Clean the response text to extract JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and normalize the response
      const extractedData: ExtractedEventData = {
        // Required fields with fallbacks
        title: this.validateString(parsed.title) || 'Untitled Event',
        date: this.validateDate(parsed.date) || new Date().toISOString().split('T')[0],
        
        // Time fields
        time: this.validateTime(parsed.time),
        startTime: this.validateTime(parsed.startTime) || this.validateTime(parsed.time),
        endTime: this.validateTime(parsed.endTime),
        
        // Basic event details
        location: this.validateString(parsed.location),
        description: this.validateString(parsed.description),
        attendees: this.validateAttendees(parsed.attendees),
        category: this.validateString(parsed.category),
        
        // Additional event metadata
        dayOfWeek: this.validateString(parsed.dayOfWeek),
        duration: this.validateNumber(parsed.duration),
        timezone: this.validateString(parsed.timezone),
        priority: this.validatePriority(parsed.priority),
        organizer: this.validateString(parsed.organizer),
        contact: this.validateString(parsed.contact),
        website: this.validateUrl(parsed.website),
        recurrence: this.validateRecurrence(parsed.recurrence),
        originalImage: undefined, // Will be set by caller if needed
        
        confidence: this.validateConfidence(parsed.confidence, confidenceThreshold)
      };

      return extractedData;
    } catch (error) {
      console.error('Failed to parse Gemini response:', error);
      return {
        title: 'Untitled Event',
        date: new Date().toISOString().split('T')[0],
        time: '12:00',
        startTime: undefined,
        endTime: undefined,
        location: undefined,
        description: undefined,
        attendees: [],
        category: undefined,
        dayOfWeek: undefined,
        duration: undefined,
        timezone: undefined,
        priority: undefined,
        organizer: undefined,
        contact: undefined,
        website: undefined,
        recurrence: undefined,
        originalImage: undefined,
        confidence: 0
      };
    }
  }

  /**
   * Validate string fields
   */
  private validateString(value: any): string | undefined {
    if (typeof value === 'string' && value.trim() !== '' && value.toLowerCase() !== 'null') {
      return value.trim();
    }
    return undefined;
  }

  /**
   * Validate date format (YYYY-MM-DD)
   */
  private validateDate(value: any): string | undefined {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return value;
      }
    }
    return undefined;
  }

  /**
   * Validate time format (HH:MM)
   */
  private validateTime(value: any): string {
    if (typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)) {
      return value;
    }
    return '12:00';
  }

  /**
   * Validate attendees array
   */
  private validateAttendees(value: any): string[] {
    if (Array.isArray(value)) {
      return value
        .filter(item => typeof item === 'string' && item.trim() !== '')
        .map(item => item.trim());
    }
    return [];
  }

  /**
   * Validate number fields
   */
  private validateNumber(value: any): number | undefined {
    if (typeof value === 'number' && !isNaN(value) && value >= 0) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed;
      }
    }
    return undefined;
  }

  /**
   * Validate confidence score
   */
  private validateConfidence(value: any, threshold: number): number {
    const confidence = typeof value === 'number' ? value : 0;
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Validate priority field
   */
  private validatePriority(value: any): 'low' | 'medium' | 'high' | undefined {
    if (typeof value === 'string') {
      const priority = value.toLowerCase().trim();
      if (['low', 'medium', 'high'].includes(priority)) {
        return priority as 'low' | 'medium' | 'high';
      }
    }
    return undefined;
  }

  /**
   * Validate URL field
   */
  private validateUrl(value: any): string | undefined {
    if (typeof value === 'string' && value.trim()) {
      const url = value.trim();
      try {
        new URL(url.startsWith('http') ? url : `https://${url}`);
        return url;
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  /**
   * Validate recurrence field
   */
  private validateRecurrence(value: any): 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | undefined {
    if (typeof value === 'string') {
      const recurrence = value.toLowerCase().trim();
      if (['none', 'daily', 'weekly', 'monthly', 'yearly'].includes(recurrence)) {
        return recurrence as 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
      }
    }
    return undefined;
  }

  /**
   * Process an AI extraction request
   */
  async processExtractionRequest(
    request: AIExtractionRequest,
    imageBuffer: Buffer,
    mimeType: string
  ): Promise<AIExtractionResult> {
    const startTime = Date.now();
    
    try {
      const extractedData = await this.extractEventFromImage(
        imageBuffer,
        mimeType,
        request.options
      );

      const processingTime = Date.now() - startTime;

      return {
        id: `extraction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        imageId: request.imageId,
        userId: request.userId,
        status: 'completed',
        extractedData: {
          title: extractedData.title,
          date: extractedData.date,
          time: extractedData.time,
          startTime: extractedData.startTime,
          endTime: extractedData.endTime,
          location: extractedData.location,
          description: extractedData.description,
          attendees: extractedData.attendees,
          category: extractedData.category,
          dayOfWeek: extractedData.dayOfWeek,
          duration: extractedData.duration,
          timezone: extractedData.timezone,
          priority: extractedData.priority,
          organizer: extractedData.organizer,
          contact: extractedData.contact,
          website: extractedData.website,
          recurrence: extractedData.recurrence,
          originalImage: extractedData.originalImage
        },
        confidence: extractedData.confidence,
        processingTime,
        model: 'gemini-2.5-flash',
        extractedFields: this.getExtractedFields(extractedData),
        createdAt: new Date(),
        completedAt: new Date()
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      return {
        id: `extraction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        imageId: request.imageId,
        userId: request.userId,
        status: 'failed',
        extractedData: {
          title: 'Untitled Event',
          date: new Date().toISOString().split('T')[0],
          time: "12:00",
          startTime: undefined,
          endTime: undefined,
          location: undefined,
          description: undefined,
          attendees: [],
          category: undefined,
          dayOfWeek: undefined,
          duration: undefined,
          timezone: undefined,
          priority: undefined,
          organizer: undefined,
          contact: undefined,
          website: undefined,
          recurrence: undefined,
          originalImage: undefined
        },
        confidence: 0,
        processingTime,
        model: 'gemini-2.5-flash',
        extractedFields: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        createdAt: new Date()
      };
    }
  }

  /**
   * Get list of successfully extracted fields
   */
  private getExtractedFields(data: ExtractedEventData): string[] {
    const fields: string[] = [];
    
    if (data.title) fields.push('title');
    if (data.description) fields.push('description');
    if (data.date) fields.push('date');
    if (data.time) fields.push('time');
    if (data.startTime) fields.push('startTime');
    if (data.endTime) fields.push('endTime');
    if (data.location) fields.push('location');
    if (data.attendees && data.attendees.length > 0) fields.push('attendees');
    if (data.category) fields.push('category');
    if (data.dayOfWeek) fields.push('dayOfWeek');
    if (data.duration) fields.push('duration');
    if (data.timezone) fields.push('timezone');
    if (data.priority) fields.push('priority');
    if (data.organizer) fields.push('organizer');
    if (data.contact) fields.push('contact');
    if (data.website) fields.push('website');
    if (data.recurrence) fields.push('recurrence');
    if (data.originalImage) fields.push('originalImage');
    
    return fields;
  }
}

// Export singleton instance
export const geminiService = new GeminiService();