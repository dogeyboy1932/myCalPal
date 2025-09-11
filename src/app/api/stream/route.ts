// Simple SSE endpoint for real-time updates

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';

// Store active SSE connections
const sseConnections = new Set<ReadableStreamDefaultController>();

// Function to broadcast events to all connected SSE clients
export function broadcastToStream(eventType: string, data: any) {
  const message = JSON.stringify({
    type: eventType,
    data,
    timestamp: new Date().toISOString()
  });
  
  console.log(`📡 Broadcasting ${eventType} to ${sseConnections.size} SSE clients:`, data);
  
  sseConnections.forEach(controller => {
    try {
      controller.enqueue(`data: ${message}\n\n`);
    } catch (error) {
      sseConnections.delete(controller);
      console.log('📡 Removed broken SSE connection');
    }
  });
}

// Handle SSE connections
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new Response('Unauthorized', { status: 401 });
  }

  let currentController: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(controller) {
      currentController = controller;
      sseConnections.add(controller);
      
      // Send initial connection message
      const data = JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() });
      controller.enqueue(`data: ${data}\n\n`);
      
      console.log(`📡 SSE connection established for user: ${session.user.email}`);
    },
    cancel() {
      if (currentController) {
        sseConnections.delete(currentController);
        console.log(`📡 SSE connection closed`);
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}