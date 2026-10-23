import { IRefreshTokenRepository } from '../../../domain/repositories/IRefreshTokenRepository';
import { OpaqueTokenProvider } from '../../../infrastructure/security/OpaqueTokenProvider';

/**
 * Use case managing graceful session termination (logout).
 * Revokes the specific refresh token in persistence.
 */
export class LogoutUseCase {
  constructor(
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly opaqueTokenProvider: OpaqueTokenProvider,
  ) {}

  public async execute(dto: { rawRefreshToken?: string }): Promise<void> {
    if (!dto.rawRefreshToken?.trim()) {
      return;
    }

    const tokenHash = this.opaqueTokenProvider.hashToken(dto.rawRefreshToken);
    const existingToken = await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (existingToken && !existingToken.isRevoked && existingToken.id) {
      await this.refreshTokenRepository.revokeById(existingToken.id);
    }
  }
}
