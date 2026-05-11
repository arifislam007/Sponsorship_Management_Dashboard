import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'sombhabona_user',
  password: process.env.DB_PASSWORD || 'sombhabona_pass',
  database: process.env.DB_NAME || 'sombhabona_db',
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
    console.log('✓ ICT schema initialized successfully');
    // Run any migrations found in ./sql/migrations in alphabetical order
    const migrationsDir = './sql/migrations';
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
      for (const file of files) {
        try {
          const sql = fs.readFileSync(`${migrationsDir}/${file}`, 'utf-8');
          if (sql.trim()) {
            await pool.query(sql);
            console.log(`✓ Applied migration: ${file}`);
          }
        } catch (mErr) {
          console.error(`Error applying migration ${file}:`, mErr.message);
          throw mErr;
        }
      }
    }
  } catch (err) {
    console.error('Error initializing schema:', err.message);
    throw err;
  }
}

export default pool;
