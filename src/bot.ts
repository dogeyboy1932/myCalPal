import { Client, GatewayIntentBits, Partials, Events, Message, Attachment } from 'discord.js';
import fetch, { RequestInit } from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Constants
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const COMMAND_PREFIX = '!';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const REGISTRATION_MESSAGE = '❌ **You need to register first!**\n\nUse: `!register`\n\nAfter registration, you can upload images and send logs.';
const SUCCESS_MESSAGES = {
  IMAGE: '✅ Your image has been received and processed!',
  LOG: '✅ Your log has been received and processed!',
  CLEAR: '✅ **Conversation history cleared successfully!**\n\nAll messages between us have been deleted.'
};
const ERROR_MESSAGES = {
  REGISTRATION_REQUIRED: 'You need to register first. Use: !register',
  FILE_TOO_LARGE: 'File is too large. Maximum size allowed is 10MB.',
  UNSUPPORTED_FILE_TYPE: 'Unsupported image type. Please use JPEG, PNG, WebP, or GIF.',
  PROCESSING_FAILED: 'Failed to process your request. Please try again.',
  NO_TEXT_PROVIDED: 'Please provide text after the !log command.',
  ACCOUNT_CREATION_FAILED: 'Failed to create your account. Please try again.',
  ACCOUNT_DELETION_FAILED: 'Failed to delete your account. Please try again.',
  CLEAR_FAILED: '❌ **Failed to clear conversation history.**\n\nPlease check permissions or try again later.'
};

// TypeScript interfaces
interface BotConfig {
  BOT_TOKEN: string;
  RECEIVER_URL: string;
  CALENDAR_APP_URL: string;
  RECEIVER_TOKEN: string;
  ALLOWED_CHANNELS: string[];
}

interface ApiResponse {
  success: boolean;
  error?: string;
  [key: string]: any;
}

interface User {
  discordId: string;
  email: string;
  username?: string;
  registeredAt: Date;
}

interface RegistrationResponse extends ApiResponse {
  message?: string;
  user?: User;
  authUrl?: string;
}

interface StatusResponse extends ApiResponse {
  registered: boolean;
  user?: User;
}

interface ReceiverPayload {
  type: 'image' | 'text' | 'log';
  content?: string;
  attachmentUrl?: string;
  fileName?: string;
}

class DiscordBotService {
  private client: Client | null = null;
  private isRunning = false;

  // =============================================================================
  // CONFIGURATION & VALIDATION
  // =============================================================================

  private get config(): BotConfig {
    const receiverUrl = process.env.RECEIVER_URL || 'http://localhost:3000/api/receiver/image';
    const calendarAppUrl = receiverUrl.replace('/api/receiver/image', '');
    
    return {
      BOT_TOKEN: process.env.DISCORD_BOT_TOKEN || '',
      RECEIVER_URL: receiverUrl,
      CALENDAR_APP_URL: calendarAppUrl,
      RECEIVER_TOKEN: process.env.IMAGE_RECEIVER_TOKEN || process.env.RECEIVER_TOKEN || '',
      ALLOWED_CHANNELS: this.parseChannels(process.env.ALLOWED_CHANNELS)
    };
  }

  private parseChannels(channelsEnv?: string): string[] {
    return (channelsEnv || '').split(',').map(s => s.trim()).filter(Boolean);
  }

  private validateConfig(): void {
    const { BOT_TOKEN, RECEIVER_TOKEN, RECEIVER_URL } = this.config;
    const required = [
      { key: 'DISCORD_BOT_TOKEN', value: BOT_TOKEN },
      { key: 'RECEIVER_TOKEN', value: RECEIVER_TOKEN },
      { key: 'RECEIVER_URL', value: RECEIVER_URL }
    ];

    for (const { key, value } of required) {
      if (!value) {
        throw new Error(`Missing ${key} in environment variables`);
      }
    }
  }

