import mongoose from 'mongoose';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Connect to MongoDB with retry logic.
 * Retries every 5s on failure, up to a maximum of 5 attempts.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('[DB] MONGODB_URI is not defined in environment variables');
    process.exit(1);
  }

  // Surface connection drops after the initial connect succeeds.
  mongoose.connection.on('disconnected', () => {
    console.warn('[DB] MongoDB disconnected');
  });
  mongoose.connection.on('reconnected', () => {
    console.info('[DB] MongoDB reconnected');
  });
  mongoose.connection.on('error', (err) => {
    console.error(`[DB] MongoDB connection error: ${err.message}`);
  });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
      });
      console.info(
        `[DB] MongoDB connected successfully: ${conn.connection.host}/${conn.connection.name}`
      );
      return conn;
    } catch (err) {
      console.error(
        `[DB] Connection attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`
      );

      if (attempt === MAX_RETRIES) {
        console.error(
          `[DB] Could not connect to MongoDB after ${MAX_RETRIES} attempts. Exiting.`
        );
        process.exit(1);
      }

      console.info(`[DB] Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await wait(RETRY_DELAY_MS);
    }
  }
};

export default connectDB;
