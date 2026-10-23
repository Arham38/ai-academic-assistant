import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IHashProvider } from '../../../domain/providers/IHashProvider';
import { User, SystemRole } from '../../../domain/entities/User';
import { ConflictError } from '../../../domain/errors/AppError';
import { RegisterUserDTO, UserResponseDTO } from '../../dtos/AuthDTOs';

/**
 * Encapsulates the business rules for registering a new user.
 * Decoupled from HTTP frameworks, database ORMs, and hashing libraries.
 */
export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hashProvider: IHashProvider,
  ) {}

  public async execute(dto: RegisterUserDTO): Promise<UserResponseDTO> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    // 1. Invariant: User email must be unique across the tenant
    const existingUser = await this.userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new ConflictError('A user with this email address already exists.');
    }

    // 2. Hash plaintext password via domain port
    const passwordHash = await this.hashProvider.hash(dto.password);

    // 3. Construct domain entity with default STUDENT role
    const user = new User({
      tenantId: dto.tenantId?.trim() || 'default',
      email: normalizedEmail,
      passwordHash,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      role: SystemRole.STUDENT,
    });

    // 4. Persist to repository
    const savedUser = await this.userRepository.create(user);

    // 5. Return sanitized response DTO (zero sensitive fields)
    return {
      id: savedUser.id!,
      email: savedUser.email,
      firstName: savedUser.firstName,
      lastName: savedUser.lastName,
      role: savedUser.role,
    };
  }
}
