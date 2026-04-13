// Unified image receiver endpoint for bot integrations and web uploads

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
// Removed broadcast imports - using direct MongoDB storage only
// MongoDB imports for direct storage
import connectToDatabase from '../../../../lib/mongodb';
import Event from '../../../../models/Event';
import { geminiService } from '../../../../lib/services/gemini';
import { AIExtractionResult, UploadedFile } from '../../../../types';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

function getReceiverToken() {
  return process.env.IMAGE_RECEIVER_TOKEN || '';
}

function getErrorDetails(error: unknown): string {
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



// Handle image uploads from both bots and web clients
export async function POST(request: NextRequest) {
  try {
    // Determine authentication method and user ID
    const providedToken = request.headers.get('x-receiver-token') || '';
    const expectedToken = getReceiverToken();
    let userId: string;
    let isTokenAuth = false;
    
    // Check for session-based authentication first (web uploads)
    // For token-based auth, skip session check entirely
    let session = null;
    if (!providedToken || providedToken !== expectedToken) {
      // Only check session if not using token auth
      session = await getServerSession(authOptions);
    }
    
    if (session?.user?.email) {
      // Web upload with authenticated user
      userId = session.user.email;
    } else if (providedToken && expectedToken && providedToken === expectedToken) {
      // Token-based authentication (Discord bot)
      isTokenAuth = true;
      userId = 'discord-bot'; // Will be updated after reading form data
    } else {
      console.error("❌ [AUTH] No valid authentication found")
      return NextResponse.json(
        { success: false, error: 'Unauthorized - please sign in or provide valid token' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    
    // For Discord bot, check if user email is provided
    if (isTokenAuth) {
      const userEmail = (formData.get('userEmail') as string) || '';
      if (userEmail) {
        userId = userEmail;
      } else {
        console.error("⚠️ [AUTH] Discord bot with unregistered user")
        return NextResponse.json(
          { success: false, error: 'Unauthorized - please sign in or provide valid token' },
          { status: 401 }
        );
      }
    }

    // Text-only payload support (handles both 'text' and 'log' fields)
    const text = (formData.get('text') as string) || '';
    const logText = (formData.get('log') as string) || '';
    const textContent = text || logText; // Use either text or log field
    
    if (textContent && textContent.trim().length > 0) {
      const source = (formData.get('source') as string) || 'bot';
      const discordMessageId = (formData.get('discordMessageId') as string) || undefined;
      const discordChannelId = (formData.get('discordChannelId') as string) || undefined;
      const discordAuthorId = (formData.get('discordAuthorId') as string) || undefined;

      // Extract event from text using Gemini
      let extractedData;
      
      try {
        extractedData = await geminiService.extractEventFromText(textContent);
      } catch (error) {
        const errorMessage = getErrorDetails(error);
        console.error('❌ [AI] Gemini text extraction failed:', errorMessage);
        return NextResponse.json({
          success: false,
          error: errorMessage
        }, { status: 500 });
      }

      // Create event if extraction was successful and valid
      if (extractedData && extractedData.title && extractedData.confidence >= 0.3 && userId !== 'discord-bot') {
        const newEvent = {
          id: `event_${randomUUID()}`,
          title: extractedData.title,
          date: extractedData.date,
          startTime: extractedData.startTime,
          endTime: extractedData.endTime,
          location: extractedData.location,
          description: extractedData.description,
          attendees: extractedData.attendees || [],
          category: extractedData.category,
          confidence: extractedData.confidence,
          status: 'draft' as const,
          userId: userId
        };

        try {
          await connectToDatabase();
          
          const savedEvent = await Event.create({
            ...newEvent,
            userId: userId,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          return NextResponse.json({
            success: true,
            message: 'Text processed and event draft created',
            event: newEvent
          });
          
        } catch (dbError) {
          console.error('❌ MongoDB save failed:', dbError);
          
          return NextResponse.json({
            success: true,
            message: 'Text processed and event draft created (fallback storage)',
            event: newEvent
          });
        }
      } else {
        console.warn('⚠️ [VALIDATION] Event not saved - invalid data, low confidence, or discord-bot user');
      }

      // If no event extracted, return text data only
      return NextResponse.json({
        success: true,
        data: {
          type: logText ? 'log' : 'text',
          text: textContent,
          source,
          discord: discordMessageId || discordChannelId || discordAuthorId
            ? { messageId: discordMessageId, channelId: discordChannelId, authorId: discordAuthorId }
            : undefined,
        },
      });
    }

    // Support flexible field names from different bots/clients
    let file = (formData.get('file') || formData.get('image')) as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File too large' },
        { status: 400 }
      );
    }

    // Process image entirely in memory (no disk writes)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const processedBuffer = await sharp(buffer)
      .resize(2048, null, { withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Optional metadata from sender (Discord, etc.)
    const source = (formData.get('source') as string) || 'bot';
    const caption = (formData.get('caption') as string) || undefined;
    const discordMessageId = (formData.get('discordMessageId') as string) || undefined;
    const discordChannelId = (formData.get('discordChannelId') as string) || undefined;
    const discordAuthorId = (formData.get('discordAuthorId') as string) || undefined;

    // Extract event from image using Gemini directly
    const startTime = Date.now();
    let extractedData;
    
    try {
      extractedData = await geminiService.extractEventFromImage(processedBuffer, file.type);
    } catch (error) {
      const errorMessage = getErrorDetails(error);
      console.error('❌ [AI] Gemini extraction failed:', errorMessage);
      return NextResponse.json({
        success: false,
        error: errorMessage
      }, { status: 500 });
    }
    const processingTime = Date.now() - startTime;
    
    const extractResult: AIExtractionResult = {
      id: `extraction_${randomUUID()}`,
      imageId: `image_${randomUUID()}`,
      userId: userId,
      status: 'completed',
      extractedData,
      confidence: extractedData.confidence,
      processingTime,
      model: 'gemini-1.5-flash',
      extractedFields: Object.keys(extractedData).filter(key => extractedData[key as keyof typeof extractedData] !== undefined),
      createdAt: new Date(),
      completedAt: new Date()
    };
    
    if (extractResult.status === 'completed' && extractedData && extractedData.confidence >= 0.3 && userId !== 'discord-bot') {
      // Store the event in MongoDB for drafting
      const newEvent = {
        id: `event_${randomUUID()}`,
        title: extractedData.title,
        date: extractedData.date,
        startTime: extractedData.startTime,
        endTime: extractedData.endTime,
        location: extractedData.location,
        description: extractedData.description,
        attendees: extractedData.attendees || [],
        category: extractedData.category,
        confidence: extractedData.confidence || 0,
        status: 'draft',
        userId: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      try {
        await connectToDatabase();
        
        const savedEvent = await Event.create({
          ...newEvent,
          userId: userId,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } catch (dbError) {
        console.error('❌ MongoDB save failed:', dbError);
      }

      return NextResponse.json({
        success: true,
        message: 'Image processed and event draft created (no database persistence)',
        event: newEvent,
        extractionResult: extractResult
      });
    } else if (extractResult.status === 'completed' && extractedData) {
      console.warn('⚠️ [VALIDATION] Event not saved - low confidence or discord-bot user');
      
      return NextResponse.json({
        success: true,
        message: 'Image processed but event not saved due to low confidence or invalid user',
        extractionResult: extractResult
      });
    }

    console.warn('⚠️ [WARNING] Extraction did not complete successfully, returning extraction result only');
    return NextResponse.json({
      success: true,
      data: extractResult
    });
  } catch (error) {
    console.error('❌ [ERROR] Fatal error processing image:', error);
    console.error('❌ [ERROR] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}