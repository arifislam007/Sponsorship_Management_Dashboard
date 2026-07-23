import pkg from 'pg';
const { Pool } = pkg;
import { readFileSync } from 'fs';
import { config } from './config.js';

const pool = new Pool(config.db);

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err.message);
});

export async function query(text, params) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    console.error('[db] Query error:', err.message, '\nSQL:', text);
    throw err;
  }
}

export async function ensureSchema() {
  const schema = readFileSync('./sql/schema.sql', 'utf-8');
  await pool.query(schema);
  console.log('✓ School schema initialized');
}

export default pool;
