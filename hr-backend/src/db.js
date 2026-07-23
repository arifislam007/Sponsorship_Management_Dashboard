import pkg from 'pg';
const { Pool } = pkg;
import { readFileSync, existsSync, readdirSync } from 'fs';
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
  console.log('✓ HR schema initialized');

  const migrationsDir = './sql/migrations';
  if (existsSync(migrationsDir)) {
    const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    for (const file of files) {
      const sql = readFileSync(`${migrationsDir}/${file}`, 'utf-8');
      if (sql.trim()) {
        await pool.query(sql);
        console.log(`✓ Applied migration: ${file}`);
      }
    }
  }
}

export default pool;
