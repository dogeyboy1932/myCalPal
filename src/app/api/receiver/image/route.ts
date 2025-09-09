// Image receiver endpoint for bot integrations (e.g., Discord)

import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import sharp from 'sharp';
import mongoose from 'mongoose';
import { connectToDatabase } from '../../../../lib/mongodb';
import { EventDraft } from '../../../../models';
import { broadcastToClients } from '../../websocket/route';

const TEMP_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'temp');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

function getReceiverToken() {
  return process.env.RECEIVER_TOKEN || process.env.IMAGE_RECEIVER_TOKEN || '';
}

// async function ensureTempUploadDir() {
//   if (!existsSync(TEMP_UPLOAD_DIR)) {
//     await mkdir(TEMP_UPLOAD_DIR, { recursive: true });
//   }
// }

function getDefaultUserId(): mongoose.Types.ObjectId {
  const envId = process.env.RECEIVER_DEFAULT_USER_ID;
  if (envId && mongoose.Types.ObjectId.isValid(envId)) {
    return new mongoose.Types.ObjectId(envId);
  }
  // Fallback: generate a placeholder ObjectId (draft may not show for any real user)
  return new mongoose.Types.ObjectId();
}

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

    // Forward the processed image to /api/extract
    const extractFormData = new FormData();
    extractFormData.append('image', new Blob([processedBuffer], { type: file.type }), file.name);
    
    const extractResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/extract`, {
      method: 'POST',
      body: extractFormData,
      headers: {
        'x-receiver-token': expectedToken
      }
    });
    
    if (!extractResponse.ok) {
      console.error('❌ Extract API failed:', extractResponse.status, extractResponse.statusText);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to extract event data' 
      }, { status: 500 });
    }
    
    const extractResult = await extractResponse.json();
    console.log('✅ Extract API response:', extractResult);
    
    if (extractResult.success && extractResult.data) {
      // Create ExtractedEvent object like the frontend does
      const newEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: extractResult.data.extractedData.title,
        date: extractResult.data.extractedData.date,
        time: extractResult.data.extractedData.time,
        startTime: extractResult.data.extractedData.startTime,
        endTime: extractResult.data.extractedData.endTime,
        location: extractResult.data.extractedData.location,
        description: extractResult.data.extractedData.description,
        attendees: extractResult.data.extractedData.attendees || [],
        category: extractResult.data.extractedData.category,
        confidence: extractResult.data.confidence || 0,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log('📝 Created event object:', newEvent);
      
      // Save as EventDraft to database
      try {
        await connectToDatabase();
        
        const eventDraft = new EventDraft({
          userId: getDefaultUserId(),
          status: 'draft',
          title: newEvent.title,
          extractedData: newEvent,
          confidence: newEvent.confidence,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        await eventDraft.save();
        console.log('💾 Event draft saved to database:', eventDraft._id);
        
        // Emit WebSocket notification for draft creation
        try {
          broadcastToClients({
            type: 'draft_created',
            draft: {
              id: eventDraft.id.toString(),
              title: newEvent.title,
              status: 'draft',
              createdAt: eventDraft.createdAt.toISOString()
            },
            message: `New event draft created: ${newEvent.title}`,
            timestamp: new Date().toISOString()
          });
          console.log('📡 Draft creation WebSocket event sent');
        } catch (wsError) {
          console.error('WebSocket broadcast failed:', wsError);
        }
        
        return NextResponse.json({
          success: true,
          message: 'Image processed and event draft created',
          draftId: eventDraft._id,
          event: newEvent,
          extractionResult: extractResult.data
        });
      } catch (dbError) {
        console.error('❌ Database save failed:', dbError);
        // Still return success since extraction worked
        return NextResponse.json({
          success: true,
          message: 'Image processed but draft save failed',
          event: newEvent,
          extractionResult: extractResult.data,
          warning: 'Could not save to database'
        });
      }
    }
    
    return NextResponse.json(extractResult, { status: extractResponse.status });
  } catch (error) {
    console.error('Image receiver error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to receive image' },
      { status: 500 }
    );
  }
}