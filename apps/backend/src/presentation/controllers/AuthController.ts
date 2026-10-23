import { Request, Response } from 'express';
import { RegisterUserUseCase } from '../../application/use-cases/auth/RegisterUserUseCase';
import { LoginUserUseCase } from '../../application/use-cases/auth/LoginUserUseCase';
import { asyncHandler } from '../middleware/asyncHandler';

/**
 * Controller handling incoming HTTP requests for authentication.
 * Maps validated request payloads into domain use cases and returns sanitized response DTOs.
 */
export class AuthController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly loginUserUseCase: LoginUserUseCase,
  ) {}

  public register = asyncHandler(async (req: Request, res: Response) => {
    const user = await this.registerUserUseCase.execute(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      },
    });
  });

  public login = asyncHandler(async (req: Request, res: Response) => {
    const user = await this.loginUserUseCase.execute(req.body);

    res.status(200).json({
      status: 'success',
      message: 'Login successful. JWTs pending Phase 11 implementation.',
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      },
    });
  });
}
