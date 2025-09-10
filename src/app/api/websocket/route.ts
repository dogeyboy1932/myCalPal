import { NextRequest } from 'next/server';

// Store active SSE connections
const sseConnections = new Set<ReadableStreamDefaultController>();

// Broadcast message to all connected SSE clients
export function broadcastToClients(data: any) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  
  sseConnections.forEach((controller) => {
    try {
      controller.enqueue(new TextEncoder().encode(message));
    } catch (error) {
      console.error('Failed to send SSE message:', error);
      sseConnections.delete(controller);
    }
  });
  
  console.log(`📡 Broadcasted to ${sseConnections.size} SSE clients:`, data.type);
}

export async function GET(request: NextRequest) {
  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      // Add this connection to our set
      sseConnections.add(controller);
      
      // Send initial connection message
      const welcomeMessage = `data: ${JSON.stringify({ type: 'connected', message: 'SSE connected' })}\n\n`;
      controller.enqueue(new TextEncoder().encode(welcomeMessage));
      
      console.log(`🔌 SSE client connected. Total connections: ${sseConnections.size}`);
    },
    cancel(controller) {
      // Remove this connection when client disconnects
      sseConnections.delete(controller);
      console.log(`🔌 SSE client disconnected. Total connections: ${sseConnections.size}`);
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Broadcast the message to all connected clients
    broadcastToClients(body);
    
    return new Response(JSON.stringify({ success: true, message: 'Broadcasted to clients' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('WebSocket broadcast error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Failed to broadcast' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}