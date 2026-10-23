export type UserRole = 'STUDENT' | 'RESEARCHER' | 'ADMIN';
export type UserAccountStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';

export interface AIUsageState {
  tokensConsumed: number;
  tokenLimit: number;
}

export interface UserSecurityState {
  tokenVersion: number;
  lastLogin?: Date;
  isEmailVerified: boolean;
}

export interface UserProperties {
  id?: string;
  tenantId: string;
  email: string;
  passwordHash?: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  status?: UserAccountStatus;
  aiUsage?: Partial<AIUsageState>;
  security?: Partial<UserSecurityState>;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Enterprise Domain Entity representing an authenticated platform user.
 * Strictly decoupled from Mongoose, databases, and network adapters.
 */
export class User {
  private readonly _id?: string;
  private readonly _tenantId: string;
  private _email: string;
  private _passwordHash?: string;
  private _firstName: string;
  private _lastName: string;
  private _role: UserRole;
  private _status: UserAccountStatus;
  private _aiUsage: AIUsageState;
  private _security: UserSecurityState;
  private _isDeleted: boolean;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: UserProperties) {
    if (!props.email || !props.email.includes('@')) {
      throw new Error('User entity validation failed: Invalid email address format.');
    }
    if (!props.firstName?.trim() || !props.lastName?.trim()) {
      throw new Error('User entity validation failed: First and last name are required.');
    }

    this._id = props.id;
    this._tenantId = props.tenantId;
    this._email = props.email.toLowerCase().trim();
    this._passwordHash = props.passwordHash;
    this._firstName = props.firstName.trim();
    this._lastName = props.lastName.trim();
    this._role = props.role ?? 'STUDENT';
    this._status = props.status ?? 'ACTIVE';

    this._aiUsage = {
      tokensConsumed: props.aiUsage?.tokensConsumed ?? 0,
      tokenLimit: props.aiUsage?.tokenLimit ?? 100000,
    };

    if (this._aiUsage.tokensConsumed < 0) {
      throw new Error('User entity invariant failed: tokensConsumed cannot be negative.');
    }

    this._security = {
      tokenVersion: props.security?.tokenVersion ?? 1,
      lastLogin: props.security?.lastLogin,
      isEmailVerified: props.security?.isEmailVerified ?? false,
    };

    this._isDeleted = props.isDeleted ?? false;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  // Getters
  public get id(): string | undefined {
    return this._id;
  }

  public get tenantId(): string {
    return this._tenantId;
  }

  public get email(): string {
    return this._email;
  }

  public get passwordHash(): string | undefined {
    return this._passwordHash;
  }

  public get firstName(): string {
    return this._firstName;
  }

  public get lastName(): string {
    return this._lastName;
  }

  public get fullName(): string {
    return `${this._firstName} ${this._lastName}`;
  }

  public get role(): UserRole {
    return this._role;
  }

  public get status(): UserAccountStatus {
    return this._status;
  }

  public get aiUsage(): Readonly<AIUsageState> {
    return { ...this._aiUsage };
  }

  public get security(): Readonly<UserSecurityState> {
    return { ...this._security };
  }

  public get isDeleted(): boolean {
    return this._isDeleted;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  // Domain Business Rules & Invariant Methods
  public hasAvailableQuota(tokensRequested = 0): boolean {
    if (this._status !== 'ACTIVE' || this._isDeleted) {
      return false;
    }
    return this._aiUsage.tokensConsumed + tokensRequested <= this._aiUsage.tokenLimit;
  }

  public consumeQuota(tokens: number): void {
    if (tokens < 0) {
      throw new Error('Cannot consume a negative number of AI tokens.');
    }
    if (!this.hasAvailableQuota(tokens)) {
      throw new Error(
        `AI Token quota exceeded: Requested ${tokens} tokens, available balance is ${
          this._aiUsage.tokenLimit - this._aiUsage.tokensConsumed
        }.`,
      );
    }
    this._aiUsage.tokensConsumed += tokens;
    this._updatedAt = new Date();
  }

  public resetQuota(newLimit?: number): void {
    this._aiUsage.tokensConsumed = 0;
    if (newLimit !== undefined && newLimit > 0) {
      this._aiUsage.tokenLimit = newLimit;
    }
    this._updatedAt = new Date();
  }

  public incrementTokenVersion(): number {
    this._security.tokenVersion += 1;
    this._updatedAt = new Date();
    return this._security.tokenVersion;
  }

  public recordLogin(): void {
    this._security.lastLogin = new Date();
    this._updatedAt = new Date();
  }

  public verifyEmail(): void {
    this._security.isEmailVerified = true;
    this._updatedAt = new Date();
  }

  public deactivateAccount(): void {
    this._status = 'SUSPENDED';
    this.incrementTokenVersion();
    this._updatedAt = new Date();
  }

  public activateAccount(): void {
    this._status = 'ACTIVE';
    this._updatedAt = new Date();
  }

  public markAsDeleted(): void {
    this._isDeleted = true;
    this._status = 'SUSPENDED';
    this.incrementTokenVersion();
    this._updatedAt = new Date();
  }
}
