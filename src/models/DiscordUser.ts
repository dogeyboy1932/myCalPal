import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDiscordUser extends Document {
  discordId: string;
  email: string;
  username?: string;
  discriminator?: string;
  registeredAt: Date;
  lastUsed?: Date;
  isActive: boolean;
  updateLastUsed(): Promise<IDiscordUser>;
}

export interface IDiscordUserModel extends Model<IDiscordUser> {
  findByDiscordId(discordId: string): Promise<IDiscordUser | null>;
  findByEmail(email: string): Promise<IDiscordUser[]>;
  registerUser(discordId: string, email: string, username?: string, discriminator?: string): Promise<IDiscordUser>;
}

const DiscordUserSchema: Schema = new Schema({
  discordId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  username: {
    type: String,
    trim: true
  },
  discriminator: {
    type: String,
    trim: true
  },
  registeredAt: {
    type: Date,
    default: Date.now
  },
  lastUsed: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index to ensure one Discord user per email
DiscordUserSchema.index({ discordId: 1, email: 1 }, { unique: true });

// Instance methods
DiscordUserSchema.methods.updateLastUsed = function() {
  this.lastUsed = new Date();
  return this.save();
};

// Static methods
DiscordUserSchema.statics.findByDiscordId = function(discordId: string) {
  return this.findOne({ discordId, isActive: true });
};

DiscordUserSchema.statics.findByEmail = function(email: string) {
  return this.find({ email: email.toLowerCase(), isActive: true });
};

DiscordUserSchema.statics.registerUser = async function(discordId: string, email: string, username?: string, discriminator?: string) {
  // Check if user already exists
  const existingUser = await this.findOne({ discordId });
  
  if (existingUser) {
    // Update existing registration
    existingUser.email = email.toLowerCase();
    existingUser.username = username;
    existingUser.discriminator = discriminator;
    existingUser.registeredAt = new Date();
    existingUser.isActive = true;
    return await existingUser.save();
  }
  
  // Create new registration
  return await this.create({
    discordId,
    email: email.toLowerCase(),
    username,
    discriminator,
    isActive: true
  });
};

export default (mongoose.models.DiscordUser || mongoose.model<IDiscordUser, IDiscordUserModel>('DiscordUser', DiscordUserSchema)) as IDiscordUserModel;