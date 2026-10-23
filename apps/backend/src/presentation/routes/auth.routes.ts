import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { RegisterUserUseCase } from '../../application/use-cases/auth/RegisterUserUseCase';
import { LoginUserUseCase } from '../../application/use-cases/auth/LoginUserUseCase';
import { MongoUserRepository } from '../../infrastructure/database/mongodb/MongoUserRepository';
import { UserModel } from '../../infrastructure/database/mongodb/models/UserModel';
import { BcryptHashProvider } from '../../infrastructure/security/BcryptHashProvider';
import { env } from '../../config/env';
import { validateRequest } from '../middleware/validateRequest';
import { RegisterSchema, LoginSchema } from '../validators/auth.validator';

// Factory instantiation for production route mounting
const userRepository = new MongoUserRepository(UserModel);
const hashProvider = new BcryptHashProvider(env.BCRYPT_SALT_ROUNDS);
const registerUserUseCase = new RegisterUserUseCase(userRepository, hashProvider);
const loginUserUseCase = new LoginUserUseCase(userRepository, hashProvider);
const authController = new AuthController(registerUserUseCase, loginUserUseCase);

const authRouter = Router();

authRouter.post('/register', validateRequest(RegisterSchema), authController.register);
authRouter.post('/login', validateRequest(LoginSchema), authController.login);

export { authRouter };
