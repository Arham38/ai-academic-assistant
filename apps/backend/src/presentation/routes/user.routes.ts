import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { validateRequest } from '../middleware/validateRequest';
import { UpdateProfileSchema, UpdatePasswordSchema } from '../validators/user.validator';
import { UserController } from '../controllers/UserController';
import { GetUserProfileUseCase } from '../../application/use-cases/users/GetUserProfileUseCase';
import { UpdateUserProfileUseCase } from '../../application/use-cases/users/UpdateUserProfileUseCase';
import { UpdateUserPasswordUseCase } from '../../application/use-cases/users/UpdateUserPasswordUseCase';
import { MongoUserRepository } from '../../infrastructure/database/mongodb/MongoUserRepository';
import { UserModel } from '../../infrastructure/database/mongodb/models/UserModel';
import { BcryptHashProvider } from '../../infrastructure/security/BcryptHashProvider';
import { env } from '../../config/env';

export const createUsersRouter = (userController?: UserController): Router => {
  const router = Router();

  const controller =
    userController ??
    (() => {
      const userRepository = new MongoUserRepository(UserModel);
      const hashProvider = new BcryptHashProvider(env.BCRYPT_SALT_ROUNDS);
      const getUserProfileUseCase = new GetUserProfileUseCase(userRepository);
      const updateUserProfileUseCase = new UpdateUserProfileUseCase(userRepository);
      const updateUserPasswordUseCase = new UpdateUserPasswordUseCase(userRepository, hashProvider);
      return new UserController(
        getUserProfileUseCase,
        updateUserProfileUseCase,
        updateUserPasswordUseCase,
      );
    })();

  router.use(requireAuth);

  /**
   * GET /api/v1/users/me
   * Retrieve currently authenticated user's profile.
   */
  router.get('/me', controller.getProfile);

  /**
   * PATCH /api/v1/users/me
   * Partially update name fields with strict IDOR and privilege escalation prevention.
   */
  router.patch('/me', validateRequest(UpdateProfileSchema), controller.updateProfile);

  /**
   * PATCH /api/v1/users/me/password
   * Rotate account password, increment tokenVersion, and invalidate distributed sessions.
   */
  router.patch('/me/password', validateRequest(UpdatePasswordSchema), controller.updatePassword);

  return router;
};

export const userRouter = createUsersRouter();
