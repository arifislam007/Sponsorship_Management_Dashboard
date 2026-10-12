import pkg from 'pg';
const { Pool } = pkg;
import { config } from './config.js';

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Database query error', { text, error });
    throw error;
  }
}

export async function ensureSchema() {
  const schemaPath = './sql/schema.sql';
  const fs = await import('fs');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  try {
    await pool.query(schema);
    console.log('✓ NPO schema initialized successfully');
  } catch (err) {
    console.error('Error initializing schema:', err.message);
    throw err;
  }
}

export default pool;
