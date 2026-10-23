import { Schema, model, Document } from 'mongoose';
import { BaseEntity } from '../BaseRepository';

export interface UserEntity extends BaseEntity {
  tenantId: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: 'STUDENT' | 'RESEARCHER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  quotas: {
    monthlyScanLimit: number;
    scansConsumedThisMonth: number;
    maxPagesPerDocument: number;
    quotaResetDate: Date;
  };
}

export type UserDocument = UserEntity & Document;

const UserSchema = new Schema<UserDocument>(
  {
    tenantId: { type: String, required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    fullName: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ['STUDENT', 'RESEARCHER', 'ADMIN'],
      default: 'STUDENT',
      required: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'],
      default: 'ACTIVE',
      required: true,
    },
    quotas: {
      monthlyScanLimit: { type: Number, default: 20 },
      scansConsumedThisMonth: { type: Number, default: 0 },
      maxPagesPerDocument: { type: Number, default: 50 },
      quotaResetDate: { type: Date, default: () => new Date() },
    },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    collection: 'users',
  },
);

// Compound unique index per tenant
UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });

export const UserModel = model<UserDocument>('User', UserSchema);
