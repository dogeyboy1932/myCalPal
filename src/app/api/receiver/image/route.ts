// Unified image receiver endpoint for bot integrations and web uploads

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
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
  return process.env.RECEIVER_TOKEN || '';
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
      userId = 'discord-bot'; // Will be updated after reading form data
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
    
    // For Discord bot, check if user email is provided
    if (isTokenAuth) {
      const userEmail = (formData.get('userEmail') as string) || '';
      if (userEmail) {
        userId = userEmail;
        console.log("✅ [AUTH] Discord bot with registered user:", userId)
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
    console.log("📝 [TEXT] Text content length:", textContent.length)
    console.log("📝 [TEXT] Text content preview:", textContent.substring(0, 100))
    console.log("📝 [TEXT] Source field:", logText ? 'log' : 'text')
    
    if (textContent && textContent.trim().length > 0) {
      console.log("📝 [TEXT] Processing text-only payload")
      const source = (formData.get('source') as string) || 'bot';
      const discordMessageId = (formData.get('discordMessageId') as string) || undefined;
      const discordChannelId = (formData.get('discordChannelId') as string) || undefined;
      console.log("📝 [TEXT] Source:", source, "Discord Message ID:", discordMessageId, "Channel ID:", discordChannelId)
      const discordAuthorId = (formData.get('discordAuthorId') as string) || undefined;

      console.log('=== DISCORD TEXT RECEIVED ===');
      console.log({ textContent, source, discordMessageId, discordChannelId, discordAuthorId });

      // Extract event from text using Gemini
      console.log("🤖 [AI] Starting Gemini text extraction...");
      let extractedData;
      
      try {
        extractedData = await geminiService.extractEventFromText(textContent);
        console.log("✅ [AI] Gemini text extraction successful");
        console.log("🤖 [AI] Extracted data:", JSON.stringify(extractedData, null, 2));
      } catch (error) {
        console.error('❌ [AI] Gemini text extraction failed:', error);
        return NextResponse.json({
          success: false,
          error: 'Failed to extract event from text'
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
        console.log('⚠️ [VALIDATION] Event not saved - invalid data, low confidence, or discord-bot user');
        console.log('⚠️ [VALIDATION] Title:', !!extractedData?.title, 'Confidence:', extractedData?.confidence, 'UserId:', userId);
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
      console.log("🤖 [AI] Extracted title:", extractedData.title);
      console.log("🤖 [AI] Extracted date:", extractedData.description);
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
    
    console.log('✅ [EXTRACT] Direct extraction completed:', extractResult.status, 'confidence:', extractResult.confidence);
    
    if (extractResult.status === 'completed' && extractedData && extractedData.confidence >= 0.3 && userId !== 'discord-bot') {
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
        userId: userId,
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
        
        // Event saved to MongoDB successfully
        
      } catch (dbError) {
        console.error('❌ MongoDB save failed:', dbError);
      }
      
      // Event stored in RECENT_EVENT array - accessible via /api/drafts endpoint
      
      console.log('✅ [SUCCESS] Returning successful response with event data')
      return NextResponse.json({
        success: true,
        message: 'Image processed and event draft created (no database persistence)',
        event: newEvent,
        extractionResult: extractResult
      });
    } else if (extractResult.status === 'completed' && extractedData) {
      console.log('⚠️ [VALIDATION] Event not saved - low confidence or discord-bot user');
      console.log('⚠️ [VALIDATION] Confidence:', extractedData.confidence, 'UserId:', userId);
      
      return NextResponse.json({
        success: true,
        message: 'Image processed but event not saved due to low confidence or invalid user',
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