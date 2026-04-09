import Database from 'better-sqlite3';
import { Client } from 'pg';

const sqlitePath = process.env.SQLITE_PATH || 'fitness_v4.db';
const pgConfig = {
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false
};

const missing = ['host', 'database', 'user', 'password'].filter((key) => !pgConfig[key]);
if (missing.length > 0) {
  console.error(
    `Missing PostgreSQL connection values: ${missing.map((k) => `PG${k.toUpperCase()}`).join(', ')}`
  );
  process.exit(1);
}

const tableOrder = [
  'profiles',
  'class_types',
  'classes',
  'paquetes',
  'suscripciones_alumno',
  'suscripcion_beneficiarios',
  'reservations',
  'registros_asistencia',
  'transacciones_pago',
  'ajustes_credito',
  'system_settings',
  'whatsapp_templates'
];

const schemaSql = `
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT,
  password_hash TEXT,
  role TEXT DEFAULT 'student',
  credits_remaining INTEGER DEFAULT 0,
  total_attended INTEGER DEFAULT 0,
  patient_external_id TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token TEXT,
  email_verification_expires TEXT,
  password_reset_token TEXT,
  password_reset_expires TEXT,
  policy_accepted_at TIMESTAMP,
  whatsapp_phone TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS class_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  image_url TEXT,
  icon TEXT,
  color_theme TEXT,
  description TEXT,
  duration INTEGER NOT NULL DEFAULT 60,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  type TEXT,
  class_type_id TEXT,
  date TEXT,
  start_time TEXT,
  end_time TEXT,
  is_event INTEGER NOT NULL DEFAULT 0,
  capacity INTEGER DEFAULT 8,
  min_capacity INTEGER DEFAULT 1,
  max_capacity INTEGER DEFAULT 8,
  status TEXT DEFAULT 'active',
  cancellation_reason TEXT,
  cancellation_source TEXT,
  cancellation_notified_at TIMESTAMP,
  created_by TEXT,
  updated_by TEXT,
  canceled_by TEXT,
  real_time_status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  FOREIGN KEY(class_type_id) REFERENCES class_types(id)
);

CREATE TABLE IF NOT EXISTS paquetes (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  capacidad INTEGER NOT NULL DEFAULT 1,
  numero_clases INTEGER NOT NULL,
  vigencia_semanas INTEGER NOT NULL,
  detalles TEXT,
  precio_base NUMERIC NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'active',
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suscripciones_alumno (
  id TEXT PRIMARY KEY,
  alumno_id TEXT NOT NULL,
  paquete_id TEXT,
  fecha_compra TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_vencimiento TIMESTAMP NOT NULL,
  clases_totales INTEGER NOT NULL,
  clases_restantes INTEGER NOT NULL,
  clases_consumidas INTEGER NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'active',
  congelado INTEGER NOT NULL DEFAULT 0,
  freeze_iniciado_en TIMESTAMP,
  dias_congelados INTEGER NOT NULL DEFAULT 0,
  notas TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  FOREIGN KEY(alumno_id) REFERENCES profiles(id),
  FOREIGN KEY(paquete_id) REFERENCES paquetes(id)
);

CREATE TABLE IF NOT EXISTS suscripcion_beneficiarios (
  id TEXT PRIMARY KEY,
  suscripcion_id TEXT NOT NULL,
  alumno_id TEXT NOT NULL,
  es_titular INTEGER NOT NULL DEFAULT 0,
  clases_asignadas INTEGER NOT NULL DEFAULT 0,
  clases_restantes INTEGER NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  FOREIGN KEY(suscripcion_id) REFERENCES suscripciones_alumno(id),
  FOREIGN KEY(alumno_id) REFERENCES profiles(id),
  UNIQUE(suscripcion_id, alumno_id)
);

CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  class_id TEXT,
  suscripcion_id TEXT,
  beneficiario_id TEXT,
  status TEXT DEFAULT 'active',
  cancellation_reason TEXT,
  cancellation_notified_at TIMESTAMP,
  cancellation_notified_to_student INTEGER DEFAULT 0,
  cancellation_notified_to_business INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES profiles(id),
  FOREIGN KEY(class_id) REFERENCES classes(id),
  FOREIGN KEY(suscripcion_id) REFERENCES suscripciones_alumno(id),
  FOREIGN KEY(beneficiario_id) REFERENCES suscripcion_beneficiarios(id)
);

CREATE TABLE IF NOT EXISTS registros_asistencia (
  id TEXT PRIMARY KEY,
  alumno_id TEXT NOT NULL,
  clase_id TEXT NOT NULL,
  suscripcion_id TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'attended',
  asistio_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  registrado_por TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  FOREIGN KEY(alumno_id) REFERENCES profiles(id),
  FOREIGN KEY(clase_id) REFERENCES classes(id),
  FOREIGN KEY(suscripcion_id) REFERENCES suscripciones_alumno(id)
);

CREATE TABLE IF NOT EXISTS transacciones_pago (
  id TEXT PRIMARY KEY,
  suscripcion_id TEXT NOT NULL,
  alumno_id TEXT NOT NULL,
  paquete_id TEXT,
  monto NUMERIC NOT NULL,
  moneda TEXT NOT NULL DEFAULT 'MXN',
  metodo_pago TEXT,
  referencia TEXT,
  fecha_pago TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  FOREIGN KEY(suscripcion_id) REFERENCES suscripciones_alumno(id),
  FOREIGN KEY(alumno_id) REFERENCES profiles(id),
  FOREIGN KEY(paquete_id) REFERENCES paquetes(id)
);

CREATE TABLE IF NOT EXISTS ajustes_credito (
  id TEXT PRIMARY KEY,
  alumno_id TEXT NOT NULL,
  suscripcion_id TEXT,
  actor_id TEXT,
  ajuste INTEGER NOT NULL,
  motivo TEXT,
  clases_restantes_antes INTEGER,
  clases_restantes_despues INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  FOREIGN KEY(alumno_id) REFERENCES profiles(id),
  FOREIGN KEY(suscripcion_id) REFERENCES suscripciones_alumno(id)
);

CREATE TABLE IF NOT EXISTS system_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  is_default_cancellation INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_suscripciones_alumno_estado ON suscripciones_alumno(alumno_id, estado);
CREATE INDEX IF NOT EXISTS idx_suscripciones_vencimiento ON suscripciones_alumno(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_beneficiarios_suscripcion ON suscripcion_beneficiarios(suscripcion_id, alumno_id);
CREATE INDEX IF NOT EXISTS idx_beneficiarios_alumno ON suscripcion_beneficiarios(alumno_id, estado);
CREATE INDEX IF NOT EXISTS idx_transacciones_fecha ON transacciones_pago(fecha_pago);
CREATE INDEX IF NOT EXISTS idx_asistencia_alumno_clase ON registros_asistencia(alumno_id, clase_id);
`;

