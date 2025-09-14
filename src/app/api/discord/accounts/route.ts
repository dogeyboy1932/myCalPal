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

// GET - List all Google accounts for a Discord user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const discordId = searchParams.get('discordId');

    if (!discordId) {
      return NextResponse.json(
        { success: false, error: 'Discord ID is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const user = await DiscordUserModel.findOne({ discordId });

    if (!user || !user.accounts || user.accounts.length === 0) {
      return NextResponse.json({
        success: true,
        accounts: [],
        activeAccountId: null,
        message: 'No Google accounts registered for this Discord user'
      });
    }

    // Format accounts for response
    const formattedAccounts = user.accounts.map((account: GoogleAccount, index: number) => ({
      accountNumber: index + 1,
      accountId: account.accountId,
      email: account.email,
      registeredAt: account.registeredAt,
      isActive: account.accountId === user.activeAccountId
    }));

    return NextResponse.json({
      success: true,
      accounts: formattedAccounts,
      activeAccountId: user.activeAccountId,
      totalAccounts: user.accounts.length
    });
  } catch (error) {
    console.error('❌ [API] Error listing Discord user accounts:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Switch active account for a Discord user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { discordId, accountNumber } = body;

    if (!discordId || accountNumber === undefined) {
      return NextResponse.json(
        { success: false, error: 'Discord ID and account number are required' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const user = await DiscordUserModel.findOne({ discordId });

    if (!user || !user.accounts || user.accounts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No Google accounts found for this Discord user' },
        { status: 404 }
      );
    }

    // Validate account number (1-based indexing)
    const accountIndex = accountNumber - 1;
    if (accountIndex < 0 || accountIndex >= user.accounts.length) {
      return NextResponse.json(
        { success: false, error: `Invalid account number. Please choose between 1 and ${user.accounts.length}` },
        { status: 400 }
      );
    }

    const selectedAccount = user.accounts[accountIndex];
    
    // Update active account
    user.activeAccountId = selectedAccount.accountId;
    await user.save();

    console.log(`✅ [API] Switched active account for ${discordId} to ${selectedAccount.email}`);

    return NextResponse.json({
      success: true,
      message: `Successfully switched to account ${accountNumber}: ${selectedAccount.email}`,
      activeAccount: {
        accountNumber: accountNumber,
        accountId: selectedAccount.accountId,
        email: selectedAccount.email,
        registeredAt: selectedAccount.registeredAt
      }
    });
  } catch (error) {
    console.error('❌ [API] Error switching Discord user account:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}