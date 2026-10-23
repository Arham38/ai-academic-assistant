import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IHashProvider } from '../../../domain/providers/IHashProvider';
import { UnauthorizedError, ForbiddenError } from '../../../domain/errors/AppError';
import { LoginUserDTO, LoginUserResponseDTO } from '../../dtos/AuthDTOs';

// Valid bcrypt hash used to normalize execution time when user is not found
const DUMMY_BCRYPT_HASH = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj40c74Xf9ye';

/**
 * Encapsulates the business rules for authenticating user credentials.
 * Implements constant-time hash comparison to mitigate user enumeration timing attacks.
 */
export class LoginUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hashProvider: IHashProvider,
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

    // 6. Return sanitized user profile for authentication response
    return {
      id: user.id!,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }
}
