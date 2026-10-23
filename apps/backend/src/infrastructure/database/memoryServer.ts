import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { logger } from '../logging/logger';

class MemoryServerManager {
  private mongoServer: MongoMemoryServer | null = null;

  public async start(): Promise<string> {
    if (!this.mongoServer) {
      this.mongoServer = await MongoMemoryServer.create();
      const uri = this.mongoServer.getUri();
      logger.info(`[MemoryServer] In-memory MongoDB instance started at ${uri}`);
      await mongoose.connect(uri);
      return uri;
    }
    return this.mongoServer.getUri();
  }

  public async stop(): Promise<void> {
    if (this.mongoServer) {
      await mongoose.disconnect();
      await this.mongoServer.stop();
      this.mongoServer = null;
      logger.info('[MemoryServer] In-memory MongoDB instance stopped.');
    }
  }

  public async clear(): Promise<void> {
    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
      const collections = await mongoose.connection.db.collections();
      for (const collection of collections) {
        await collection.deleteMany({});
      }
    }
  }
}

export const memoryServerManager = new MemoryServerManager();
export const startMemoryDB = () => memoryServerManager.start();
export const stopMemoryDB = () => memoryServerManager.stop();
export const clearMemoryDB = () => memoryServerManager.clear();
