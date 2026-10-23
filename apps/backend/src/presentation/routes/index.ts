import { Router } from 'express';
import { healthRouter } from './health.routes';

const v1Router = Router();

// Mount sub-routers
v1Router.use('/', healthRouter);

export { v1Router };
