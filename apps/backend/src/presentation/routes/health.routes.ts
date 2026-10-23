import { Router } from 'express';
import { healthController } from '../controllers/HealthController';

const healthRouter = Router();

healthRouter.get('/health', healthController.getHealth);

export { healthRouter };
