import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IHashProvider } from '../../../domain/providers/IHashProvider';
import { UnauthorizedError, NotFoundError, ForbiddenError } from '../../../domain/errors/AppError';
import { UpdateUserPasswordDTO, UpdatePasswordResponseDTO } from '../../dtos/UserDTOs';

// Constant-time execution normalization dummy hash
const DUMMY_BCRYPT_HASH = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj40c74Xf9ye';

export class UpdateUserPasswordUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hashProvider: IHashProvider,
  ) {}

  public async execute(dto: UpdateUserPasswordDTO): Promise<UpdatePasswordResponseDTO> {
    if (!dto.userId?.trim()) {
      throw new UnauthorizedError('Authentication required. User ID missing.');
    }

    // 1. Fetch user by id requesting hidden passwordHash
    const user = await this.userRepository.findById(dto.userId, false, true);

    // 2. Timing attack mitigation: if user does not exist or has no passwordHash, run dummy compare
    if (!user || !user.passwordHash) {
      await this.hashProvider.compare(dto.currentPassword, DUMMY_BCRYPT_HASH);
      throw new UnauthorizedError('Invalid current password.');
    }

    if (user.status === 'SUSPENDED') {
      throw new ForbiddenError('Account is suspended. Please contact institutional support.');
    }

    // 3. Verify current password
    const isCurrentPasswordValid = await this.hashProvider.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedError('Invalid current password.');
    }

    // 4. Hash new password
    const newPasswordHash = await this.hashProvider.hash(dto.newPassword);

    // 5. Update password and increment tokenVersion to invalidate existing JWT tokens
    user.updatePassword(newPasswordHash);

    const updated = await this.userRepository.update(user.id!, user);
    if (!updated) {
      throw new NotFoundError('Failed to persist updated password.');
    }

    return {
      status: 'success',
      message: 'Password updated securely. Other sessions invalidated.',
    };
  }
}
