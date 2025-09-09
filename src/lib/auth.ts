// NextAuth.js configuration with multi-provider support

import { NextAuthOptions } from 'next-auth';
import { CalendarProvider } from '../types';

import { MongoDBAdapter } from '@next-auth/mongodb-adapter';
import GoogleProvider from 'next-auth/providers/google';
import { MongoClient } from 'mongodb';
import { connectToDatabase } from './mongodb';
import { User } from '../models';

// MongoDB client for NextAuth adapter
const client = new MongoClient(process.env.MONGODB_URI!);
const clientPromise = client.connect();



export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: process.env.GOOGLE_CALENDAR_SCOPES || 'openid profile email https://www.googleapis.com/auth/calendar',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  // Using default NextAuth pages since custom pages don't exist
  // pages: {
  //   signIn: '/auth/signin',
  //   signOut: '/auth/signout',
  //   error: '/auth/error',
  //   verifyRequest: '/auth/verify-request',
  // },
  
  callbacks: {
    async signIn({ user, account, profile }) {
      // Allow any user with a valid account to sign in
      if (!account || !user.email) {
        return false;
      }
      
      console.log(`✅ ${account.provider} OAuth Sign-in successful:`, {
        user: user.email,
        provider: account.provider,
        name: user.name
      });
      
      // With MongoDB adapter, user creation is handled automatically
      // We just need to allow the sign-in
      return true;
    },
    
    async session({ session, user, token }) {
      // With database sessions, user info comes from the database
      if (user && session.user) {
        session.user.id = user.id;
        
        // Get the user's Google account tokens from the database
        try {
          console.log('🔍 Fetching tokens for user:', user.id);
          await connectToDatabase();
          const client = await clientPromise;
          const accounts = client.db().collection('accounts');
          
          // Try both string and ObjectId formats for userId
          const accounts_data = await accounts.find({
            $or: [
              { userId: user.id },
              { userId: new (require('mongodb')).ObjectId(user.id) }
            ]
          }).toArray();
          
          console.log('🔍 Accounts found:', accounts_data.length);
          
          // Store tokens for all providers
          const providerTokens: any = {};
          
          for (const account of accounts_data) {
            console.log(`🔍 ${account.provider} account found:`, {
              hasAccessToken: !!account.access_token,
              hasRefreshToken: !!account.refresh_token,
              expiresAt: account.expires_at
            });
            
            providerTokens[account.provider] = {
              accessToken: account.access_token,
              refreshToken: account.refresh_token,
              tokenExpiry: account.expires_at
            };
          }
          
          // Set tokens in session
          (session as any).providerTokens = providerTokens;
          
          // Backward compatibility - set Google tokens as default
          const googleAccount = accounts_data.find(acc => acc.provider === 'google');
          if (googleAccount) {
            (session as any).accessToken = googleAccount.access_token;
            (session as any).refreshToken = googleAccount.refresh_token;
            (session as any).tokenExpiry = googleAccount.expires_at;
          }
          
          if (accounts_data.length === 0) {
            console.log('❌ No accounts found for user:', user.id);
          }
        } catch (error) {
          console.error('Error fetching user tokens:', error);
        }
      }
      
      console.log('🔍 Final session:', {
        hasUser: !!session.user,
        hasAccessToken: !!(session as any).accessToken,
        hasRefreshToken: !!(session as any).refreshToken
      });
      return session;
    },
    
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log(`User ${user.email} signed in with ${account?.provider}`);
      
      if (isNewUser) {
        console.log(`New user created: ${user.email}`);
        // You could send a welcome email here
      }
    },
    
    async signOut({ token }) {
      console.log(`User signed out: ${token?.email}`);
    },
    
    async createUser({ user }) {
      console.log(`User created in database: ${user.email}`);
    },
    
    async linkAccount({ user, account, profile }) {
      console.log(`Account ${account.provider} linked to user ${user.email}`);
    },
  },
  
  debug: process.env.NODE_ENV === 'development',
};

