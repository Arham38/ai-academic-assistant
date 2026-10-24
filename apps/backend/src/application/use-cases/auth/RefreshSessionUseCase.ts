import { IRefreshTokenRepository } from '../../../domain/repositories/IRefreshTokenRepository';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { ITokenProvider } from '../../../domain/providers/ITokenProvider';
import { OpaqueTokenProvider } from '../../../infrastructure/security/OpaqueTokenProvider';
import { RefreshToken } from '../../../domain/entities/RefreshToken';
import { UnauthorizedError, ForbiddenError } from '../../../domain/errors/AppError';
import { RefreshSessionResponseDTO } from '../../dtos/AuthDTOs';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Use case managing refresh token rotation and automatic session hijacking detection.
 * Strictly decoupled from HTTP cookies and Express request objects.
 */
export class RefreshSessionUseCase {
  constructor(
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly userRepository: IUserRepository,
    private readonly tokenProvider: ITokenProvider,
    private readonly opaqueTokenProvider: OpaqueTokenProvider,
  ) {}

  public async execute(dto: { rawRefreshToken: string }): Promise<RefreshSessionResponseDTO> {
    if (!dto.rawRefreshToken?.trim()) {
      throw new UnauthorizedError('Authentication required. Refresh token missing.');
    }

    // 1. Hash incoming token for database lookup
    const tokenHash = this.opaqueTokenProvider.hashToken(dto.rawRefreshToken);
    const existingToken = await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (!existingToken) {
      throw new UnauthorizedError('Invalid or expired refresh token.');
    }

    // 2. Reuse Detection: If a revoked token is presented, compromise is assumed
    if (existingToken.isRevoked) {
      await this.refreshTokenRepository.revokeFamily(existingToken.familyId);
      throw new UnauthorizedError(
        'Compromised session detected. All sessions in this chain have been revoked.',
      );
    }

    // 3. TTL Expiration Check
    if (existingToken.isExpired()) {
      throw new UnauthorizedError('Invalid or expired refresh token.');
    }

    // 4. Retrieve associated User
    const user = await this.userRepository.findById(existingToken.userId);
    if (!user || user.isDeleted) {
      throw new UnauthorizedError('User account not found or deactivated.');
    }

    if (user.status === 'SUSPENDED') {
      throw new ForbiddenError('Account is suspended. Please contact institutional support.');
    }

    // 5. Generate rotated refresh token under the same familyId
    const newRawRefreshToken = this.opaqueTokenProvider.generateToken();
    const newHash = this.opaqueTokenProvider.hashToken(newRawRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    const newRefreshToken = new RefreshToken({
      userId: user.id!,
      tokenHash: newHash,
      familyId: existingToken.familyId,
      expiresAt,
    });

    await this.refreshTokenRepository.create(newRefreshToken);

    // 6. Invalidate old token and link to replacement
    await this.refreshTokenRepository.revokeById(existingToken.id!, newHash);

    // 7. Issue new JWT access token
    const accessToken = this.tokenProvider.generateAccessToken({
      id: user.id!,
      role: user.role,
      tokenVersion: user.security.tokenVersion,
    });

    return {
      accessToken,
      rawRefreshToken: newRawRefreshToken,
      user: {
        id: user.id!,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }
}
