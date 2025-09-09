import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, Events, Message, TextChannel } from 'discord.js';
import fetch from 'node-fetch';

// Basic config
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const RECEIVER_URL = process.env.RECEIVER_URL || 'http://localhost:3000/api/receiver/image';
const RECEIVER_TOKEN = process.env.IMAGE_RECEIVER_TOKEN || '';
const ALLOWED_CHANNELS = (process.env.ALLOWED_CHANNELS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

if (!BOT_TOKEN) {
  console.error('Missing DISCORD_BOT_TOKEN in env');
  process.exit(1);
}
if (!RECEIVER_TOKEN) {
  console.error('Missing RECEIVER_TOKEN in env');
  process.exit(1);
}
if (!RECEIVER_URL) {
  console.error('Missing RECEIVER_URL in env');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message],
});

client.once(Events.ClientReady, (c) => {
  console.log(`🤖 Logged in as ${c.user.tag}`);
});

async function forwardAttachment(message: Message, attachmentUrl: string, originalName?: string): Promise<boolean> {
  try {
    // Fetch the attachment bytes
    const res = await fetch(attachmentUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch attachment: ${res.status} ${res.statusText}`);
    }
    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const buffer = Buffer.from(await res.arrayBuffer());

    // Build multipart using FormData compatible with node-fetch@3
    const formData = new FormData();
    const blob = new Blob([buffer], { type: contentType });
    formData.set('file', blob, originalName || 'image');
    formData.set('source', 'discord');
    formData.set('discordMessageId', message.id);
    formData.set('discordChannelId', message.channelId);
    formData.set('discordAuthorId', message.author.id);

    const upload = await fetch(RECEIVER_URL, {
      method: 'POST',
      headers: {
        'x-receiver-token': RECEIVER_TOKEN,
      },
      body: formData as any,
    });

    const json = await upload.json();
    if (!upload.ok || !json) {
      console.error('Receiver responded with error', upload.status, json);
      return false;
    }

    console.log('✅ Forwarded image:', json);
    return true;
  } catch (err) {
    console.error('Error forwarding attachment:', err);
    return false;
  }
}

async function forwardText(message: Message): Promise<boolean> {
  try {
    const content = (message.content || '').trim();
    if (!content) return false;

    const formData = new FormData();
    formData.set('text', content);
    formData.set('source', 'discord');
    formData.set('discordMessageId', message.id);
    formData.set('discordChannelId', message.channelId);
    formData.set('discordAuthorId', message.author.id);

    console.log(RECEIVER_URL)

    const res = await fetch(RECEIVER_URL, {
      method: 'POST',
      headers: {
        'x-receiver-token': RECEIVER_TOKEN,
      },
      body: formData as any,
    });

    const json = await res.json();
    if (!res.ok || !json) {
      console.error('Receiver responded with error for text', res.status, json);
      return false;
    }
    console.log('✅ Forwarded text:', json);
    return true;
  } catch (err) {
    console.error('Error forwarding text:', err);
    return false;
  }
}

client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author.bot) return;

    // In guild channels, optionally restrict by ALLOWED_CHANNELS; always allow DMs
    if (message.guildId && ALLOWED_CHANNELS.length > 0 && !ALLOWED_CHANNELS.includes(message.channelId)) {
      return; // ignore channels not whitelisted
    }

    // If message has attachments, forward the first image-type attachment
    const attachments = Array.from(message.attachments.values());
    if (attachments.length > 0) {
      for (const att of attachments) {
        const lower = (att.contentType || '').toLowerCase();
        if (lower.includes('image/jpeg') || lower.includes('image/png') || lower.includes('image/webp') || lower.includes('image/gif')) {
          const ok = await forwardAttachment(message, att.url, att.name || undefined);
          // Acknowledge in DMs so users get feedback
          if (!message.guildId) {
            if (ok) {
              await message.reply('Got it! I received your image and started processing.');
            } else {
              await message.reply('Sorry, I could not process that image. Please try again.');
            }
          }
        }
      }
      return;
    }

    // No attachments; if there's text content, forward it
    if (message.content && message.content.trim().length > 0) {
      await forwardText(message);
      // We intentionally do not reply to text to avoid noise; logging happens on the server
      return;
    }
  } catch (err) {
    console.error('Message handler error:', err);
  }
});

client.login(BOT_TOKEN);