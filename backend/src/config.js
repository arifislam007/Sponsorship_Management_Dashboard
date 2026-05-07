import dotenv from 'dotenv';

dotenv.config();

const apiPrefix = process.env.API_PREFIX || '/api/v1';
const port = Number(process.env.PORT || 8000);
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required.');
}

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export const config = {
  apiPrefix,
  port,
  databaseUrl,
  allowedOrigins,
  jwtSecret,
};
