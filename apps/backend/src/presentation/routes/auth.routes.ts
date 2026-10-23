import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { RegisterUserUseCase } from '../../application/use-cases/auth/RegisterUserUseCase';
import { LoginUserUseCase } from '../../application/use-cases/auth/LoginUserUseCase';
import { RefreshSessionUseCase } from '../../application/use-cases/auth/RefreshSessionUseCase';
import { LogoutUseCase } from '../../application/use-cases/auth/LogoutUseCase';
import { MongoUserRepository } from '../../infrastructure/database/mongodb/MongoUserRepository';
import { MongoRefreshTokenRepository } from '../../infrastructure/database/mongodb/MongoRefreshTokenRepository';
import { UserModel } from '../../infrastructure/database/mongodb/models/UserModel';
import { RefreshTokenModel } from '../../infrastructure/database/mongodb/models/RefreshTokenModel';
import { BcryptHashProvider } from '../../infrastructure/security/BcryptHashProvider';
import { JwtTokenProvider } from '../../infrastructure/security/JwtTokenProvider';
import { OpaqueTokenProvider } from '../../infrastructure/security/OpaqueTokenProvider';
import { env } from '../../config/env';
import { validateRequest } from '../middleware/validateRequest';
import { RegisterSchema, LoginSchema } from '../validators/auth.validator';

// Factory instantiation for production route mounting
const userRepository = new MongoUserRepository(UserModel);
const refreshTokenRepository = new MongoRefreshTokenRepository(RefreshTokenModel);
const hashProvider = new BcryptHashProvider(env.BCRYPT_SALT_ROUNDS);
const tokenProvider = new JwtTokenProvider(env.JWT_SECRET, env.JWT_EXPIRES_IN);
const opaqueTokenProvider = new OpaqueTokenProvider();

const registerUserUseCase = new RegisterUserUseCase(userRepository, hashProvider);
const loginUserUseCase = new LoginUserUseCase(
  userRepository,
  hashProvider,
  tokenProvider,
  refreshTokenRepository,
  opaqueTokenProvider,
);
const refreshSessionUseCase = new RefreshSessionUseCase(
  refreshTokenRepository,
  userRepository,
  tokenProvider,
  opaqueTokenProvider,
);
const logoutUseCase = new LogoutUseCase(refreshTokenRepository, opaqueTokenProvider);

const authController = new AuthController(
  registerUserUseCase,
  loginUserUseCase,
  refreshSessionUseCase,
  logoutUseCase,
);

const authRouter = Router();

authRouter.post('/register', validateRequest(RegisterSchema), authController.register);
authRouter.post('/login', validateRequest(LoginSchema), authController.login);
authRouter.post('/refresh', authController.refresh);
authRouter.post('/logout', authController.logout);

export { authRouter };
