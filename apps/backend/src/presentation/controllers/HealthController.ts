import { Request, Response } from 'express';

export class HealthController {
  public getHealth = (_req: Request, res: Response): void => {
    res.status(200).json({
      status: 'success',
      message: 'API Gateway is operational',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  };
}

export const healthController = new HealthController();
