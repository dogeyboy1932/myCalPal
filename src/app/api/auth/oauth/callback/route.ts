import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import connectDB from '@/lib/mongodb';
import DiscordUser from '@/models/DiscordUser';
import OAuthSession from '@/models/OAuthSession';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.log(`❌ [OAUTH-CALLBACK] OAuth error: ${error}`);
      
      // Send error notification to Discord user if possible
      if (error === 'access_denied' && state) {
        try {
          await connectDB();
          const session = await OAuthSession.findByState(state);
          if (session) {
            await fetch(`${process.env.NEXTAUTH_URL}/api/auth/oauth/notify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                discordId: session.discordId,
                success: false,
                errorType: 'access_denied'
              })
            });
            await session.deleteOne();
          }
        } catch (notifyError) {
          console.error('❌ [OAUTH-CALLBACK] Failed to send error notification:', notifyError);
        }
      }
      
      return NextResponse.redirect(
        new URL(`/auth/error?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/auth/error?error=missing_parameters', request.url)
      );
    }

    console.log(`🔐 [OAUTH-CALLBACK] Processing callback for state: ${state}`);

    // Connect to database
    await connectDB();

    // Verify state parameter (CSRF protection)
    const session = await OAuthSession.findByState(state);
    if (!session) {
      console.error('❌ [OAUTH-CALLBACK] Invalid or expired state parameter');
      
      // Try to send error notification if we can find the session by any means
      try {
        await fetch(`${process.env.NEXTAUTH_URL}/api/auth/oauth/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            discordId: 'unknown',
            success: false,
            errorType: 'invalid_state'
          })
        });
      } catch (notifyError) {
        console.error('❌ [OAUTH-CALLBACK] Failed to send error notification:', notifyError);
      }
      
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/auth/error?error=invalid_state`);
    }
    
    // Clean up used session
    await session.deleteOne();

    // Configure Google OAuth2 client
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info from Google
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    if (!userInfo.email || !userInfo.verified_email) {
      console.log(`❌ [OAUTH-CALLBACK] Email not verified for user`);
      return NextResponse.redirect(
        new URL('/auth/error?error=email_not_verified', request.url)
      );
    }

    console.log(`✅ [OAUTH-CALLBACK] Authenticated email: ${userInfo.email} for Discord user: ${session.discordId}`);

    // Register or update Discord user with verified email using internal API
    const registerResponse = await fetch(`${request.nextUrl.origin}/api/discord/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        discordId: session.discordId,
        email: userInfo.email,
        username: session.discordUsername
      })
    });

    const registerResult = await registerResponse.json();
    
    if (!registerResponse.ok || !registerResult.success) {
      console.error(`❌ [OAUTH-CALLBACK] Failed to register user:`, registerResult.error);
      return NextResponse.redirect(
        new URL('/auth/error?error=registration_failed', request.url)
      );
    }

    const registeredUser = registerResult.user;
    console.log(`🎉 [OAUTH-CALLBACK] Successfully registered Discord user ${session.discordId} with email ${userInfo.email}`);

     // Send success notification to Discord user
     try {
       const notifyResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/auth/oauth/notify`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json'
         },
         body: JSON.stringify({
           discordId: session.discordId,
           email: userInfo.email,
           success: true
         })
       });
       
       if (notifyResponse.ok) {
         console.log(`✅ [OAUTH-CALLBACK] Discord notification sent to ${session.discordId}`);
       } else {
         console.warn(`⚠️ [OAUTH-CALLBACK] Failed to send Discord notification to ${session.discordId}`);
       }
     } catch (notifyError) {
       console.error(`❌ [OAUTH-CALLBACK] Discord notification error:`, notifyError);
     }

     // Redirect to success page
     return NextResponse.redirect(
       new URL(`/auth/success?email=${encodeURIComponent(userInfo.email)}&discord=${encodeURIComponent(session.discordUsername || session.discordId)}`, request.url)
     );

  } catch (error) {
    console.error('❌ [OAUTH-CALLBACK] Error processing callback:', error);
    return NextResponse.redirect(
      new URL('/auth/error?error=processing_failed', request.url)
    );
  }
}