// Unified image receiver endpoint for bot integrations and web uploads

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
// Removed broadcast imports - using RECENT_EVENT array only
import { addRecentEvent } from '../../drafts/route';
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



// Handle image uploads from both bots and web clients
export async function POST(request: NextRequest) {
  console.log("🚀 [RECEIVER] POST request received at /api/receiver/image")
  console.log("🚀 [RECEIVER] Request headers:", Object.fromEntries(request.headers.entries()))
  
  try {
    // Determine authentication method and user ID
    const providedToken = request.headers.get('x-receiver-token') || '';
    const expectedToken = getReceiverToken();
    let userId: string;
    let isTokenAuth = false;
    
    console.log("🔐 [AUTH] Provided token length:", providedToken.length)
    console.log("🔐 [AUTH] Expected token configured:", !!expectedToken)

    // Check for session-based authentication first (web uploads)
    const session = await getServerSession(authOptions);
    
    if (session?.user?.email) {
      // Web upload with authenticated user
      userId = session.user.email;
      console.log("✅ [AUTH] Session-based authentication successful for user:", userId)
    } else if (providedToken && expectedToken && providedToken === expectedToken) {
      // Token-based authentication (Discord bot)
      isTokenAuth = true;
      userId = 'discord-bot'; // Keep Discord bot events separate but identifiable
      console.log("✅ [AUTH] Token-based authentication successful")
    } else {
      console.log("❌ [AUTH] No valid authentication found")
      return NextResponse.json(
        { success: false, error: 'Unauthorized - please sign in or provide valid token' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    console.log("📋 [FORM] Form data keys:", Array.from(formData.keys()))

    // Text-only payload support
    const text = (formData.get('text') as string) || '';
    console.log("📝 [TEXT] Text content length:", text.length)
    console.log("📝 [TEXT] Text content preview:", text.substring(0, 100))
    
    if (text && text.trim().length > 0) {
      console.log("📝 [TEXT] Processing text-only payload")
      const source = (formData.get('source') as string) || 'bot';
      const discordMessageId = (formData.get('discordMessageId') as string) || undefined;
      const discordChannelId = (formData.get('discordChannelId') as string) || undefined;
      console.log("📝 [TEXT] Source:", source, "Discord Message ID:", discordMessageId, "Channel ID:", discordChannelId)
      const discordAuthorId = (formData.get('discordAuthorId') as string) || undefined;

      console.log('=== DISCORD TEXT RECEIVED ===');
      console.log({ text, source, discordMessageId, discordChannelId, discordAuthorId });

      // Extract event from text using Gemini
      console.log("🤖 [AI] Starting Gemini text extraction...");
      let extractedData;
      
      try {
        extractedData = await geminiService.extractEventFromText(text);
        console.log("✅ [AI] Gemini text extraction successful");
        console.log("🤖 [AI] Extracted data:", JSON.stringify(extractedData, null, 2));
      } catch (error) {
        console.error('❌ [AI] Gemini text extraction failed:', error);
        return NextResponse.json({
          success: false,
          error: 'Failed to extract event from text'
        }, { status: 500 });
      }

      // Create event if extraction was successful
      if (extractedData && extractedData.title) {
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

        console.log('📝 [RECEIVER] Saving text-extracted event to MongoDB');
        
        try {
          await connectToDatabase();
          
          const savedEvent = await Event.create({
            ...newEvent,
            userId: userId,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          console.log('✅ Text event saved to MongoDB:', savedEvent._id);
          
          // Also add to RECENT_EVENT array for immediate access
          await addRecentEvent(newEvent);
          
          return NextResponse.json({
            success: true,
            message: 'Text processed and event draft created',
            event: newEvent
          });
          
        } catch (dbError) {
          console.error('❌ MongoDB save failed:', dbError);
          // Still add to RECENT_EVENT array as fallback
          await addRecentEvent(newEvent);
          
          return NextResponse.json({
            success: true,
            message: 'Text processed and event draft created (fallback storage)',
            event: newEvent
          });
        }
      }

      // If no event extracted, return text data only
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
    console.log("📁 [FILE] File found:", !!file)
    
    if (file) {
      console.log("📁 [FILE] File details - Name:", file.name, "Type:", file.type, "Size:", file.size)
    }

    if (!file) {
      console.log("❌ [FILE] No image file provided in form data")
      return NextResponse.json(
        { success: false, error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      console.log("❌ [FILE] Invalid file type:", file.type)
      return NextResponse.json(
        { success: false, error: 'Invalid file type' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      console.log("❌ [FILE] File too large:", file.size, "bytes")
      return NextResponse.json(
        { success: false, error: 'File too large' },
        { status: 400 }
      );
    }

    console.log("✅ [FILE] File validation passed, processing image...")
    // Process image entirely in memory (no disk writes)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const processedBuffer = await sharp(buffer)
      .resize(2048, null, { withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    
    console.log("✅ [IMAGE] Image processed successfully, size:", processedBuffer.length, "bytes")

    // Optional metadata from sender (Discord, etc.)
    const source = (formData.get('source') as string) || 'bot';
    const caption = (formData.get('caption') as string) || undefined;
    const discordMessageId = (formData.get('discordMessageId') as string) || undefined;
    const discordChannelId = (formData.get('discordChannelId') as string) || undefined;
    const discordAuthorId = (formData.get('discordAuthorId') as string) || undefined;
    
    console.log("📋 [METADATA] Source:", source, "Caption:", caption?.substring(0, 50))
    console.log("📋 [METADATA] Discord - Message:", discordMessageId, "Channel:", discordChannelId, "Author:", discordAuthorId)

    // Extract event from image using Gemini directly
    console.log("🤖 [AI] Starting Gemini extraction...")
    const startTime = Date.now();
    let extractedData;
    
    try {
      extractedData = await geminiService.extractEventFromImage(processedBuffer, file.type);
      console.log("✅ [AI] Gemini extraction successful")
      console.log("🤖 [AI] Extracted data:", JSON.stringify(extractedData, null, 2))
    } catch (error) {
      console.error('❌ [AI] Gemini extraction failed:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to extract event from image'
      }, { status: 500 });
    }
    const processingTime = Date.now() - startTime;
    console.log("⏱️ [AI] Processing time:", processingTime, "ms")
    
    const extractResult: AIExtractionResult = {
      id: `extraction_${randomUUID()}`,
      imageId: `image_${randomUUID()}`,
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
    
    console.log('✅ [EXTRACT] Direct extraction completed:', extractResult.status, 'confidence:', extractResult.confidence);
    
    if (extractResult.status === 'completed' && extractedData) {
      console.log('📝 [EVENT] Creating event object from extracted data...')
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
        userId: 'receiver@internal',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log('📝 [EVENT] Created event object:', JSON.stringify(newEvent, null, 2));
      
      // Store event data directly without ICS file generation
      console.log('📅 [STORE] Preparing event data for MongoDB storage...');
      
      // Store the event in MongoDB
      console.log('📝 [RECEIVER] Saving event to MongoDB');
      
      try {
        await connectToDatabase();
        
        const savedEvent = await Event.create({
          ...newEvent,
          userId: userId,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        console.log('✅ Event saved to MongoDB:', savedEvent._id);
        
        // Also add to RECENT_EVENT array for immediate access
        await addRecentEvent(newEvent);
        
      } catch (dbError) {
        console.error('❌ MongoDB save failed:', dbError);
        // Still add to RECENT_EVENT array as fallback
        await addRecentEvent(newEvent);
      }
      
      // Event stored in RECENT_EVENT array - accessible via /api/drafts endpoint
      
      console.log('✅ [SUCCESS] Returning successful response with event data')
      return NextResponse.json({
        success: true,
        message: 'Image processed and event draft created (no database persistence)',
        event: newEvent,
        extractionResult: extractResult
      });
    }
    
    console.log('⚠️ [WARNING] Extraction did not complete successfully, returning extraction result only')
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