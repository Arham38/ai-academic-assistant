import { Schema, model, Document, Types } from 'mongoose';

export interface RefreshTokenDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string;
  familyId: string;
  isRevoked: boolean;
  replacedByToken?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RefreshTokenSchema = new Schema<RefreshTokenDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      trim: true,
    },
    familyId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    replacedByToken: {
      type: String,
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'refresh_tokens',
    versionKey: false,
  },
);

// Indexes
RefreshTokenSchema.index({ tokenHash: 1 }, { unique: true });
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // MongoDB TTL auto-cleanup
RefreshTokenSchema.index({ userId: 1, familyId: 1 });

export const RefreshTokenModel = model<RefreshTokenDocument>('RefreshToken', RefreshTokenSchema);
