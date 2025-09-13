// Simplified Google Gemini AI service for event extraction

import { GoogleGenerativeAI } from '@google/generative-ai';
import { ExtractedEvent } from '../../types';

export class GeminiService {
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
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
        date: extracted.date || new Date().toISOString().split('T')[0],
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
      console.error('Gemini extraction error:', error);
      throw new Error('Failed to extract event information from image');
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
        date: extracted.date || new Date().toISOString().split('T')[0],
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
      console.error('Gemini text extraction error:', error);
      throw new Error('Failed to extract event information from text');
    }
  }
}

export const geminiService = new GeminiService();