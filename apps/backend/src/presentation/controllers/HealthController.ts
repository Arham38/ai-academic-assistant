import { Request, Response } from 'express';
import { getDatabaseState } from '../../infrastructure/database/mongodb/connection';

export class HealthController {
  public getHealth = async (_req: Request, res: Response): Promise<void> => {
    const dbState = await getDatabaseState();
    const isDbHealthy = dbState.status === 'connected';

    const statusCode = isDbHealthy ? 200 : 503;

    res.status(statusCode).json({
      status: isDbHealthy ? 'success' : 'degraded',
      gateway: 'operational',
      database: {
        status: dbState.status,
        readyState: dbState.readyState,
        latency_ms: dbState.latency_ms ?? null,
      },
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  };
}

export const healthController = new HealthController();
