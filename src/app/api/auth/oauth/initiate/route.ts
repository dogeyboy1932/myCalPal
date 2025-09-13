import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';
import connectDB from '@/lib/mongodb';
import OAuthSession from '@/models/OAuthSession';



export async function POST(request: NextRequest) {
  try {
    const { discordId, discordUsername } = await request.json();

    if (!discordId) {
      return NextResponse.json({
        success: false,
        error: 'Discord ID is required'
      }, { status: 400 });
    }

    // Check if Google OAuth credentials are configured
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.json({
        success: false,
        error: 'Google OAuth not configured. Please contact administrator.'
      }, { status: 500 });
    }

    console.log(`🔐 [OAUTH-INIT] Starting OAuth flow for Discord user ${discordId}`);

    // Connect to database
    await connectDB();

    // Generate secure state parameter
    const state = uuidv4();
    
    // Store session in database
    await OAuthSession.createSession(discordId, discordUsername, state);
    
    // Clean up expired sessions
    await OAuthSession.cleanupExpired();

    // Configure Google OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Generate authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ],
      state: state,
      prompt: 'consent'
    });

    console.log(`✅ [OAUTH-INIT] Generated OAuth URL for state: ${state}`);

    return NextResponse.json({
      success: true,
      authUrl,
      state,
      message: 'Click the link to authenticate with Google'
    });

  } catch (error) {
    console.error('❌ [OAUTH-INIT] Error initiating OAuth:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to initiate OAuth flow'
    }, { status: 500 });
  }
}