import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';

interface GoogleAccount {
  accountId: string;
  email: string;
  registeredAt: Date;
}

interface DiscordUser {
  _id?: string;
  discordId: string;
  username?: string;
  accounts: GoogleAccount[];
  activeAccountId?: string;
  registeredAt: Date;
}

// Define Mongoose schema for Google accounts
const googleAccountSchema = new mongoose.Schema({
  accountId: { type: String, required: true },
  email: { type: String, required: true },
  registeredAt: { type: Date, default: Date.now }
});

// Define Mongoose schema for Discord users
const discordUserSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  username: { type: String },
  accounts: [googleAccountSchema],
  activeAccountId: { type: String },
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

    if (user && user.accounts && user.accounts.length > 0) {
      const activeAccount = user.activeAccountId 
        ? user.accounts.find((acc: GoogleAccount) => acc.accountId === user.activeAccountId)
        : user.accounts[0]; // Default to first account if no active account set
      
      return NextResponse.json({
        success: true,
        registered: true,
        user: {
          discordId: user.discordId,
          email: activeAccount?.email || '',
          username: user.username,
          registeredAt: user.registeredAt,
          totalAccounts: user.accounts.length,
          activeAccountId: user.activeAccountId || user.accounts[0]?.accountId
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

// POST - Register Discord user with Google account
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
    
    // Generate unique account ID for this Google account
    const accountId = `google_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newAccount: GoogleAccount = {
      accountId,
      email,
      registeredAt: new Date()
    };

    // Check if user already exists
    const existingUser = await DiscordUserModel.findOne({ discordId });
    
    if (existingUser) {
      // Check if this email is already registered for this user
      const existingAccount = existingUser.accounts.find((acc: GoogleAccount) => acc.email === email);
      if (existingAccount) {
        // Update the existing account's registration date (refresh tokens)
        existingAccount.registeredAt = new Date();
        
        // Set this account as active
        existingUser.activeAccountId = existingAccount.accountId;
        
        // Update username if provided
        if (username) {
          existingUser.username = username;
        }
        
        await existingUser.save();
        console.log(`✅ [API] Refreshed existing Google account for user: ${discordId}`);
        
        return NextResponse.json({
          success: true,
          message: `Google account refreshed and set as active. You have ${existingUser.accounts.length} account(s) registered.`,
          user: {
            discordId: existingUser.discordId,
            email: email,
            username: existingUser.username,
            registeredAt: existingUser.registeredAt,
            totalAccounts: existingUser.accounts.length,
            activeAccountId: existingUser.activeAccountId,
            refreshedAccountId: existingAccount.accountId
          }
        });
      }
      
      // Add new account to existing user
      existingUser.accounts.push(newAccount);
      
      // Set as active account if it's the first one or no active account is set
      if (!existingUser.activeAccountId || existingUser.accounts.length === 1) {
        existingUser.activeAccountId = accountId;
      }
      
      // Update username if provided
      if (username) {
        existingUser.username = username;
      }
      
      await existingUser.save();
      console.log(`✅ [API] Added new Google account for existing user: ${discordId}`);
      
      return NextResponse.json({
        success: true,
        message: `Google account added successfully. You now have ${existingUser.accounts.length} account(s) registered.`,
        user: {
          discordId: existingUser.discordId,
          email: email,
          username: existingUser.username,
          registeredAt: existingUser.registeredAt,
          totalAccounts: existingUser.accounts.length,
          activeAccountId: existingUser.activeAccountId,
          newAccountId: accountId
        }
      });
    } else {
      // Create new user with first Google account
      const newUser = new DiscordUserModel({
        discordId,
        username,
        accounts: [newAccount],
        activeAccountId: accountId,
        registeredAt: new Date()
      });

      await newUser.save();
      console.log(`✅ [API] New user registered successfully: ${discordId}`);
      
      return NextResponse.json({
        success: true,
        message: 'User registered successfully with Google account',
        user: {
          discordId: newUser.discordId,
          email: email,
          username: newUser.username,
          registeredAt: newUser.registeredAt,
          totalAccounts: 1,
          activeAccountId: accountId,
          newAccountId: accountId
        }
      });
    }
  } catch (error) {
    console.error('❌ [API] Discord registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}