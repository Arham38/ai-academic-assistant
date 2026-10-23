import app from './app';
import { env } from './config/env';
import { logger } from './infrastructure/logging/logger';
import { Server } from 'http';

const server: Server = app.listen(env.PORT, () => {
  logger.info(`[Server] API Gateway running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  logger.info(`[Server] Health check available at: http://localhost:${env.PORT}/api/v1/health`);
});

// Graceful Shutdown Logic
const handleShutdown = (signal: string) => {
  logger.warn(`[Server] ${signal} signal received. Initiating graceful shutdown...`);

  server.close((err) => {
    if (err) {
      logger.error({ err }, '[Server] Error encountered during server shutdown');
      process.exit(1);
    }
    logger.info('[Server] HTTP listener closed cleanly. Exiting process.');
    process.exit(0);
  });

  // Force shutdown if connections do not close within 10 seconds
  setTimeout(() => {
    logger.error('[Server] Graceful shutdown timeout exceeded. Forcing termination.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

process.on('uncaughtException', (err: Error) => {
  logger.fatal({ err }, '[Process] Uncaught Exception trapped');
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.fatal({ reason }, '[Process] Unhandled Rejection trapped');
  process.exit(1);
});

export { server };
