// Simplified AI extraction API

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { geminiService } from '../../../lib/services/gemini';
import { AIExtractionRequest, AIExtractionResult } from '../../../types';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
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
      userId: session.user.email,
      status: 'completed',
      extractedData,
      confidence: extractedData.confidence,
      processingTime,
      model: 'gemini-1.5-flash',
      extractedFields: Object.keys(extractedData).filter(key => extractedData[key as keyof typeof extractedData] !== undefined),
      createdAt: new Date(),
      completedAt: new Date()
    };

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