// Helper functions for token management (disabled - requires MongoDB)
/*
export async function refreshAccessToken(userId: string, provider: CalendarProvider) {
  try {
    await connectToDatabase();
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const providerAccount = user.getProviderAccount(provider);
    if (!providerAccount || !providerAccount.refreshToken) {
      throw new Error('No refresh token available');
    }
    
    let tokenEndpoint: string;
    let clientId: string;
    let clientSecret: string;
    
    if (provider === 'google') {
      tokenEndpoint = 'https://oauth2.googleapis.com/token';
      clientId = process.env.GOOGLE_CLIENT_ID!;
      clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    } else if (provider === 'microsoft') {
      tokenEndpoint = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
      clientId = process.env.MICROSOFT_CLIENT_ID!;
      clientSecret = process.env.MICROSOFT_CLIENT_SECRET!;
    } else {
      throw new Error('Unsupported provider');
    }
    
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: providerAccount.refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }
    
    const tokens = await response.json();
    
    // Update user's provider tokens
    const providerIndex = user.providers.findIndex(
      (p: any) => p.provider === provider && p.providerId === providerAccount.providerId
    );
    
    if (providerIndex >= 0) {
      user.providers[providerIndex].accessToken = tokens.access_token;
      if (tokens.refresh_token) {
        user.providers[providerIndex].refreshToken = tokens.refresh_token;
      }
      if (tokens.expires_in) {
        user.providers[providerIndex].tokenExpiry = new Date(
          Date.now() + tokens.expires_in * 1000
        );
      }
      
      await user.save();
    }
    
    return tokens.access_token;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw error;
  }
}
*/

// Commented out - requires MongoDB
/*
export async function getValidAccessToken(userId: string, provider: CalendarProvider): Promise<string> {
  try {
    await connectToDatabase();
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const providerAccount = user.getProviderAccount(provider);
    if (!providerAccount) {
      throw new Error('Provider account not found');
    }
    
    // Check if token is expired (with 5-minute buffer)
    const now = new Date();
    const expiryBuffer = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
    
    if (providerAccount.tokenExpiry && providerAccount.tokenExpiry <= expiryBuffer) {
      // Token is expired or will expire soon, refresh it
      return await refreshAccessToken(userId, provider);
    }
    
    return providerAccount.accessToken;
  } catch (error) {
    console.error('Error getting valid access token:', error);
    throw error;
  }
}

export async function revokeProviderAccess(userId: string, provider: CalendarProvider) {
  try {
    await connectToDatabase();
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const providerAccount = user.getProviderAccount(provider);
    if (!providerAccount) {
      throw new Error('Provider account not found');
    }
    
    // Revoke token with provider
    let revokeEndpoint: string;
    
    if (provider === 'google') {
      revokeEndpoint = `https://oauth2.googleapis.com/revoke?token=${providerAccount.accessToken}`;
    } else if (provider === 'microsoft') {
      // Microsoft doesn't have a simple revoke endpoint, we'll just deactivate locally
      revokeEndpoint = '';
    } else {
      throw new Error('Unsupported provider');
    }
    
    if (revokeEndpoint) {
      await fetch(revokeEndpoint, { method: 'POST' });
    }
    
    // Deactivate provider in database
    const providerIndex = user.providers.findIndex(
      (p: any) => p.provider === provider && p.providerId === providerAccount.providerId
    );
    
    if (providerIndex >= 0) {
      user.providers[providerIndex].isActive = false;
      await user.save();
    }
    
    return true;
  } catch (error) {
    console.error('Error revoking provider access:', error);
    throw error;
  }
}
*/

// Type augmentation for NextAuth
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      providers: CalendarProvider[];
      preferences: any;
      statistics: any;
      onboardingCompleted: boolean;
      isPremium: boolean;
    };
  }
  
  interface User {
    providers: CalendarProvider[];
    preferences: any;
    statistics: any;
    onboardingCompleted: boolean;
    isPremium: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    providers: CalendarProvider[];
    preferences: any;
  }
}