// Simplified image upload API

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { UploadedFile, AIExtractionResult } from '../../../types';
import { geminiService } from '../../../lib/services/gemini';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

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
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
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

    await ensureUploadDir();

    // Generate filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const filename = `${timestamp}_${randomId}.jpg`;
    const filePath = path.join(UPLOAD_DIR, filename);

    // Process and save image
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Optimize image
    const processedBuffer = await sharp(buffer)
      .resize(2048, null, { withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    await writeFile(filePath, processedBuffer);

    const uploadedFile: UploadedFile = {
      id: `${timestamp}_${randomId}`,
      filename,
      originalName: file.name,
      mimeType: 'image/jpeg',
      size: processedBuffer.length,
      path: filePath,
      uploadedAt: new Date(),
      uploadedBy: session.user.email
    };

    // Extract event from image using Gemini
    const startTime = Date.now();
    let extractedData;
    
    try {
      extractedData = await geminiService.extractEventFromImage(processedBuffer, 'image/jpeg');
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
      imageId: uploadedFile.id,
      userId: session.user.email || 'unknown',
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
      // Create ExtractedEvent object like the frontend expects
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
      
      return NextResponse.json({
        success: true,
        message: 'Image processed and event extracted',
        event: newEvent,
        extractionResult: extractResult,
        data: uploadedFile
      });
    }

    return NextResponse.json({
      success: true,
      data: uploadedFile,
      extractionResult: extractResult
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Upload failed' },
      { status: 500 }
    );
  }
}