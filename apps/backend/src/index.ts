import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { UserDTO } from '@academic-assistant/shared-types';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  const dummyUser: Partial<UserDTO> = {
    role: 'STUDENT',
    status: 'ACTIVE',
  };
  res.json({
    status: 'healthy',
    service: 'ai-academic-assistant-backend',
    timestamp: new Date().toISOString(),
    dummyUser,
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.info(`Backend Gateway running on port ${PORT}`);
  });
}

export default app;
