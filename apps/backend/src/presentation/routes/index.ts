import { Router } from 'express';
import { healthRouter } from './health.routes';
import { authRouter } from './auth.routes';
import { userRouter } from './user.routes';

const v1Router = Router();

// Mount sub-routers
v1Router.use('/', healthRouter);
v1Router.use('/auth', authRouter);
v1Router.use('/users', userRouter);

export { v1Router };
