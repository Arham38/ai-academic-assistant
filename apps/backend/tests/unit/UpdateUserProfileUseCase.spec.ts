import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateUserProfileUseCase } from '../../src/application/use-cases/users/UpdateUserProfileUseCase';
import { IUserRepository } from '../../src/domain/repositories/IUserRepository';
import { User, SystemRole } from '../../src/domain/entities/User';
import { UnauthorizedError, NotFoundError, ForbiddenError } from '../../src/domain/errors/AppError';

describe('UpdateUserProfileUseCase Unit Tests', () => {
  let mockUserRepository: IUserRepository;
  let useCase: UpdateUserProfileUseCase;

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

    useCase = new UpdateUserProfileUseCase(mockUserRepository);
  });

  it('should update user first and last name successfully', async () => {
    const existingUser = new User({
      id: 'usr_1',
      tenantId: 'default',
      email: 'marie@curie.org',
      firstName: 'Marie',
      lastName: 'Sklodowska',
      role: SystemRole.RESEARCHER,
      status: 'ACTIVE',
    });

    const updatedUser = new User({
      id: 'usr_1',
      tenantId: 'default',
      email: 'marie@curie.org',
      firstName: 'Madame',
      lastName: 'Curie',
      role: SystemRole.RESEARCHER,
      status: 'ACTIVE',
    });

    vi.mocked(mockUserRepository.findById).mockResolvedValue(existingUser);
    vi.mocked(mockUserRepository.update).mockResolvedValue(updatedUser);

    const result = await useCase.execute({
      userId: 'usr_1',
      firstName: 'Madame',
      lastName: 'Curie',
    });

    expect(mockUserRepository.update).toHaveBeenCalled();
    expect(result.firstName).toBe('Madame');
    expect(result.lastName).toBe('Curie');
  });

  it('should allow partial update of only firstName', async () => {
    const existingUser = new User({
      id: 'usr_1',
      tenantId: 'default',
      email: 'marie@curie.org',
      firstName: 'Marie',
      lastName: 'Curie',
      role: SystemRole.RESEARCHER,
      status: 'ACTIVE',
    });

    const updatedUser = new User({
      id: 'usr_1',
      tenantId: 'default',
      email: 'marie@curie.org',
      firstName: 'Maria',
      lastName: 'Curie',
      role: SystemRole.RESEARCHER,
      status: 'ACTIVE',
    });

    vi.mocked(mockUserRepository.findById).mockResolvedValue(existingUser);
    vi.mocked(mockUserRepository.update).mockResolvedValue(updatedUser);

    const result = await useCase.execute({
      userId: 'usr_1',
      firstName: 'Maria',
    });

    expect(result.firstName).toBe('Maria');
    expect(result.lastName).toBe('Curie');
  });

  it('should throw UnauthorizedError when userId is empty', async () => {
    await expect(useCase.execute({ userId: '', firstName: 'New' })).rejects.toThrow(
      UnauthorizedError,
    );
  });

  it('should throw NotFoundError when user does not exist', async () => {
    vi.mocked(mockUserRepository.findById).mockResolvedValue(null);

    await expect(useCase.execute({ userId: 'unknown_id', firstName: 'New' })).rejects.toThrow(
      NotFoundError,
    );
  });

  it('should throw ForbiddenError when user account is suspended', async () => {
    const suspendedUser = new User({
      id: 'usr_suspended',
      tenantId: 'default',
      email: 'suspended@sorbonne.fr',
      firstName: 'Suspended',
      lastName: 'User',
      role: SystemRole.STUDENT,
      status: 'SUSPENDED',
    });

    vi.mocked(mockUserRepository.findById).mockResolvedValue(suspendedUser);

    await expect(useCase.execute({ userId: 'usr_suspended', firstName: 'New' })).rejects.toThrow(
      ForbiddenError,
    );
  });
});
