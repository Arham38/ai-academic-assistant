import { Request, Response } from 'express';
import { GetUserProfileUseCase } from '../../application/use-cases/users/GetUserProfileUseCase';
import { UpdateUserProfileUseCase } from '../../application/use-cases/users/UpdateUserProfileUseCase';
import { UpdateUserPasswordUseCase } from '../../application/use-cases/users/UpdateUserPasswordUseCase';
import { asyncHandler } from '../middleware/asyncHandler';
import { UnauthorizedError } from '../../domain/errors/AppError';

export class UserController {
  constructor(
    private readonly getUserProfileUseCase: GetUserProfileUseCase,
    private readonly updateUserProfileUseCase: UpdateUserProfileUseCase,
    private readonly updateUserPasswordUseCase: UpdateUserPasswordUseCase,
  ) {}

  public getProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError('Authentication required. Please log in.');
    }

    const user = await this.getUserProfileUseCase.execute({ userId });

    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    });
  });

  public updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError('Authentication required. Please log in.');
    }

    const updatedUser = await this.updateUserProfileUseCase.execute({
      userId,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
    });

    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser,
      },
    });
  });

  public updatePassword = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError('Authentication required. Please log in.');
    }

    const result = await this.updateUserPasswordUseCase.execute({
      userId,
      currentPassword: req.body.currentPassword,
      newPassword: req.body.newPassword,
    });

    res.status(200).json({
      status: 'success',
      message: result.message,
    });
  });
}
