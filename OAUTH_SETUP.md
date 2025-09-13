# Google OAuth 2.0 Setup Guide

This guide will help you set up Google OAuth 2.0 credentials for the Discord bot authentication system.

## Prerequisites

- Google Cloud Console account
- Access to your project's environment variables

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API or Google People API

## Step 2: Configure OAuth Consent Screen

1. Navigate to **APIs & Services** > **OAuth consent screen**
2. Choose **External** user type
3. Fill in the required information:
   - App name: "Discord Calendar Bot"
   - User support email: Your email
   - Developer contact information: Your email
4. Add scopes:
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
5. Save and continue

## Step 3: Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth 2.0 Client IDs**
3. Choose **Web application**
4. Configure:
   - Name: "Discord Bot OAuth Client"
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/oauth/callback` (for development)
     - `https://yourdomain.com/api/auth/oauth/callback` (for production)

## Step 4: Update Environment Variables

Add the following to your `.env.local` file:

```env
# Google OAuth 2.0 Configuration
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/oauth/callback

# Next.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here
```

## Step 5: Test the Setup

1. Start your Discord bot: `npm run dev` (in discord-server directory)
2. Start your calendar app: `npm run dev` (in calendar-app directory)
3. In Discord, use the `!register` command
4. Click the Google authentication link
5. Complete the OAuth flow

## Security Notes

- Keep your client secret secure and never commit it to version control
- Use HTTPS in production
- Regularly rotate your OAuth credentials
- Monitor OAuth usage in Google Cloud Console

## Troubleshooting

### Common Issues:

1. **"redirect_uri_mismatch" error**
   - Ensure the redirect URI in Google Cloud Console exactly matches your environment variable

2. **"invalid_client" error**
   - Check that your client ID and secret are correct

3. **"access_denied" error**
   - User cancelled the OAuth flow or your app needs verification

4. **Session not found**
   - OAuth state expired (10-minute limit) or database connection issue

### Debug Steps:

1. Check server logs for detailed error messages
2. Verify environment variables are loaded correctly
3. Test database connectivity
4. Ensure Google Cloud APIs are enabled

## Production Deployment

For production:

1. Update redirect URIs in Google Cloud Console
2. Set production environment variables
3. Enable proper logging and monitoring
4. Consider using Google Cloud Secret Manager for credentials