import { Router } from 'express';
import { healthRouter } from './health.routes';
import { authRouter } from './auth.routes';

const v1Router = Router();

// Mount sub-routers
v1Router.use('/', healthRouter);
v1Router.use('/auth', authRouter);

export { v1Router };
