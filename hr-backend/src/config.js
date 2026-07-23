import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: Number(process.env.PORT || 5004),
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  db: {
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT || 5432),
    user:     process.env.DB_USER     || 'sombhabona_user',
    password: process.env.DB_PASSWORD || 'sombhabona_pass',
    database: process.env.DB_NAME     || 'sombhabona',
  },
};
