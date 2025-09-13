import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { connectToDatabase } from '../../../../lib/mongodb';
import Event from '../../../../models/Event';

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    // Delete all draft events for the user
    const result = await Event.deleteMany({
      userId: session.user.email,
      status: 'draft'
    });
    
    console.log(`🗑️ Cleared ${result.deletedCount} draft events for user: ${session.user.email}`);
    
    return NextResponse.json({ 
      success: true, 
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('Error clearing drafts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}