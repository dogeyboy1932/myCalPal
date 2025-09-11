import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';

// Hardcoded variable to store recent events
let RECENT_EVENT: any[] = [];

// Add a recent event to the store
export function addRecentEvent(event: any) {
  console.log('Adding recent event to RECENT_EVENT array:', event);
  RECENT_EVENT.unshift(event); // Add to beginning
  
  // Keep only the last 10 recent events
  if (RECENT_EVENT.length > 10) {
    RECENT_EVENT = RECENT_EVENT.slice(0, 10);
  }
}

// Get all recent events
export function getRecentEvents() {
  return RECENT_EVENT;
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      console.log('Unauthorized access to recent events API');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Fetching recent events for user:', session.user?.email);
    const recentEvents = getRecentEvents();
    console.log('Returning recent events:', recentEvents.length);
    
    return NextResponse.json({ events: recentEvents });
  } catch (error) {
    console.error('Error fetching recent events:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      console.log('Unauthorized access to recent events API');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Adding new recent event via POST:', body);
    
    addRecentEvent(body);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding recent event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}