import { NextRequest, NextResponse } from 'next/server';

// Discord notification service
class DiscordNotificationService {
  private static client: any = null;
  private static isInitialized = false;

  private static async initialize() {
    if (this.isInitialized) return;

    // Dynamic import to prevent Next.js from bundling Discord.js for client-side
    const { Client, GatewayIntentBits } = await import('discord.js');
    
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages
      ]
    });

    try {
      await this.client.login(process.env.DISCORD_BOT_TOKEN);
      this.isInitialized = true;
      console.log('✅ [DISCORD-NOTIFY] Bot initialized for notifications');
    } catch (error) {
      console.error('❌ [DISCORD-NOTIFY] Failed to initialize bot:', error);
      throw error;
    }
  }

  static async sendAuthSuccessNotification(discordId: string, email: string) {
    try {
      await this.initialize();
      
      if (!this.client) {
        throw new Error('Discord client not initialized');
      }

      const user = await this.client.users.fetch(discordId);
      if (!user) {
        throw new Error(`User with ID ${discordId} not found`);
      }

      const message = `🎉 **Authentication Successful!**\n\n` +
                     `✅ Your Discord account has been successfully linked to **${email}**\n\n` +
                     `🖼️ You can now upload images in any server where I'm present, and they'll be automatically saved to your calendar account.\n\n` +
                     `📅 Your images will be processed and added as calendar events with the extracted text content.`;

      await user.send(message);
      console.log(`✅ [DISCORD-NOTIFY] Success notification sent to ${discordId}`);
      
      return true;
    } catch (error) {
      console.error(`❌ [DISCORD-NOTIFY] Failed to send notification to ${discordId}:`, error);
      return false;
    }
  }

  static async sendAuthErrorNotification(discordId: string, errorType: string) {
    try {
      await this.initialize();
      
      if (!this.client) {
        throw new Error('Discord client not initialized');
      }

      const user = await this.client.users.fetch(discordId);
      if (!user) {
        throw new Error(`User with ID ${discordId} not found`);
      }

      let message = `❌ **Authentication Failed**\n\n`;
      
      switch (errorType) {
        case 'invalid_state':
          message += `🔒 The authentication link has expired or is invalid.\n\n` +
                    `Please use the \`!register\` command again to get a new authentication link.`;
          break;
        case 'access_denied':
          message += `🚫 You cancelled the Google authentication process.\n\n` +
                    `To complete registration, use \`!register\` again and approve the Google authentication.`;
          break;
        case 'server_error':
          message += `⚠️ A technical error occurred during authentication.\n\n` +
                    `Please try using \`!register\` again. If the problem persists, contact support.`;
          break;
        default:
          message += `⚠️ An unexpected error occurred.\n\n` +
                    `Please try using \`!register\` again.`;
      }

      await user.send(message);
      console.log(`✅ [DISCORD-NOTIFY] Error notification sent to ${discordId}`);
      
      return true;
    } catch (error) {
      console.error(`❌ [DISCORD-NOTIFY] Failed to send error notification to ${discordId}:`, error);
      return false;
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { discordId, email, success, errorType } = await request.json();

    if (!discordId) {
      return NextResponse.json(
        { success: false, error: 'Discord ID is required' },
        { status: 400 }
      );
    }

    if (success && email) {
      const notificationSent = await DiscordNotificationService.sendAuthSuccessNotification(discordId, email);
      return NextResponse.json({ 
        success: true, 
        notificationSent,
        message: 'Success notification processed'
      });
    } else if (!success && errorType) {
      const notificationSent = await DiscordNotificationService.sendAuthErrorNotification(discordId, errorType);
      return NextResponse.json({ 
        success: true, 
        notificationSent,
        message: 'Error notification processed'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid notification parameters' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('❌ [DISCORD-NOTIFY] Notification API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}