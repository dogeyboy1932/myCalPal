// API route for AI-powered event extraction from images using Google Gemini

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { geminiService } from '../../../lib/services/gemini';
import { AIExtractionRequest } from '../../../types';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const options = formData.get('options') ? JSON.parse(formData.get('options') as string) : {};

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Missing file', message: 'Image file is required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file type',
          message: `File type ${file.type} is not supported. Allowed types: ${allowedTypes.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: 'File too large',
          message: `File size ${Math.round(file.size / 1024 / 1024)}MB exceeds the 10MB limit`
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Create extraction request
    const extractionRequest: AIExtractionRequest = {
      imageId: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: session.user.id,
      extractionType: 'event',
      options: {
        language: options.language || 'English',
        confidenceThreshold: options.confidenceThreshold || 0.7,
        includeMetadata: options.includeMetadata || true,
        ...options
      }
    };

    // Process extraction
    const result = await geminiService.processExtractionRequest(
      extractionRequest,
      imageBuffer,
      file.type
    );

    // Return successful response with raw extraction data for debugging

    // console.log(result)

    return NextResponse.json({
      success: true,
      data: result,
      rawExtractedData: result.extractedData, // Raw parsed data from Gemini
      confidence: result.confidence,
      extractedFields: result.extractedFields,
      message: 'Event information extracted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Extraction API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Extraction failed',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}