import { Model, Types } from 'mongoose';
import { IRefreshTokenRepository } from '../../../domain/repositories/IRefreshTokenRepository';
import { RefreshToken } from '../../../domain/entities/RefreshToken';
import { RefreshTokenDocument } from './models/RefreshTokenModel';

export class MongoRefreshTokenRepository implements IRefreshTokenRepository {
  constructor(private readonly model: Model<RefreshTokenDocument>) {}

  private toDomain(doc: {
    _id: Types.ObjectId | string;
    userId: Types.ObjectId | string;
    tokenHash: string;
    familyId: string;
    isRevoked: boolean;
    replacedByToken?: string;
    expiresAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }): RefreshToken {
    return new RefreshToken({
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      tokenHash: doc.tokenHash,
      familyId: doc.familyId,
      isRevoked: doc.isRevoked,
      replacedByToken: doc.replacedByToken,
      expiresAt: doc.expiresAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  public async create(token: RefreshToken): Promise<RefreshToken> {
    const created = await this.model.create({
      userId: new Types.ObjectId(token.userId),
      tokenHash: token.tokenHash,
      familyId: token.familyId,
      isRevoked: token.isRevoked,
      replacedByToken: token.replacedByToken,
      expiresAt: token.expiresAt,
    });

    return this.toDomain(created.toObject());
  }

  public async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const doc = await this.model.findOne({ tokenHash }).lean().exec();
    return doc ? this.toDomain(doc) : null;
  }

  public async revokeById(id: string, replacedByTokenHash?: string): Promise<boolean> {
    const updatePayload: Record<string, unknown> = {
      isRevoked: true,
      updatedAt: new Date(),
    };
    if (replacedByTokenHash) {
      updatePayload.replacedByToken = replacedByTokenHash;
    }

    const res = await this.model.updateOne({ _id: id }, { $set: updatePayload });
    return res.modifiedCount > 0;
  }

  public async revokeFamily(familyId: string): Promise<number> {
    const res = await this.model.updateMany(
      { familyId, isRevoked: false },
      { $set: { isRevoked: true, updatedAt: new Date() } },
    );
    return res.modifiedCount;
  }

  public async revokeAllForUser(userId: string): Promise<number> {
    const res = await this.model.updateMany(
      { userId: new Types.ObjectId(userId), isRevoked: false },
      { $set: { isRevoked: true, updatedAt: new Date() } },
    );
    return res.modifiedCount;
  }
}
