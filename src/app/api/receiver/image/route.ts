// Image receiver endpoint for bot integrations (e.g., Discord)

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
// import mongoose from 'mongoose';
// import { connectToDatabase } from '../../../../lib/mongodb';
// import { EventDraft } from '../../../../models';
import { broadcastToClients } from '../../websocket/route';
import { geminiService } from '../../../../lib/services/gemini';
import { AIExtractionResult } from '../../../../types';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

function getReceiverToken() {
  return process.env.IMAGE_RECEIVER_TOKEN || '';
}



// function getDefaultUserId(): mongoose.Types.ObjectId {
//   const envId = process.env.RECEIVER_DEFAULT_USER_ID;
//   if (envId && mongoose.Types.ObjectId.isValid(envId)) {
//     return new mongoose.Types.ObjectId(envId);
//   }
//   // Fallback: generate a placeholder ObjectId (draft may not show for any real user)
//   return new mongoose.Types.ObjectId();
// }

export async function POST(request: NextRequest) {
  console.log("REACHED HERE")
  try {
    // Simple token-based auth via header to allow non-user clients (Discord bot) to call this endpoint
    const providedToken = request.headers.get('x-receiver-token') || '';
    const expectedToken = getReceiverToken();

    if (!expectedToken) {
      return NextResponse.json(
        { success: false, error: 'Receiver token is not configured on the server' },
        { status: 500 }
      );
    }

    if (providedToken !== expectedToken) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();

    // Text-only payload support
    const text = (formData.get('text') as string) || '';
    if (text && text.trim().length > 0) {
      const source = (formData.get('source') as string) || 'bot';
      const discordMessageId = (formData.get('discordMessageId') as string) || undefined;
      const discordChannelId = (formData.get('discordChannelId') as string) || undefined;
      const discordAuthorId = (formData.get('discordAuthorId') as string) || undefined;

      console.log('=== DISCORD TEXT RECEIVED ===');
      console.log({ text, source, discordMessageId, discordChannelId, discordAuthorId });

      return NextResponse.json({
        success: true,
        data: {
          type: 'text',
          text,
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
      console.log('=== EXTRACTED DATA JSON ===');
      console.log(JSON.stringify(extractedData, null, 2));
      console.log('=== END EXTRACTED DATA ===');
    } catch (error) {
      console.error('❌ Gemini extraction failed:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to extract event from image'
      }, { status: 500 });
    }
    const processingTime = Date.now() - startTime;
    
    const extractResult: AIExtractionResult = {
      id: `extraction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      imageId: `image_${Date.now()}`,
      userId: 'receiver@internal',
      status: 'completed',
      extractedData,
      confidence: extractedData.confidence,
      processingTime,
      model: 'gemini-1.5-flash',
      extractedFields: Object.keys(extractedData).filter(key => extractedData[key as keyof typeof extractedData] !== undefined),
      createdAt: new Date(),
      completedAt: new Date()
    };
    
    console.log('✅ Direct extraction completed:', extractResult);
    
    if (extractResult.status === 'completed' && extractedData) {
      // Create ExtractedEvent object like the frontend does
      const newEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: extractedData.title,
        date: extractedData.date,
        time: extractedData.time,
        startTime: extractedData.startTime,
        endTime: extractedData.endTime,
        location: extractedData.location,
        description: extractedData.description,
        attendees: extractedData.attendees || [],
        category: extractedData.category,
        confidence: extractedData.confidence || 0,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log('📝 Created event object:', newEvent);
      
      // Database operations commented out for now - focusing on drafting functionality
      // try {
      //   await connectToDatabase();
      //   
      //   const eventDraft = new EventDraft({
      //     userId: getDefaultUserId(),
      //     status: 'draft',
      //     title: newEvent.title,
      //     extractedData: newEvent,
      //     confidence: newEvent.confidence,
      //     createdAt: new Date(),
      //     updatedAt: new Date()
      //   });
      //   
      //   await eventDraft.save();
      //   console.log('💾 Event draft saved to database:', eventDraft._id);
      // } catch (dbError) {
      //   console.error('❌ Database save failed:', dbError);
      // }
      
      // Emit WebSocket notification for draft creation
      try {
        broadcastToClients({
          type: 'draft_created',
          draft: {
            id: newEvent.id,
            title: newEvent.title,
            status: 'draft',
            createdAt: newEvent.createdAt
          },
          message: `New event draft created: ${newEvent.title}`,
          timestamp: new Date().toISOString()
        });
        console.log('📡 Draft creation WebSocket event sent');
      } catch (wsError) {
        console.error('WebSocket broadcast failed:', wsError);
      }
      
      // Emit WebSocket event for real-time updates to frontend
      try {
        const eventData = {
          type: 'event_extracted',
          event: {
            title: extractedData.title,
            date: extractedData.date,
            time: extractedData.time,
            startTime: extractedData.startTime,
            endTime: extractedData.endTime,
            location: extractedData.location,
            description: extractedData.description,
            attendees: extractedData.attendees || [],
            category: extractedData.category,
            confidence: extractedData.confidence || 0
          },
          timestamp: new Date().toISOString(),
          userId: 'receiver@internal'
        };
        
        broadcastToClients(eventData);
        console.log('📡 Event extraction WebSocket event broadcasted:', eventData.event.title);
      } catch (wsError) {
        console.error('WebSocket broadcast failed:', wsError);
      }
      
      return NextResponse.json({
        success: true,
        message: 'Image processed and event draft created (no database persistence)',
        event: newEvent,
        extractionResult: extractResult
      });
    }
    
    return NextResponse.json({
      success: true,
      data: extractResult
    });
  } catch (error) {
    console.error('Image receiver error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to receive image' },
      { status: 500 }
    );
  }
}