  // =============================================================================
  // LIFECYCLE MANAGEMENT
  // =============================================================================

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Discord bot is already running');
      return;
    }

    try {
      this.validateConfig();
      this.client = this.createClient();
      this.setupEventHandlers();
      
      await this.client.login(this.config.BOT_TOKEN);
      this.isRunning = true;
      console.log('🤖 Discord bot service started successfully');
    } catch (error) {
      console.error('Failed to start Discord bot:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning || !this.client) return;

    try {
      await this.client.destroy();
      this.client = null;
      this.isRunning = false;
      console.log('🤖 Discord bot service stopped');
    } catch (error) {
      console.error('Error stopping Discord bot:', error);
    }
  }

  private createClient(): Client {
    return new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
      ],
      partials: [Partials.Channel, Partials.Message]
    });
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.once(Events.ClientReady, (client: Client) => {
      console.log(`🤖 Logged in as ${client.user?.tag}`);
    });

    this.client.on(Events.MessageCreate, async (message: Message) => {
      await this.handleMessage(message);
    });
  }

  // =============================================================================
  // API & COMMUNICATION
  // =============================================================================

  // Unified method to send data to receiver endpoint
  private async sendToReceiver(message: Message, data: { 
    type: 'image' | 'text' | 'log', 
    content?: string, 
    attachmentUrl?: string, 
    fileName?: string 
  }): Promise<boolean> {
    try {
      const { RECEIVER_URL, RECEIVER_TOKEN } = this.config;
      
      // Check user registration
      const userEmail = await this.getUserEmail(message.author.id);
      if (!userEmail) {
        await message.reply(`❌ **You need to register first!**\n\nUse: \`!register\`\n\nAfter registration, you can upload images and send logs.`);
        return false;
      }

      const formData = new FormData();
      
      // Handle different data types
      if (data.type === 'image' && data.attachmentUrl) {
        const res = await fetch(data.attachmentUrl);
        if (!res.ok) throw new Error(`Failed to fetch attachment: ${res.status}`);
        
        const contentType = res.headers.get('content-type') || 'application/octet-stream';
        const buffer = Buffer.from(await res.arrayBuffer());
        const blob = new Blob([buffer], { type: contentType });
        
        formData.set('file', blob, data.fileName || 'image');
      } else if (data.content) {
        const fieldName = data.type === 'log' ? 'log' : 'text';
        formData.set(fieldName, data.content);
      }

      // Add common metadata
      formData.set('source', 'discord');
      formData.set('discordMessageId', message.id);
      formData.set('discordChannelId', message.channelId);
      formData.set('discordAuthorId', message.author.id);
      formData.set('userEmail', userEmail);

      const response = await fetch(RECEIVER_URL, {
        method: 'POST',
        headers: { 'x-receiver-token': RECEIVER_TOKEN },
        body: formData as any,
      });

      const json: any = await response.json();
      
      if (!response.ok) {
        console.error(`❌ [DISCORD] ${data.type} processing failed:`, json?.error || 'Unknown error');
        return false;
      }

      console.log(`✅ [DISCORD] ${data.type} processed successfully`);
      return true;
    } catch (err) {
      console.error(`❌ [DISCORD] Error processing ${data.type}:`, err);
      return false;
    }
  }

  private async apiCall(endpoint: string, options?: RequestInit): Promise<ApiResponse> {
    try {
      const url = `${this.config.CALENDAR_APP_URL}${endpoint}`;
      const response = await fetch(url, options);
      return await response.json() as ApiResponse;
    } catch (error) {
      console.error(`API call failed for ${endpoint}:`, error);
      return { success: false, error: 'Network error' };
    }
  }

  private async getUserEmail(discordId: string): Promise<string | null> {
    const data = await this.apiCall(`/api/discord/register?discordId=${discordId}`) as StatusResponse;
    return (data.success && data.registered && data.user?.email) ? data.user.email : null;
  }

  private async sendRegistrationPrompt(message: Message): Promise<void> {
    await message.reply(REGISTRATION_MESSAGE);
  }

  // ================================
  // UTILITY METHODS
  // ================================

  private isImageAttachment(attachment: Attachment): boolean {
    return attachment.contentType?.startsWith('image/') ?? false;
  }

  private parseCommand(content: string): { command: string; args: string } {
    const trimmed = content.trim();
    const spaceIndex = trimmed.indexOf(' ');
    
    if (spaceIndex === -1) {
      return { command: trimmed, args: '' };
    }
    
    return {
      command: trimmed.substring(0, spaceIndex),
      args: trimmed.substring(spaceIndex + 1).trim()
    };
  }

  // ================================
  // COMMAND HANDLERS
  // ================================

  private async handleMessage(message: Message) {
    try {
      console.log('💬 [DISCORD] Received message from:', message.author.tag, 'in channel:', message.channelId);
      console.log('💬 [DISCORD] Message ID:', message.id, 'Guild ID:', message.guildId || 'DM');
      
      if (message.author.bot) {
        console.log('🤖 [DISCORD] Ignoring bot message');
        return;
      }

      // Handle commands
      if (message.content.startsWith(COMMAND_PREFIX)) {
        const { command } = this.parseCommand(message.content);
        
        switch (command) {
          case `${COMMAND_PREFIX}register`:
            await this.handleRegistrationCommand(message);
            return;
          case `${COMMAND_PREFIX}status`:
          case `${COMMAND_PREFIX}whoami`:
            await this.handleStatusCommand(message);
            return;
          case `${COMMAND_PREFIX}accounts`:
            await this.handleAccountsCommand(message);
            return;
          case `${COMMAND_PREFIX}switch`:
            await this.handleSwitchCommand(message);
            return;
          case `${COMMAND_PREFIX}log`:
            await this.handleLogCommand(message);
            return;
          default:
            console.log('⚠️ [DISCORD] Unrecognized command:', command);
            return;
        }
      }

      const { ALLOWED_CHANNELS } = this.config;
      
      // In guild channels, optionally restrict by ALLOWED_CHANNELS; always allow DMs
      if (message.guildId && ALLOWED_CHANNELS.length > 0 && !ALLOWED_CHANNELS.includes(message.channelId)) {
        console.log('🚫 [DISCORD] Channel not in whitelist, ignoring message');
        return; // ignore channels not whitelisted
      }

      // Process image attachments
      const attachments = Array.from(message.attachments.values());
      console.log('📎 [DISCORD] Message has', attachments.length, 'attachments');
      
      if (attachments.length > 0) {
        for (const attachment of attachments) {
          console.log('📎 [DISCORD] Processing attachment:', attachment.name, 'type:', attachment.contentType, 'size:', attachment.size);
          
          if (this.isImageAttachment(attachment)) {
            console.log('🖼️ [DISCORD] Found image attachment, processing...');
            const success = await this.sendToReceiver(message, {
              type: 'image',
              attachmentUrl: attachment.url,
              fileName: attachment.name || undefined
            });
            
            // Acknowledge in DMs
            if (!message.guildId) {
              await message.reply(success ? SUCCESS_MESSAGES.IMAGE : ERROR_MESSAGES.PROCESSING_FAILED);
            }
          } else {
            console.log('⚠️ [DISCORD] Attachment is not a supported image type');
          }
        }
        return;
      }

      // Process text messages (non-commands)
      if (message.content && message.content.trim().length > 0) {
        console.log('📝 [DISCORD] Message has text content, forwarding...');
        await this.sendToReceiver(message, {
          type: 'text',
          content: message.content
        });
        // We intentionally do not reply to text to avoid noise; logging happens on the server
        return;
      }
      
      console.log('⚠️ [DISCORD] Message has no processable content');
    } catch (err) {
      console.error('❌ [DISCORD] Message handler error:', err);
      console.error('❌ [DISCORD] Handler error stack:', err instanceof Error ? err.stack : 'No stack trace');
    }
  }

  private async handleRegistrationCommand(message: Message): Promise<void> {
    if (message.content.trim() !== `${COMMAND_PREFIX}register`) {
      await message.reply(`❌ Invalid format. Use: \`${COMMAND_PREFIX}register\` (no email needed - you'll authenticate with Google)`);
      return;
    }

    const result = await this.apiCall('/api/auth/oauth/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discordId: message.author.id,
        discordUsername: message.author.username
      })
    }) as RegistrationResponse & { authUrl?: string };

    if (result.success && result.authUrl) {
      const authMessage = [
        '🔐 **Google Authentication Required**\n',
        'To link your Discord account with a Google email, please click the link below:\n',
        `🔗 **[Authenticate with Google](${result.authUrl})**\n`,
        '📋 **Multi-Account Support:**',
        '• If this is your first account, it will be set as active',
        '• If you already have accounts, this will add a new one or refresh an existing one',
        `• Use \`${COMMAND_PREFIX}accounts\` to see all your registered accounts`,
        `• Use \`${COMMAND_PREFIX}switch [number]\` to switch between accounts\n`,
        '⚠️ This link expires in 10 minutes for security.',
        '✅ After authentication, you\'ll be able to upload images and send logs to your calendar account.'
      ].join('\n');

      await message.reply({
        content: authMessage,
        flags: ['SuppressEmbeds']
      });
    } else {
      await message.reply(`❌ Authentication setup failed: ${result.error || ERROR_MESSAGES.ACCOUNT_CREATION_FAILED}`);
    }
  }

  private async handleStatusCommand(message: Message) {
    const result = await this.apiCall(`/api/discord/register?discordId=${message.author.id}`) as StatusResponse;

    if (result.success && result.registered) {
      const user = result.user;
      await message.reply(`✅ **Registration Status: ACTIVE**\n📧 Email: **${user?.email}**\n📅 Registered: ${user?.registeredAt ? new Date(user.registeredAt).toLocaleDateString() : 'Unknown'}`);
    } else {
      await message.reply(`❌ **Registration Status: NOT REGISTERED**\n\nTo register your Discord account, use: \`!register\``);
    }
  }

  private async handleAccountsCommand(message: Message): Promise<void> {
    const data = await this.apiCall(`/api/discord/accounts?discordId=${message.author.id}`);

    if (!data.success) {
      await message.reply('❌ Failed to retrieve your accounts. Please try again later.');
      return;
    }

    if (data.accounts.length === 0) {
      await message.reply('📭 You have no Google accounts registered. Use `!register` to add your first account.');
      return;
    }

    let accountsList = '📋 **Your Registered Google Accounts:**\n\n';
    data.accounts.forEach((account: any) => {
      const activeIndicator = account.isActive ? ' ✅ (Active)' : '';
      accountsList += `**${account.accountNumber}.** ${account.email}${activeIndicator}\n`;
      accountsList += `   Registered: ${new Date(account.registeredAt).toLocaleDateString()}\n\n`;
    });

    accountsList += `Total accounts: **${data.totalAccounts}**\n\n`;
    accountsList += 'Use `!switch [number]` to switch between accounts.';

    await message.reply(accountsList);
  }

  private async handleSwitchCommand(message: Message): Promise<void> {
    const args = message.content.trim().split(/\s+/);
    if (args.length !== 2) {
      await message.reply('❌ Invalid format. Use: `!switch [account_number]`\n\nExample: `!switch 2`\n\nUse `!accounts` to see your registered accounts.');
      return;
    }

    const accountNumber = parseInt(args[1]);
    if (isNaN(accountNumber) || accountNumber < 1) {
      await message.reply('❌ Please provide a valid account number. Use `!accounts` to see your registered accounts.');
      return;
    }

    const data = await this.apiCall('/api/discord/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discordId: message.author.id,
        accountNumber
      })
    });

    if (data.success) {
      await message.reply(`✅ **Account switched successfully!**\n\n📧 Active account: **${data.activeAccount.email}**\n\nAll future uploads will be saved to this account.`);
    } else {
      await message.reply(`❌ ${data.error || 'Failed to switch account. Please check the account number and try again.'}`);
    }
  }


  private async handleLogCommand(message: Message): Promise<void> {
    const content = message.content.replace(`${COMMAND_PREFIX}log`, '').trim();
    if (!content) {
      await message.reply(`❌ ${ERROR_MESSAGES.NO_TEXT_PROVIDED}\n\nExample: \`${COMMAND_PREFIX}log Meeting with client went well\``);
      return;
    }

    const success = await this.sendToReceiver(message, {
      type: 'log',
      content: content
    });

    if (!message.guildId) {
      await message.reply(success ? SUCCESS_MESSAGES.LOG : ERROR_MESSAGES.PROCESSING_FAILED);
    }
  }

}

// Export singleton instance
const discordBotService = new DiscordBotService();
export default discordBotService;