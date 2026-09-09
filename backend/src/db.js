import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { config } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

export async function query(text, params = []) {
  return pool.query(text, params);
}

async function executeSqlStatements(sqlText) {
  const statements = sqlText
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await pool.query(statement);
  }
}

async function seedAdminUser() {
  const existing = await pool.query('SELECT id FROM users WHERE username = $1', ['admin']);
  if (existing.rows.length > 0) return;

  const generatedPassword = crypto.randomBytes(12).toString('base64url');
  const password = process.env.ADMIN_INITIAL_PASSWORD || generatedPassword;
  const passwordHash = await bcrypt.hash(password, 10);

  await pool.query(
    `INSERT INTO users (username, email, password_hash, full_name, is_active)
     VALUES ('admin', 'admin@example.com', $1, 'Administrator', true)
     ON CONFLICT (username) DO NOTHING`,
    [passwordHash]
  );

  if (!process.env.ADMIN_INITIAL_PASSWORD) {
    console.log('='.repeat(60));
    console.log('First boot: generated initial admin password (save this now):');
    console.log(`  username: admin`);
    console.log(`  password: ${generatedPassword}`);
    console.log('This will not be shown again. Change it after first login.');
    console.log('='.repeat(60));
  }
}

export async function ensureSchema() {
  const schemaPath = path.resolve(__dirname, '../sql/schema.sql');
  const authSchemaPath = path.resolve(__dirname, '../sql/auth_schema.sql');
  const seedAdminPath = path.resolve(__dirname, '../sql/seed_admin.sql');
  const notifSchemaPath = path.resolve(__dirname, '../sql/notifications_schema.sql');

  const schemaSql = await readFile(schemaPath, 'utf8');
  const authSchemaSql = await readFile(authSchemaPath, 'utf8');
  const seedAdminSql = await readFile(seedAdminPath, 'utf8');
  const notifSchemaSql = await readFile(notifSchemaPath, 'utf8');

  await executeSqlStatements(authSchemaSql);
  await pool.query(schemaSql);
  await seedAdminUser();
  await executeSqlStatements(seedAdminSql);
  await executeSqlStatements(notifSchemaSql);
}
