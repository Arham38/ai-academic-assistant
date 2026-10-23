import { Request, Response } from 'express';
import { RegisterUserUseCase } from '../../application/use-cases/auth/RegisterUserUseCase';
import { LoginUserUseCase } from '../../application/use-cases/auth/LoginUserUseCase';
import { RefreshSessionUseCase } from '../../application/use-cases/auth/RefreshSessionUseCase';
import { LogoutUseCase } from '../../application/use-cases/auth/LogoutUseCase';
import { asyncHandler } from '../middleware/asyncHandler';
import { env } from '../../config/env';
import { UnauthorizedError } from '../../domain/errors/AppError';

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Controller handling authentication, session refresh, and logout lifecycles.
 * Manages secure HttpOnly, SameSite cookie transmission for refresh tokens.
 */
export class AuthController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly loginUserUseCase: LoginUserUseCase,
    private readonly refreshSessionUseCase: RefreshSessionUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  private getCookieOptions() {
    return {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
      path: '/api/v1/auth',
    };
  }

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
    const result = await this.loginUserUseCase.execute(req.body);

    // Set HttpOnly refresh token cookie (zero exposure to JS runtime)
    res.cookie(REFRESH_COOKIE_NAME, result.rawRefreshToken, this.getCookieOptions());

    res.status(200).json({
      status: 'success',
      data: {
        accessToken: result.accessToken,
        user: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
        },
      },
    });
  });

  public refresh = asyncHandler(async (req: Request, res: Response) => {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!rawRefreshToken) {
      throw new UnauthorizedError('Authentication required. Refresh token cookie missing.');
    }

    const result = await this.refreshSessionUseCase.execute({ rawRefreshToken });

    // Rotate the refresh token cookie
    res.cookie(REFRESH_COOKIE_NAME, result.rawRefreshToken, this.getCookieOptions());

    res.status(200).json({
      status: 'success',
      data: {
        accessToken: result.accessToken,
      },
    });
  });

  public logout = asyncHandler(async (req: Request, res: Response) => {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    await this.logoutUseCase.execute({ rawRefreshToken });

    // Expire and clear the browser cookie
    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth',
    });

    res.status(200).json({
      status: 'success',
      message: 'Successfully logged out',
    });
  });
}