const coerceValue = (value) => {
  if (typeof value === 'boolean') return value;
  if (value === 0 || value === 1) return value;
  if (value === null || value === undefined) return null;
  return value;
};

const buildInsertStatement = (tableName, columns) => {
  const colList = columns.map((c) => `"${c}"`).join(', ');
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
  const updates = columns
    .filter((c) => c !== 'id' && c !== 'setting_key')
    .map((c) => `"${c}" = EXCLUDED."${c}"`)
    .join(', ');

  const conflictTarget = tableName === 'system_settings' ? 'setting_key' : 'id';
  return `
    INSERT INTO "${tableName}" (${colList})
    VALUES (${placeholders})
    ON CONFLICT (${conflictTarget}) DO UPDATE SET ${updates}
  `;
};

const sqlite = new Database(sqlitePath, { readonly: true });
const pg = new Client(pgConfig);

try {
  console.log(`Reading source SQLite DB: ${sqlitePath}`);
  await pg.connect();
  console.log('Connected to PostgreSQL');
  await pg.query('BEGIN');
  await pg.query(schemaSql);

  for (const tableName of [...tableOrder].reverse()) {
    await pg.query(`TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE`);
  }

  for (const tableName of tableOrder) {
    const columnsMeta = sqlite.prepare(`PRAGMA table_info(${tableName})`).all();
    if (!columnsMeta || columnsMeta.length === 0) {
      console.log(`Skipping ${tableName}: table not found in SQLite.`);
      continue;
    }

    const columns = columnsMeta.map((c) => c.name);
    const rows = sqlite.prepare(`SELECT * FROM ${tableName}`).all();
    if (rows.length === 0) {
      console.log(`Copied 0 rows for ${tableName}`);
      continue;
    }

    const insertSql = buildInsertStatement(tableName, columns);
    for (const row of rows) {
      const values = columns.map((col) => coerceValue(row[col]));
      await pg.query(insertSql, values);
    }
    console.log(`Copied ${rows.length} rows for ${tableName}`);
  }

  await pg.query('COMMIT');
  console.log('SQLite -> PostgreSQL migration completed successfully.');
} catch (error) {
  await pg.query('ROLLBACK').catch(() => {});
  console.error('Migration failed:', error.message);
  process.exitCode = 1;
} finally {
  sqlite.close();
  await pg.end().catch(() => {});
}
