import mongoose, { Document, Schema, Model } from 'mongoose';

interface IOAuthSession extends Document {
  discordId: string;
  discordUsername: string;
  state: string;
  createdAt: Date;
  expiresAt: Date;
}

interface IOAuthSessionModel extends Model<IOAuthSession> {
  findByState(state: string): Promise<IOAuthSession | null>;
  findByDiscordId(discordId: string): Promise<IOAuthSession | null>;
  createSession(discordId: string, discordUsername: string, state: string): Promise<IOAuthSession>;
  cleanupExpired(): Promise<void>;
}

const OAuthSessionSchema = new Schema<IOAuthSession>({
  discordId: {
    type: String,
    required: true,
    index: true
  },
  discordUsername: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    index: { expireAfterSeconds: 0 }
  }
});

// Static methods
OAuthSessionSchema.statics.findByState = function(state: string) {
  return this.findOne({ state, expiresAt: { $gt: new Date() } });
};

OAuthSessionSchema.statics.findByDiscordId = function(discordId: string) {
  return this.findOne({ discordId, expiresAt: { $gt: new Date() } });
};

OAuthSessionSchema.statics.createSession = function(discordId: string, discordUsername: string, state: string) {
  return this.create({
    discordId,
    discordUsername,
    state,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
  });
};

OAuthSessionSchema.statics.cleanupExpired = function() {
  return this.deleteMany({ expiresAt: { $lt: new Date() } });
};

const OAuthSession = mongoose.models.OAuthSession || 
  mongoose.model<IOAuthSession, IOAuthSessionModel>('OAuthSession', OAuthSessionSchema);

export default OAuthSession as IOAuthSessionModel;
export type { IOAuthSession };