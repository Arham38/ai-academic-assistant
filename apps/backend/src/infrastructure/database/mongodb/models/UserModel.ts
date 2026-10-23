import { Schema, model, Document, Types } from 'mongoose';
import { SystemRole } from '../../../../domain/types/Roles';

export interface UserDocument extends Document {
  _id: Types.ObjectId;
  tenantId: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: SystemRole;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  aiUsage: {
    tokensConsumed: number;
    tokenLimit: number;
  };
  security: {
    tokenVersion: number;
    lastLogin?: Date;
    isEmailVerified: boolean;
  };
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDocument>(
  {
    tenantId: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Security safeguard: Never leaked in standard queries
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: Object.values(SystemRole),
      default: SystemRole.STUDENT,
      required: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'],
      default: 'ACTIVE',
      required: true,
    },
    aiUsage: {
      tokensConsumed: {
        type: Number,
        default: 0,
        min: 0,
      },
      tokenLimit: {
        type: Number,
        default: 100000,
        min: 0,
      },
    },
    security: {
      tokenVersion: {
        type: Number,
        default: 1,
        min: 1,
      },
      lastLogin: {
        type: Date,
      },
      isEmailVerified: {
        type: Boolean,
        default: false,
      },
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'users',
    versionKey: false,
  },
);

// Explicit database indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ tenantId: 1, email: 1 });
UserSchema.index({ isDeleted: 1 });

export const UserModel = model<UserDocument>('User', UserSchema);
