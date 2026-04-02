import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const required = ['PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.join(__dirname, 'postgres-schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf8');

const client = new Client({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false
});

try {
  await client.connect();
  await client.query('BEGIN');
  await client.query(schemaSql);
  await client.query('COMMIT');
  console.log('PostgreSQL schema initialized successfully.');
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('Failed to initialize schema:', error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}

