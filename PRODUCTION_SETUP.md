# Production Setup Guide

This guide will help you configure the calendar application for production use, allowing anyone to sign in with their Google account.

## Prerequisites

1. **MongoDB Database**
   - Local MongoDB installation, or
   - MongoDB Atlas cloud database

2. **Google OAuth Application**
   - Google Cloud Console project with OAuth 2.0 credentials

## Step 1: Environment Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Configure the following required variables in `.env.local`:

### Database Configuration
```env
# For local MongoDB
MONGDB_URI=mongodb://localhost:27017/calendar-app

# For MongoDB Atlas (recommended for production)
MONGDB_URI=mongodb+srv://username:password@cluster.mongodb.net/calendar-app?retryWrites=true&w=majority
```

### NextAuth Configuration
```env
# Generate a secure secret: openssl rand -base64 32
NEXTAUTH_SECRET=your-secure-random-secret-here

# Your production domain
NEXTAUTH_URL=https://yourdomain.com
```

### Google OAuth Configuration
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Step 2: Google Cloud Console Setup

1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one

2. **Enable Required APIs**
   - Enable the Google Calendar API
   - Enable the Google+ API (for OAuth)

3. **Create OAuth 2.0 Credentials**
   - Go to "Credentials" in the API & Services section
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - For development: `http://localhost:3000/api/auth/callback/google`
     - For production: `https://yourdomain.com/api/auth/callback/google`

4. **Configure OAuth Consent Screen**
   - Set up the OAuth consent screen
   - Add your domain to authorized domains
   - **Important**: Set the application to "External" to allow any Google user to sign in
   - Add the following scopes:
     - `openid`
     - `profile`
     - `email`
     - `https://www.googleapis.com/auth/calendar`

## Step 3: Database Setup

The application will automatically create the necessary collections and indexes when users sign in. No manual database setup is required.

## Step 4: Application Configuration

The application is now configured to:
- ✅ Allow **any Google user** to sign in (no whitelist)
- ✅ Automatically create user accounts on first sign-in
- ✅ Store user data and calendar events in MongoDB
- ✅ Sync events with Google Calendar
- ✅ Handle token refresh automatically

## Step 5: Deployment

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build the application**:
   ```bash
   npm run build
   ```

3. **Start the production server**:
   ```bash
   npm start
   ```

## Security Considerations

1. **Environment Variables**
   - Never commit `.env.local` to version control
   - Use secure, randomly generated secrets
   - Rotate secrets regularly

2. **Database Security**
   - Use MongoDB Atlas with IP whitelisting for production
   - Enable authentication and SSL/TLS
   - Regular backups

3. **OAuth Security**
   - Keep client secrets secure
   - Regularly review OAuth consent screen settings
   - Monitor for suspicious activity

## Testing the Setup

1. Start the application
2. Navigate to your domain
3. Click "Sign in with Google"
4. Any Google user should be able to sign in successfully
5. Create a test event and verify it appears in Google Calendar

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI" error**
   - Ensure the redirect URI in Google Cloud Console matches your domain
   - Check that NEXTAUTH_URL is set correctly

2. **Database connection errors**
   - Verify MongoDB URI is correct
   - Check network connectivity and firewall settings

3. **Calendar events not syncing**
   - Verify Google Calendar API is enabled
   - Check that calendar scopes are properly configured

### Logs

Check the application logs for detailed error messages:
```bash
# Development
npm run dev

# Production
npm start
```

## Support

For additional help:
1. Check the application logs
2. Verify all environment variables are set correctly
3. Test with a fresh Google account
4. Review Google Cloud Console audit logs