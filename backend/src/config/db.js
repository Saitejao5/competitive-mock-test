import mongoose from 'mongoose';

let connectionPromise = null;
export const MONGO_DB_NAME = process.env.MONGO_DB_NAME || 'exam-engine';

export function isMongoReady() {
  return mongoose.connection.readyState === 1;
}

export async function connectMongo() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.log('\x1b[33m[MONGO]\x1b[0m MONGO_URI not set. Batch DB disabled; using legacy generation fallback.');
    return false;
  }

  if (isMongoReady()) return true;
  if (connectionPromise) return connectionPromise;

  connectionPromise = mongoose.connect(uri, {
    dbName: MONGO_DB_NAME,
    serverSelectionTimeoutMS: parseInt(process.env.MONGO_TIMEOUT_MS, 10) || 5000
  }).then(() => {
    console.log(`\x1b[32m[MONGO]\x1b[0m Connected: ${mongoose.connection.name}`);
    return true;
  }).catch((err) => {
    console.error(`\x1b[31m[MONGO]\x1b[0m Connection failed: ${err.message}`);
    connectionPromise = null;
    return false;
  });

  return connectionPromise;
}
