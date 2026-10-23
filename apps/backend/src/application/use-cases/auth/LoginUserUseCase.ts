import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IHashProvider } from '../../../domain/providers/IHashProvider';
import { ITokenProvider } from '../../../domain/providers/ITokenProvider';
import { IRefreshTokenRepository } from '../../../domain/repositories/IRefreshTokenRepository';
import { OpaqueTokenProvider } from '../../../infrastructure/security/OpaqueTokenProvider';
import { RefreshToken } from '../../../domain/entities/RefreshToken';
import { UnauthorizedError, ForbiddenError } from '../../../domain/errors/AppError';
import { LoginUserDTO, LoginUserResponseDTO } from '../../dtos/AuthDTOs';

// Valid bcrypt hash used to normalize execution time when user is not found
const DUMMY_BCRYPT_HASH = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj40c74Xf9ye';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Encapsulates the business rules for authenticating user credentials.
 * Implements constant-time hash comparison to mitigate user enumeration timing attacks.
 * Issues cryptographically signed access tokens and initiates an opaque refresh token session chain.
 */
export class LoginUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hashProvider: IHashProvider,
    private readonly tokenProvider: ITokenProvider,
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly opaqueTokenProvider: OpaqueTokenProvider,
  ) {}

  public async execute(dto: LoginUserDTO): Promise<LoginUserResponseDTO> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    // 1. Fetch user by email, requesting hidden passwordHash
    const user = await this.userRepository.findByEmail(normalizedEmail, true);

    // 2. Timing attack mitigation: if user does not exist, run dummy compare
    if (!user || !user.passwordHash) {
      await this.hashProvider.compare(dto.password, DUMMY_BCRYPT_HASH);
      throw new UnauthorizedError('Invalid email or password.');
    }

    // 3. Compare provided plaintext password with stored hash
    const isPasswordValid = await this.hashProvider.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    // 4. Invariant: Suspended users cannot authenticate
    if (user.status === 'SUSPENDED') {
      throw new ForbiddenError('Account is suspended. Please contact institutional support.');
    }

    // 5. Update last login metadata asynchronously
    if (user.id) {
      await this.userRepository.updateLastLogin(user.id);
    }

    // 6. Generate signed cryptographic access token
    const accessToken = this.tokenProvider.generateAccessToken({
      id: user.id!,
      role: user.role,
      tokenVersion: user.security.tokenVersion,
    });

    // 7. Generate opaque refresh token and persist hashed session
    const rawRefreshToken = this.opaqueTokenProvider.generateToken();
    const tokenHash = this.opaqueTokenProvider.hashToken(rawRefreshToken);
    const familyId = this.opaqueTokenProvider.generateFamilyId();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    const refreshToken = new RefreshToken({
      userId: user.id!,
      tokenHash,
      familyId,
      expiresAt,
    });

    await this.refreshTokenRepository.create(refreshToken);

    // 8. Return access token, plaintext refresh token for cookie, and sanitized user profile
    return {
      accessToken,
      rawRefreshToken,
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
