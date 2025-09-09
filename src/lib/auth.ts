// NextAuth.js configuration with multi-provider support

import { NextAuthOptions } from 'next-auth';
import { CalendarProvider } from '../types';

// import { MongoDBAdapter } from '@next-auth/mongodb-adapter';
import GoogleProvider from 'next-auth/providers/google';
// import { MongoClient } from 'mongodb';
// import { connectToDatabase } from './mongodb';
// import { User } from '../models';

// MongoDB client for NextAuth adapter
// const client = new MongoClient(process.env.MONGODB_URI!);
// const clientPromise = client.connect();



export const authOptions: NextAuthOptions = {
  // adapter: MongoDBAdapter(clientPromise),
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
    strategy: 'jwt', // Changed from 'database' to 'jwt'
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  // Allow linking accounts with the same email address
  // This fixes the OAuthAccountNotLinked error when using multiple providers
  // @ts-ignore - NextAuth types are not up to date
  allowDangerousEmailAccountLinking: true,
  // Allow sign-in with any email address
  // This is useful for testing with non-Google accounts
  // In production, you should limit this to specific domains
  // or implement email verification
  signIn: {
    email: true,
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
      
      // MongoDB database operations commented out for JWT sessions
      // try {
      //   // Check if user already exists with this email
      //   await connectToDatabase();
      //   const client = await clientPromise;
      //   const users = client.db().collection('users');
      //   const accounts = client.db().collection('accounts');
      //   
      //   const existingUser = await users.findOne({ email: user.email });
      //   
      //   if (existingUser) {
      //     // Check if this provider is already linked to this user
      //     const existingAccount = await accounts.findOne({
      //       userId: existingUser._id,
      //       provider: account.provider
      //     });
      //     
      //     if (!existingAccount) {
      //       console.log(`🔗 Linking ${account.provider} account to existing user: ${user.email}`);
      //       // Allow linking - NextAuth will handle the account creation
      //     }
      //   }
      //   
      //   return true;
      // } catch (error) {
      //   console.error('Error in signIn callback:', error);
      //   return true; // Allow sign-in even if there's an error
      // }
      
      return true;
    },
    
    async session({ session, token }) {
      // With JWT sessions, user info comes from the token
      if (token && session.user) {
        session.user.id = token.sub!;
        
        // Store OAuth tokens in session from JWT token
        if (token.accessToken) {
          (session as any).accessToken = token.accessToken;
        }
        if (token.refreshToken) {
          (session as any).refreshToken = token.refreshToken;
        }
        if (token.tokenExpiry) {
          (session as any).tokenExpiry = token.tokenExpiry;
        }
        
        console.log('🔍 JWT Session:', {
          hasUser: !!session.user,
          hasAccessToken: !!token.accessToken,
          hasRefreshToken: !!token.refreshToken
        });
      }
      
      return session;
    },
    
    async jwt({ token, account, profile }) {
      // Store OAuth tokens in JWT token on first sign in
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.tokenExpiry = account.expires_at;
        
        console.log('🔍 Storing tokens in JWT:', {
          provider: account.provider,
          hasAccessToken: !!account.access_token,
          hasRefreshToken: !!account.refresh_token,
          expiresAt: account.expires_at
        });
      }
      
      return token;
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