import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

export async function ensureSchema() {
  const schemaPath = path.resolve(__dirname, '../sql/schema.sql');
  const authSchemaPath = path.resolve(__dirname, '../sql/auth_schema.sql');
  const seedAdminPath = path.resolve(__dirname, '../sql/seed_admin.sql');
  
  const schemaSql = await readFile(schemaPath, 'utf8');
  const authSchemaSql = await readFile(authSchemaPath, 'utf8');
  const seedAdminSql = await readFile(seedAdminPath, 'utf8');
  
  await executeSqlStatements(authSchemaSql);
  await pool.query(schemaSql);
  await executeSqlStatements(seedAdminSql);
}
