import mongoose, { ConnectOptions } from 'mongoose';
import { env } from '../../../config/env';
import { logger } from '../../logging/logger';

export interface DatabaseState {
  status: 'disconnected' | 'connected' | 'connecting' | 'disconnecting' | 'uninitialized';
  readyState: number;
  latency_ms?: number;
}

class MongoDBConnectionManager {
  private static instance: MongoDBConnectionManager;
  private isConnecting = false;

  private constructor() {
    this.registerEventListeners();
  }

  public static getInstance(): MongoDBConnectionManager {
    if (!MongoDBConnectionManager.instance) {
      MongoDBConnectionManager.instance = new MongoDBConnectionManager();
    }
    return MongoDBConnectionManager.instance;
  }

  private registerEventListeners(): void {
    mongoose.connection.on('connected', () => {
      logger.info('[MongoDB] Connected securely to cluster');
    });

    mongoose.connection.on('error', (err) => {
      logger.error({ err }, '[MongoDB] Connection error trapped');
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('[MongoDB] Connection dropped / disconnected from cluster');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('[MongoDB] Connection restored / reconnected to cluster');
    });
  }

  public async connectDB(uriOverride?: string): Promise<typeof mongoose> {
    const mongoUri = uriOverride || env.MONGODB_URI;

    if (mongoose.connection.readyState === 1) {
      logger.debug('[MongoDB] Connection already established. Reusing existing pool.');
      return mongoose;
    }

    if (this.isConnecting) {
      logger.debug('[MongoDB] Connection handshake in flight. Awaiting completion.');
      await new Promise((resolve) => setTimeout(resolve, 200));
      return mongoose;
    }

    this.isConnecting = true;

    try {
      const options: ConnectOptions = {
        maxPoolSize: 50,
        minPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        autoIndex: env.NODE_ENV !== 'production',
        family: 4, // Force IPv4 to prevent IPv6 ::1 localhost delay
      };

      const conn = await mongoose.connect(mongoUri, options);
      return conn;
    } catch (err) {
      logger.fatal({ err }, `[MongoDB] Failed to connect to ${mongoUri}`);
      throw err;
    } finally {
      this.isConnecting = false;
    }
  }

  public async disconnectDB(): Promise<void> {
    if (mongoose.connection.readyState !== 0) {
      logger.info('[MongoDB] Closing database connection pool...');
      await mongoose.disconnect();
      logger.info('[MongoDB] Connection closed cleanly.');
    }
  }

  public async getDatabaseState(): Promise<DatabaseState> {
    const stateMap: Record<number, DatabaseState['status']> = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    const readyState = mongoose.connection.readyState;
    const status = stateMap[readyState] || 'uninitialized';

    let latency_ms: number | undefined;

    if (readyState === 1 && mongoose.connection.db) {
      try {
        const start = Date.now();
        await mongoose.connection.db.admin().ping();
        latency_ms = Date.now() - start;
      } catch {
        latency_ms = undefined;
      }
    }

    return {
      status,
      readyState,
      latency_ms,
    };
  }
}

export const dbManager = MongoDBConnectionManager.getInstance();
export const connectDB = (uri?: string) => dbManager.connectDB(uri);
export const disconnectDB = () => dbManager.disconnectDB();
export const getDatabaseState = () => dbManager.getDatabaseState();
