// Simplified Google Gemini AI service for event extraction

import { GoogleGenerativeAI } from '@google/generative-ai';
import { ExtractedEvent } from '../../types';

export class GeminiService {
  private model: any;

  private getErrorDetails(error: unknown): string {
    if (typeof error === 'string' && error.trim()) {
      return error;
    }

    if (error && typeof error === 'object') {
      const e = error as Record<string, unknown>;
      const parts: string[] = [];

      if (e.message && typeof e.message === 'string') {
        parts.push(e.message);
      }

      if (e.status !== undefined) {
        parts.push(`status=${String(e.status)}`);
      }

      if (e.statusText && typeof e.statusText === 'string') {
        parts.push(`statusText=${e.statusText}`);
      }

      if (e.errorDetails !== undefined) {
        try {
          parts.push(`errorDetails=${JSON.stringify(e.errorDetails)}`);
        } catch {
          parts.push(`errorDetails=${String(e.errorDetails)}`);
        }
      }

      if (parts.length > 0) {
        return parts.join(' | ');
      }
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error';
    }
  }

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    
    console.log("Model Name: ", process.env.MODEL_NAME || "NOT SET - defaulting to gemini-2.5-flash");

    this.model = genAI.getGenerativeModel({ model: process.env.MODEL_NAME || 'gemini-2.5-flash' });
  }

  async extractEventFromImage(imageBuffer: Buffer, mimeType: string): Promise<ExtractedEvent> {
    try {
      const prompt = `
Analyze this image and extract event information. Return ONLY a JSON object with this exact structure:
{
  "title": "event title",
  "date": "YYYY-MM-DD",
  "startTime": "HH:MM",
  "endTime": "HH:MM",
  "location": "location if found",
  "description": "description if found",
  "attendees": ["email1@example.com"],
  "confidence": 0.95
}

If you cannot find specific information, use null for that field. Confidence should be between 0 and 1.
For relative dates like "tomorrow", "next week", calculate the actual date. 
Derive a description from the information you receive. THERE HAS TO BE A DESCRIPTION...

Today is ${new Date().toDateString()}. Be sure the date you return is the closest appropriate date in the future.
`;

      const imagePart = {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType,
        },
      };

      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const extracted = JSON.parse(jsonMatch[0]);
      
      // Validate and return with proper end time inference
      const now = new Date().toISOString();
      const startTime = extracted.startTime || '09:00';
      let endTime = extracted.endTime;
      
      // If no end time provided, infer it as 1 hour after start time
      if (!endTime) {
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const endHours = startHours + 1;
        const endMinutesStr = startMinutes.toString().padStart(2, '0');
        const endHoursStr = (endHours % 24).toString().padStart(2, '0');
        endTime = `${endHoursStr}:${endMinutesStr}`;
      }
      
      return {
        id: `extracted_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: extracted.title || 'Untitled Event',
        date: extracted.date || new Date().toLocaleDateString('en-CA'), // en-CA gives YYYY-MM-DD format
        startTime: startTime,
        endTime: endTime,
        location: extracted.location || undefined,
        description: extracted.description || undefined,
        attendees: Array.isArray(extracted.attendees) ? extracted.attendees : [],
        confidence: Math.min(Math.max(extracted.confidence || 0.5, 0), 1),
        status: 'draft' as const,
        createdAt: now,
        updatedAt: now
      };

    } catch (error) {
      const details = this.getErrorDetails(error);
      throw new Error(details);
    }
  }

  async extractEventFromText(text: string): Promise<ExtractedEvent> {
    try {
      const prompt = `
Analyze this text and extract event information. Return ONLY a JSON object with this exact structure:
{
  "title": "event title",
  "date": "YYYY-MM-DD",
  "startTime": "HH:MM",
  "endTime": "HH:MM",
  "location": "location if found",
  "description": "description if found",
  "attendees": ["email1@example.com"],
  "confidence": 0.95
}

If you cannot find specific information, use null for that field. Confidence should be between 0 and 1.
For relative dates like "tomorrow", "next week", calculate the actual date. 
Derive a description from the information you receive. THERE HAS TO BE A DESCRIPTION.

The year is ${new Date().getFullYear()}

Text to analyze: ${text}
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();

      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const extracted = JSON.parse(jsonMatch[0]);
      
      // Validate and return with proper end time inference
      const now = new Date().toISOString();
      const startTime = extracted.startTime || '09:00';
      let endTime = extracted.endTime;
      
      // If no end time provided, infer it as 1 hour after start time
      if (!endTime) {
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const endHours = startHours + 1;
        const endMinutesStr = startMinutes.toString().padStart(2, '0');
        const endHoursStr = (endHours % 24).toString().padStart(2, '0');
        endTime = `${endHoursStr}:${endMinutesStr}`;
      }

      return {
        id: `extracted_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: extracted.title || 'Untitled Event',
        date: extracted.date || new Date().toLocaleDateString('en-CA'), // en-CA gives YYYY-MM-DD format
        startTime: startTime,
        endTime: endTime,
        location: extracted.location || undefined,
        description: extracted.description || undefined,
        attendees: Array.isArray(extracted.attendees) ? extracted.attendees : [],
        confidence: Math.min(Math.max(extracted.confidence || 0.5, 0), 1),
        status: 'draft' as const,
        createdAt: now,
        updatedAt: now
      };

    } catch (error) {
      const details = this.getErrorDetails(error);
      throw new Error(details);
    }
  }
}

export const geminiService = new GeminiService();