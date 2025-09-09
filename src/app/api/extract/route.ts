// Simplified AI extraction API

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { geminiService } from '../../../lib/services/gemini';
import { AIExtractionRequest, AIExtractionResult } from '../../../types';
import { broadcastToClients } from '../websocket/route';

export async function POST(request: NextRequest) {
  try {
    // Check authentication (allow internal receiver via token bypass)
    const session = await getServerSession(authOptions);
    const internalToken = request.headers.get('x-receiver-token');
    const expectedToken = process.env.RECEIVER_TOKEN || process.env.IMAGE_RECEIVER_TOKEN;
    let userEmail: string | null = session?.user?.email || null;

    if (!userEmail) {
      if (internalToken && expectedToken && internalToken === expectedToken) {
        userEmail = 'receiver@internal';
      } else {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json(
        { success: false, error: 'Image file is required' },
        { status: 400 }
      );
    }

    // Convert file to buffer for processing
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    const mimeType = imageFile.type;

    // Extract event from image using Gemini
    const startTime = Date.now();
    let extractedData;
    
    try {
      extractedData = await geminiService.extractEventFromImage(imageBuffer, mimeType);
      console.log('=== EXTRACTED DATA JSON ===');
      console.log(JSON.stringify(extractedData, null, 2));
      console.log('=== END EXTRACTED DATA ===');
    } catch (error) {
      console.error('Gemini extraction failed:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to extract event from image' },
        { status: 500 }
      );
    }
    const processingTime = Date.now() - startTime;

    const result: AIExtractionResult = {
      id: `extraction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      imageId: `image_${Date.now()}`,
      userId: userEmail!,
      status: 'completed',
      extractedData,
      confidence: extractedData.confidence,
      processingTime,
      model: 'gemini-1.5-flash',
      extractedFields: Object.keys(extractedData).filter(key => extractedData[key as keyof typeof extractedData] !== undefined),
      createdAt: new Date(),
      completedAt: new Date()
    };

    // Emit WebSocket event for real-time updates
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
        userId: userEmail
      };
      
      broadcastToClients(eventData);
      console.log('📡 WebSocket event broadcasted:', eventData.event.title);
    } catch (wsError) {
      console.error('WebSocket broadcast failed:', wsError);
      // Don't fail the request if WebSocket fails
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Extraction error:', error);
    return NextResponse.json(
      { success: false, error: 'Extraction failed' },
      { status: 500 }
    );
  }
}