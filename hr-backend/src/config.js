import dotenv from 'dotenv';
dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required.');
}

export const config = {
  port: Number(process.env.PORT || 5004),
  jwtSecret: process.env.JWT_SECRET,
  db: {
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT || 5432),
    user:     process.env.DB_USER     || 'sombhabona_user',
    password: process.env.DB_PASSWORD || 'sombhabona_pass',
    database: process.env.DB_NAME     || 'sombhabona',
  },
};
