import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { SystemRole } from '../../domain/types/Roles';
import { UserModel } from '../../infrastructure/database/mongodb/models/UserModel';

const adminRouter = Router();

// Router-level protection: All nested endpoints require valid ADMIN privileges
adminRouter.use(requireAuth, requireRole([SystemRole.ADMIN]));

/**
 * GET /api/v1/admin/status
 * Administrative health and operational status check.
 */
adminRouter.get('/status', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    data: {
      admin: true,
      systemStatus: 'operational',
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * GET /api/v1/admin/users
 * Administrative user listing endpoint.
 */
adminRouter.get('/users', async (_req: Request, res: Response) => {
  const users = await UserModel.find({ isDeleted: false })
    .select('email firstName lastName role status createdAt')
    .limit(50)
    .lean()
    .exec();

  res.status(200).json({
    status: 'success',
    data: {
      users: users.map((u) => ({
        id: u._id.toString(),
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
      })),
    },
  });
});

export { adminRouter };
