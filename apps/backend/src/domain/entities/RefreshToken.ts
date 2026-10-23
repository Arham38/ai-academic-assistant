export interface RefreshTokenProperties {
  id?: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  isRevoked?: boolean;
  expiresAt: Date;
  replacedByToken?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Enterprise Domain Entity representing an active or revoked refresh token session.
 * Pure TypeScript entity decoupled from MongoDB/Mongoose.
 */
export class RefreshToken {
  private readonly _id?: string;
  private readonly _userId: string;
  private readonly _tokenHash: string;
  private readonly _familyId: string;
  private _isRevoked: boolean;
  private readonly _expiresAt: Date;
  private _replacedByToken?: string;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: RefreshTokenProperties) {
    if (!props.userId?.trim()) {
      throw new Error('RefreshToken entity validation failed: userId is required.');
    }
    if (!props.tokenHash?.trim()) {
      throw new Error('RefreshToken entity validation failed: tokenHash is required.');
    }
    if (!props.familyId?.trim()) {
      throw new Error('RefreshToken entity validation failed: familyId is required.');
    }
    if (
      !props.expiresAt ||
      !(props.expiresAt instanceof Date) ||
      isNaN(props.expiresAt.getTime())
    ) {
      throw new Error('RefreshToken entity validation failed: A valid expiresAt Date is required.');
    }

    this._id = props.id;
    this._userId = props.userId.trim();
    this._tokenHash = props.tokenHash.trim();
    this._familyId = props.familyId.trim();
    this._isRevoked = props.isRevoked ?? false;
    this._expiresAt = props.expiresAt;
    this._replacedByToken = props.replacedByToken?.trim();
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  public get id(): string | undefined {
    return this._id;
  }

  public get userId(): string {
    return this._userId;
  }

  public get tokenHash(): string {
    return this._tokenHash;
  }

  public get familyId(): string {
    return this._familyId;
  }

  public get isRevoked(): boolean {
    return this._isRevoked;
  }

  public get expiresAt(): Date {
    return this._expiresAt;
  }

  public get replacedByToken(): string | undefined {
    return this._replacedByToken;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public isExpired(now: Date = new Date()): boolean {
    return this._expiresAt.getTime() <= now.getTime();
  }

  public revoke(replacementHash?: string): void {
    this._isRevoked = true;
    if (replacementHash) {
      this._replacedByToken = replacementHash.trim();
    }
    this._updatedAt = new Date();
  }
}
