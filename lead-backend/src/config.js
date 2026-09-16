import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: Number(process.env.PORT || 5006),
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  googleServiceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '',
  openwa: {
    apiUrl:        process.env.OPENWA_API_URL        || '',
    apiKey:        process.env.OPENWA_API_KEY        || '',
    sessionId:     process.env.OPENWA_SESSION_ID      || '',
    webhookSecret: process.env.OPENWA_WEBHOOK_SECRET  || '',
  },
  db: {
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT || 5432),
    user:     process.env.DB_USER     || 'sombhabona_user',
    password: process.env.DB_PASSWORD || 'sombhabona_pass',
    database: process.env.DB_NAME     || 'sombhabona',
  },
};
