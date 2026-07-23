import pkg from 'pg';
const { Pool } = pkg;
import { readFileSync, existsSync, readdirSync } from 'fs';
import { config } from './config.js';

const pool = new Pool(config.db);

pool.on('error', (err) => {
  console.error('[db] Unexpected error on idle client:', err.message);
  process.exit(-1);
});

export async function query(text, params = []) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    console.error('[db] Query error:', err.message, '|', text.slice(0, 80));
    throw err;
  }
}

export async function ensureSchema() {
  const schema = readFileSync('./sql/schema.sql', 'utf-8');
  try {
    await pool.query(schema);
    console.log('✓ Project schema initialized');
  } catch (err) {
    console.error('✗ Schema initialization failed:', err.message);
    throw err;
  }

  const migrationsDir = './sql/migrations';
  if (existsSync(migrationsDir)) {
    const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      const sql = readFileSync(`${migrationsDir}/${file}`, 'utf-8');
      if (sql.trim()) {
        await pool.query(sql);
        console.log(`✓ Migration applied: ${file}`);
      }
    }
  }
}

export default pool;
