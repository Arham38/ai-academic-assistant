import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetUserProfileUseCase } from '../../src/application/use-cases/users/GetUserProfileUseCase';
import { IUserRepository } from '../../src/domain/repositories/IUserRepository';
import { User, SystemRole } from '../../src/domain/entities/User';
import { UnauthorizedError, NotFoundError, ForbiddenError } from '../../src/domain/errors/AppError';

describe('GetUserProfileUseCase Unit Tests', () => {
  let mockUserRepository: IUserRepository;
  let useCase: GetUserProfileUseCase;

  beforeEach(() => {
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

    useCase = new GetUserProfileUseCase(mockUserRepository);
  });

  it('should return user profile successfully for an active user', async () => {
    const user = new User({
      id: 'usr_marie_curie',
      tenantId: 'default',
      email: 'marie.curie@sorbonne.fr',
      firstName: 'Marie',
      lastName: 'Curie',
      role: SystemRole.RESEARCHER,
      status: 'ACTIVE',
    });

    vi.mocked(mockUserRepository.findById).mockResolvedValue(user);

    const result = await useCase.execute({ userId: 'usr_marie_curie' });

    expect(mockUserRepository.findById).toHaveBeenCalledWith('usr_marie_curie');
    expect(result).toEqual({
      id: 'usr_marie_curie',
      email: 'marie.curie@sorbonne.fr',
      firstName: 'Marie',
      lastName: 'Curie',
      role: SystemRole.RESEARCHER,
      status: 'ACTIVE',
      createdAt: user.createdAt.toISOString(),
    });
  });

  it('should throw UnauthorizedError when userId is empty', async () => {
    await expect(useCase.execute({ userId: '' })).rejects.toThrow(UnauthorizedError);
  });

  it('should throw NotFoundError when user does not exist', async () => {
    vi.mocked(mockUserRepository.findById).mockResolvedValue(null);

    await expect(useCase.execute({ userId: 'non_existent_id' })).rejects.toThrow(NotFoundError);
  });

  it('should throw ForbiddenError when user account is suspended', async () => {
    const user = new User({
      id: 'usr_suspended',
      tenantId: 'default',
      email: 'suspended@sorbonne.fr',
      firstName: 'Suspended',
      lastName: 'Scholar',
      role: SystemRole.STUDENT,
      status: 'SUSPENDED',
    });

    vi.mocked(mockUserRepository.findById).mockResolvedValue(user);

    await expect(useCase.execute({ userId: 'usr_suspended' })).rejects.toThrow(ForbiddenError);
  });
});
