import { Router } from 'express';
import { healthRouter } from './health.routes';
import { authRouter } from './auth.routes';
import { userRouter } from './user.routes';
import { adminRouter } from './admin.routes';
import { documentRouter } from './document.routes';

const v1Router = Router();

// Mount sub-routers
v1Router.use('/', healthRouter);
v1Router.use('/auth', authRouter);
v1Router.use('/users', userRouter);
v1Router.use('/admin', adminRouter);
v1Router.use('/documents', documentRouter);

export { v1Router };
