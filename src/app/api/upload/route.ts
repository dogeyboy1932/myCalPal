// API route for image upload with validation and temporary storage

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { UploadedFile, ImageProcessingResult } from '../../../types';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'temp');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

// Ensure upload directory exists
async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

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

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Missing file', message: 'Image file is required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file type',
          message: `File type ${file.type} is not supported. Allowed types: ${ALLOWED_TYPES.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: 'File too large',
          message: `File size ${Math.round(file.size / 1024 / 1024)}MB exceeds the 10MB limit`
        },
        { status: 400 }
      );
    }

    // Ensure upload directory exists
    await ensureUploadDir();

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const fileExtension = path.extname(file.name) || '.jpg';
    const filename = `${timestamp}_${randomId}${fileExtension}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process image with Sharp to get metadata and optimize
    const startProcessing = Date.now();
    let processedBuffer = buffer;
    let metadata;

    try {
      const sharpImage = sharp(buffer);
      metadata = await sharpImage.metadata();
      
      // Optimize image if it's too large
      if (metadata.width && metadata.width > 2048) {
        const optimizedBuffer = await sharpImage
          .resize(2048, null, { withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer();
        processedBuffer = Buffer.from(optimizedBuffer);
      }
    } catch (error) {
      console.error('Image processing error:', error);
      // Use original buffer if processing fails
      metadata = {
        width: 0,
        height: 0,
        format: file.type.split('/')[1] || 'unknown',
        hasAlpha: false
      };
    }

    // Save file to disk
    await writeFile(filePath, processedBuffer);

    // Create uploaded file record
    const uploadedFile: UploadedFile = {
      id: `upload_${timestamp}_${randomId}`,
      filename,
      originalName: file.name,
      mimeType: file.type,
      size: processedBuffer.length,
      path: filePath,
      url: `/api/files/${filename}`,
      uploadedAt: new Date(),
      uploadedBy: session.user.id
    };

    // Create processing result
    const processingResult: ImageProcessingResult = {
      id: uploadedFile.id,
      originalImage: uploadedFile,
      metadata: {
        width: metadata?.width || 0,
        height: metadata?.height || 0,
        format: metadata?.format || 'unknown',
        hasAlpha: metadata?.hasAlpha || false,
        density: metadata?.density,
        colorSpace: metadata?.space
      },
      processingTime: Date.now() - startProcessing,
      processingStatus: 'completed'
    };

    return NextResponse.json({
      success: true,
      data: {
        file: uploadedFile,
        processing: processingResult
      },
      message: 'File uploaded successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Upload API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Upload failed',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Handle file serving
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const filename = url.pathname.split('/').pop();
    
    if (!filename) {
      return NextResponse.json(
        { success: false, error: 'Missing filename' },
        { status: 400 }
      );
    }

    const filePath = path.join(UPLOAD_DIR, filename);
    
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }

    // Read and serve file
    const { readFile } = await import('fs/promises');
    const fileBuffer = await readFile(filePath);
    
    // Determine content type from filename
    const ext = path.extname(filename).toLowerCase();
    const contentType = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif'
    }[ext] || 'application/octet-stream';

    return new NextResponse(fileBuffer as any, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch (error) {
    console.error('File serving error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to serve file' },
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}