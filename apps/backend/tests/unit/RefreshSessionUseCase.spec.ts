import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RefreshSessionUseCase } from '../../src/application/use-cases/auth/RefreshSessionUseCase';
import { IRefreshTokenRepository } from '../../src/domain/repositories/IRefreshTokenRepository';
import { IUserRepository } from '../../src/domain/repositories/IUserRepository';
import { ITokenProvider } from '../../src/domain/providers/ITokenProvider';
import { OpaqueTokenProvider } from '../../src/infrastructure/security/OpaqueTokenProvider';
import { RefreshToken } from '../../src/domain/entities/RefreshToken';
import { User } from '../../src/domain/entities/User';
import { UnauthorizedError, ForbiddenError } from '../../src/domain/errors/AppError';

describe('RefreshSessionUseCase Unit Tests', () => {
  let mockRefreshTokenRepository: IRefreshTokenRepository;
  let mockUserRepository: IUserRepository;
  let mockTokenProvider: ITokenProvider;
  let mockOpaqueTokenProvider: OpaqueTokenProvider;
  let useCase: RefreshSessionUseCase;

  beforeEach(() => {
    mockRefreshTokenRepository = {
      create: vi.fn().mockImplementation(async (token) => token),
      findByTokenHash: vi.fn(),
      revokeById: vi.fn().mockResolvedValue(true),
      revokeFamily: vi.fn().mockResolvedValue(2),
      revokeAllForUser: vi.fn().mockResolvedValue(2),
    };

    mockUserRepository = {
      create: vi.fn(),
      createMany: vi.fn(),
      findById: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      exists: vi.fn(),
      findByEmail: vi.fn(),
      findByEmailAndTenant: vi.fn(),
      incrementTokenVersion: vi.fn(),
      updateAIUsage: vi.fn(),
      updateLastLogin: vi.fn(),
      existsByEmail: vi.fn(),
    };

    mockTokenProvider = {
      generateAccessToken: vi.fn().mockReturnValue('new.jwt.access.token'),
      verifyToken: vi.fn(),
    };

    mockOpaqueTokenProvider = {
      generateToken: vi.fn().mockReturnValue('new_rotated_opaque_token_128_hex'),
      hashToken: vi.fn().mockImplementation((token: string) => `hash_of_${token}`),
      generateFamilyId: vi.fn().mockReturnValue('family-uuid-123'),
    };

    useCase = new RefreshSessionUseCase(
      mockRefreshTokenRepository,
      mockUserRepository,
      mockTokenProvider,
      mockOpaqueTokenProvider,
    );
  });

  it('should successfully rotate refresh token and issue a new JWT access token', async () => {
    const existingRefreshToken = new RefreshToken({
      id: 'token_db_id_1',
      userId: 'user_123',
      tokenHash: 'hash_of_valid_raw_refresh_token',
      familyId: 'family_abc',
      isRevoked: false,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // Valid 1 day
    });

    const activeUser = new User({
      id: 'user_123',
      tenantId: 'default',
      email: 'student@mit.edu',
      firstName: 'Student',
      lastName: 'User',
      role: 'STUDENT',
      status: 'ACTIVE',
    });

    vi.mocked(mockRefreshTokenRepository.findByTokenHash).mockResolvedValue(existingRefreshToken);
    vi.mocked(mockUserRepository.findById).mockResolvedValue(activeUser);

    const result = await useCase.execute({ rawRefreshToken: 'valid_raw_refresh_token' });

    expect(mockRefreshTokenRepository.findByTokenHash).toHaveBeenCalledWith(
      'hash_of_valid_raw_refresh_token',
    );
    expect(mockRefreshTokenRepository.create).toHaveBeenCalled();
    expect(mockRefreshTokenRepository.revokeById).toHaveBeenCalledWith(
      'token_db_id_1',
      'hash_of_new_rotated_opaque_token_128_hex',
    );
    expect(mockTokenProvider.generateAccessToken).toHaveBeenCalledWith({
      id: 'user_123',
      role: 'STUDENT',
      tokenVersion: 1,
    });

    expect(result).toEqual({
      accessToken: 'new.jwt.access.token',
      rawRefreshToken: 'new_rotated_opaque_token_128_hex',
    });
  });

  it('should detect reuse of a revoked token, revoke the entire family, and throw UnauthorizedError', async () => {
    const hijackedToken = new RefreshToken({
      id: 'token_hijacked_id',
      userId: 'user_123',
      tokenHash: 'hash_of_stolen_token',
      familyId: 'family_hijacked_chain',
      isRevoked: true, // Already rotated / revoked!
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    });

    vi.mocked(mockRefreshTokenRepository.findByTokenHash).mockResolvedValue(hijackedToken);

    await expect(useCase.execute({ rawRefreshToken: 'stolen_token' })).rejects.toThrow(
      UnauthorizedError,
    );

    // Reuse detection assertion: entire family revoked
    expect(mockRefreshTokenRepository.revokeFamily).toHaveBeenCalledWith('family_hijacked_chain');
    expect(mockTokenProvider.generateAccessToken).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedError when refresh token has expired', async () => {
    const expiredToken = new RefreshToken({
      id: 'token_expired_id',
      userId: 'user_123',
      tokenHash: 'hash_of_expired_token',
      familyId: 'family_1',
      isRevoked: false,
      expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
    });

    vi.mocked(mockRefreshTokenRepository.findByTokenHash).mockResolvedValue(expiredToken);

    await expect(useCase.execute({ rawRefreshToken: 'expired_token' })).rejects.toThrow(
      UnauthorizedError,
    );
  });

  it('should throw ForbiddenError when user account is suspended', async () => {
    const validToken = new RefreshToken({
      id: 'token_1',
      userId: 'user_suspended',
      tokenHash: 'hash_of_token',
      familyId: 'family_1',
      isRevoked: false,
      expiresAt: new Date(Date.now() + 1000 * 60),
    });

    const suspendedUser = new User({
      id: 'user_suspended',
      tenantId: 'default',
      email: 'suspended@mit.edu',
      firstName: 'Suspended',
      lastName: 'User',
      status: 'SUSPENDED',
    });

    vi.mocked(mockRefreshTokenRepository.findByTokenHash).mockResolvedValue(validToken);
    vi.mocked(mockUserRepository.findById).mockResolvedValue(suspendedUser);

    await expect(useCase.execute({ rawRefreshToken: 'token' })).rejects.toThrow(ForbiddenError);
  });
});
