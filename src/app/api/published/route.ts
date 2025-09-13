import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Published from '@/models/Published';

// GET /api/published - Fetch all published events
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Fetch all published events, sorted by publishedAt (newest first)
    const publishedEvents = await Published.find({}).sort({ publishedAt: -1 });

    console.log(`Found ${publishedEvents.length} published events`);

    return NextResponse.json({
      success: true,
      events: publishedEvents,
      count: publishedEvents.length
    });

  } catch (error) {
    console.error('Error fetching published events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch published events' },
      { status: 500 }
    );
  }
}

// DELETE /api/published - Delete all published events (clear history)
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();

    // Delete all published events
    const result = await Published.deleteMany({});

    console.log(`Deleted ${result.deletedCount} published events`);

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `Successfully deleted ${result.deletedCount} published events`
    });

  } catch (error) {
    console.error('Error deleting published events:', error);
    return NextResponse.json(
      { error: 'Failed to delete published events' },
      { status: 500 }
    );
  }
}