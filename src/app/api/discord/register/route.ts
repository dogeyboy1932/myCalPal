import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';

interface DiscordUser {
  _id?: string;
  discordId: string;
  email: string;
  username?: string;
  registeredAt: Date;
}

// Define Mongoose schema for Discord users
const discordUserSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  username: { type: String },
  registeredAt: { type: Date, default: Date.now }
});

// Create or get the model
const DiscordUserModel = mongoose.models.DiscordUser || mongoose.model('DiscordUser', discordUserSchema);

// GET - Check Discord user registration status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const discordId = searchParams.get('discordId');

    if (!discordId) {
      return NextResponse.json(
        { success: false, error: 'Discord ID is required', registered: false },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const user = await DiscordUserModel.findOne({ discordId });

    if (user) {
      return NextResponse.json({
        success: true,
        registered: true,
        user: {
          discordId: user.discordId,
          email: user.email,
          username: user.username,
          registeredAt: user.registeredAt
        }
      });
    } else {
      return NextResponse.json({
        success: true,
        registered: false
      });
    }
  } catch (error) {
    console.error('❌ [API] Discord registration check error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', registered: false },
      { status: 500 }
    );
  }
}

// POST - Register Discord user (legacy endpoint for backward compatibility)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { discordId, email, username } = body;

    if (!discordId || !email) {
      return NextResponse.json(
        { success: false, error: 'Discord ID and email are required' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    
    // Check if user already exists and deregister them
    const existingUser = await DiscordUserModel.findOne({ discordId });
    if (existingUser) {
      // Delete the existing user to deregister them
      await DiscordUserModel.deleteOne({ discordId });
      console.log(`🔄 [API] Deregistered existing user: ${discordId}`);
    }

    // Create new user (either first time or after deregistration)
    const newUser = new DiscordUserModel({
      discordId,
      email,
      username,
      registeredAt: new Date()
    });

    const result = await newUser.save();
    console.log(`✅ [API] User registered successfully: ${discordId}`);
    
    return NextResponse.json({
      success: true,
      message: existingUser ? 'User deregistered and re-registered successfully' : 'User registered successfully',
      user: {
        discordId: newUser.discordId,
        email: newUser.email,
        username: newUser.username,
        registeredAt: newUser.registeredAt
      }
    });
  } catch (error) {
    console.error('❌ [API] Discord registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}