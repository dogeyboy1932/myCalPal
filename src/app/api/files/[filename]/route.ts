// API route for serving uploaded files

import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'temp');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    
    if (!filename) {
      return NextResponse.json(
        { success: false, error: 'Missing filename' },
        { status: 400 }
      );
    }

    // Validate filename to prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json(
        { success: false, error: 'Invalid filename' },
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

    // Read file
    const fileBuffer = await readFile(filePath);
    
    // Determine content type from filename extension
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
        'Cache-Control': 'public, max-age=3600',
        'Content-Length': fileBuffer.length.toString()
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