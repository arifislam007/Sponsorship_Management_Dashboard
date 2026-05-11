import pkg from 'pg';
import dotenv from 'dotenv';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export const query = (text, params) => pool.query(text, params);
export const getClient = () => pool.connect();

export async function ensureSchema() {
  try {
    const schemaPath = path.resolve(__dirname, '../sql/schema.sql');
    const schemaSql = await readFile(schemaPath, 'utf8');
    await pool.query(schemaSql);
    console.log('✓ School Operations schema initialized successfully');
  } catch (err) {
    console.error('Error initializing schema:', err.message);
    throw err;
  }
}

export default pool;
