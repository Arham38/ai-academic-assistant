import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { UnauthorizedError, NotFoundError, ForbiddenError } from '../../../domain/errors/AppError';
import { GetUserProfileDTO, UserProfileResponseDTO } from '../../dtos/UserDTOs';

export class GetUserProfileUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  public async execute(dto: GetUserProfileDTO): Promise<UserProfileResponseDTO> {
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

    return {
      id: user.id!,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
