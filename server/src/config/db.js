import mongoose from 'mongoose';
import { env } from './env.js';
import logger from '../utils/logger.js';

let memoryServer = null;

/**
 * Start an in-memory MongoDB server (used when MONGODB_URI is empty and
 * AUTO_MONGODB_MEMORY is true, or when explicitly requested for tests).
 */
export async function startMemoryMongo() {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  memoryServer = await MongoMemoryServer.create();
  return memoryServer.getUri();
}

/**
 * Connect to MongoDB. Accepts an explicit uri (used by tests / memory server).
 */
export async function connectDB(uri = null) {
  let connectionUri = uri || env.MONGODB_URI;

  // No real server configured -> spin up an in-memory one for zero-setup dev.
  if (!uri && env.AUTO_MONGODB_MEMORY) {
    logger.info('Auto-starting in-memory MongoDB (AUTO_MONGODB_MEMORY=true)…');
    connectionUri = await startMemoryMongo();
  }

  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(connectionUri, { serverSelectionTimeoutMS: 8000 });
    logger.info({ uri: mongoose.connection.host }, 'MongoDB connected');
    return mongoose.connection;
  } catch (err) {
    // Fall back to in-memory MongoDB when explicitly enabled so a broken or
    // unreachable Atlas/local URI never takes the whole backend down in dev.
    if (!uri && env.AUTO_MONGODB_MEMORY) {
      logger.warn({ err: err.message }, 'MongoDB connection failed, falling back to in-memory MongoDB');
      try {
        connectionUri = await startMemoryMongo();
        await mongoose.connect(connectionUri, { serverSelectionTimeoutMS: 8000 });
        logger.info({ uri: mongoose.connection.host }, 'MongoDB connected (in-memory fallback)');
        return mongoose.connection;
      } catch (fallbackErr) {
        logger.error({ err: fallbackErr.message }, 'In-memory MongoDB fallback failed');
        throw fallbackErr;
      }
    }
    logger.error({ err: err.message }, 'MongoDB connection failed');
    throw err;
  }
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

export { mongoose };
export default connectDB;
