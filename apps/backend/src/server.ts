import app from './app';
import { env } from './config/env';
import { logger } from './infrastructure/logging/logger';
import { connectDB, disconnectDB } from './infrastructure/database/mongodb/connection';
import { Server } from 'http';

let server: Server;

const startServer = async () => {
  try {
    // 1. Establish Database Connection (Must connect before serving traffic)
    logger.info('[Bootstrap] Connecting to primary MongoDB datastore...');
    await connectDB();

    // 2. Start HTTP Server Listener
    server = app.listen(env.PORT, () => {
      logger.info(`[Server] API Gateway running in ${env.NODE_ENV} mode on port ${env.PORT}`);
      logger.info(`[Server] Health check available at: http://localhost:${env.PORT}/api/v1/health`);
    });
  } catch (err) {
    logger.fatal(
      { err },
      '[Bootstrap] Fatal failure during application startup. Terminating process.',
    );
    process.exit(1);
  }
};

// Graceful Shutdown Logic
const handleShutdown = async (signal: string) => {
  logger.warn(`[Server] ${signal} signal received. Initiating graceful shutdown...`);

  // 1. Close HTTP Listener (stop accepting new requests)
  if (server) {
    server.close(async (err) => {
      if (err) {
        logger.error({ err }, '[Server] Error encountered during HTTP server shutdown');
        process.exit(1);
      }
      logger.info('[Server] HTTP listener closed cleanly.');

      // 2. Disconnect MongoDB Connection Pool
      try {
        await disconnectDB();
        logger.info('[Server] Database pool drained. Exiting process safely.');
        process.exit(0);
      } catch (dbErr) {
        logger.error({ err: dbErr }, '[Server] Error closing MongoDB connection during shutdown');
        process.exit(1);
      }
    });
  } else {
    await disconnectDB();
    process.exit(0);
  }

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

// Boot the application
startServer();

export { server };
