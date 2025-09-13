import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import connectToDatabase from '../../../../lib/mongodb';
import Event from '../../../../models/Event';

// DELETE /api/drafts/[id] - Delete a specific draft
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ error: 'Draft ID is required' }, { status: 400 });
    }

    await connectToDatabase();
    
    // Delete the specific draft event for the authenticated user
    const result = await Event.deleteOne({
      id: id,
      userId: session.user.email,
      status: 'draft'
    });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Draft not found or already deleted' }, { status: 404 });
    }
    
    console.log(`🗑️ Deleted draft ${id} for user: ${session.user.email}`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Draft deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting draft:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/drafts/[id] - Update a specific draft
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Draft ID is required' }, { status: 400 });
    }

    await connectToDatabase();
    
    // Update the specific draft event for the authenticated user
    const updatedEvent = await Event.findOneAndUpdate(
      {
        id: id,
        userId: session.user.email,
        status: 'draft'
      },
      {
        ...body,
        updatedAt: new Date().toISOString()
      },
      { new: true }
    );
    
    if (!updatedEvent) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }
    
    console.log(`📝 Updated draft ${id} for user: ${session.user.email}`);
    
    return NextResponse.json({ 
      success: true, 
      event: updatedEvent
    });
  } catch (error) {
    console.error('Error updating draft:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}