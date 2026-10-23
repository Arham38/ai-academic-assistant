import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth';

const userRouter = Router();

/**
 * GET /api/v1/users/me
 * Protected endpoint returning profile of the currently authenticated user.
 */
userRouter.get('/me', requireAuth, (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    data: {
      user: {
        id: req.user?.id,
        email: req.user?.email,
      },
    },
  });
});

export { userRouter };
