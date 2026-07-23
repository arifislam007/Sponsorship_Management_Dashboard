import dotenv from 'dotenv';
dotenv.config();

const port = Number(process.env.PORT || 5003);
const jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

export const config = {
  port,
  jwtSecret,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'sombhabona_user',
    password: process.env.DB_PASSWORD || 'sombhabona_pass',
    database: process.env.DB_NAME || 'sombhabona',
  },
};
