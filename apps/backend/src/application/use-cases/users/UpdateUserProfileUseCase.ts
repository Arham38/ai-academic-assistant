import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { UnauthorizedError, NotFoundError, ForbiddenError } from '../../../domain/errors/AppError';
import { UpdateUserProfileDTO, UserProfileResponseDTO } from '../../dtos/UserDTOs';

export class UpdateUserProfileUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  public async execute(dto: UpdateUserProfileDTO): Promise<UserProfileResponseDTO> {
    if (!dto.userId?.trim()) {
      throw new UnauthorizedError('Authentication required. User ID missing.');
    }

    const user = await this.userRepository.findById(dto.userId);
    if (!user || user.isDeleted) {
      throw new NotFoundError('User profile not found.');
    }

    if (user.status === 'SUSPENDED') {
      throw new ForbiddenError('Account is suspended. Please contact institutional support.');
    }

    // Apply domain modifications
    user.updateProfile({
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    const updated = await this.userRepository.update(user.id!, user);
    if (!updated) {
      throw new NotFoundError('Failed to persist user profile updates.');
    }

    return {
      id: updated.id!,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      role: updated.role,
      status: updated.status,
      createdAt: updated.createdAt.toISOString(),
    };
  }
}
