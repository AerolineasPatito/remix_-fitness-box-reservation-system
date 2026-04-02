import { execFileSync } from 'node:child_process';

const required = ['PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const escapeSql = (value) => String(value ?? '').replace(/'/g, "''");

const adminEmail = escapeSql(process.env.ADMIN_EMAIL || 'cabreu145@gmail.com');
const adminName = escapeSql(process.env.ADMIN_NAME || 'cabreudev');
// Default hash for "Cran1306.18"
const adminHash = escapeSql(
  process.env.ADMIN_PASSWORD_HASH || '$2b$10$AxWze8JjEIvx1ObbMB8sf.YGXH3bD0hWT6DSL/vUp9BOB7KI8Xh0u'
);

const sql = `
BEGIN;

INSERT INTO system_settings (setting_key, setting_value, updated_at) VALUES
('cancellation_limit_hours','8',CURRENT_TIMESTAMP),
('cancellation_cutoff_morning','08:00',CURRENT_TIMESTAMP),
('cancellation_deadline_evening','22:00',CURRENT_TIMESTAMP)
ON CONFLICT (setting_key) DO UPDATE
SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP;

INSERT INTO class_types (id,name,image_url,icon,color_theme,description,duration,is_active,created_at,updated_at) VALUES
('ctype_funcional','Entrenamiento Funcional','','fa-bolt','amber','Entrenamiento dinamico para fuerza funcional y movilidad.',60,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('ctype_sculpt_strength','Sculpt and Strength','','fa-dumbbell','cyan','Tonificacion y fuerza con enfoque en tecnica y control.',60,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('ctype_hiit','HIIT Conditioning','','fa-heartbeat','rose','Alta intensidad para resistencia cardiovascular y quema calorica.',60,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('ctype_lower_body','Sculpt Lower Body','','fa-shoe-prints','indigo','Trabajo especifico de tren inferior y estabilidad.',60,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('ctype_full_body','Full Body','','fa-user-check','emerald','Sesion integral para todo el cuerpo.',60,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT (name) DO UPDATE SET
image_url = EXCLUDED.image_url,
icon = EXCLUDED.icon,
color_theme = EXCLUDED.color_theme,
description = EXCLUDED.description,
duration = EXCLUDED.duration,
is_active = 1,
updated_at = CURRENT_TIMESTAMP;

INSERT INTO paquetes (id,nombre,capacidad,numero_clases,vigencia_semanas,detalles,precio_base,estado,created_at,updated_at) VALUES
('pack_start','FOCUS START',1,12,4,'Paquete de inicio',899,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pack_base','FOCUS BASE',1,20,6,'Paquete intermedio',1399,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pack_work','FOCUS WORK',1,30,8,'Paquete individual premium',1999,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pack_duo','FOCUS DUO',2,46,8,'Paquete compartido para 2 personas',2899,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pack_crew','FOCUS CREW',3,60,10,'Paquete compartido para 3 personas',3599,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
nombre = EXCLUDED.nombre,
capacidad = EXCLUDED.capacidad,
numero_clases = EXCLUDED.numero_clases,
vigencia_semanas = EXCLUDED.vigencia_semanas,
detalles = EXCLUDED.detalles,
precio_base = EXCLUDED.precio_base,
estado = EXCLUDED.estado,
updated_at = CURRENT_TIMESTAMP;

INSERT INTO profiles (id,email,full_name,password_hash,role,credits_remaining,total_attended,email_verified,created_at,updated_at)
VALUES ('usr_admin','${adminEmail}','${adminName}','${adminHash}','admin',0,0,TRUE,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT (email) DO UPDATE SET
full_name = EXCLUDED.full_name,
password_hash = EXCLUDED.password_hash,
role = 'admin',
email_verified = TRUE,
updated_at = CURRENT_TIMESTAMP,
deleted_at = NULL;

INSERT INTO whatsapp_templates (id,name,body,is_default_cancellation,is_active,created_by,created_at,updated_at)
VALUES ('watpl_default_cancel','Cancelacion de clase','Hola {{nombre_alumno}}, tu clase "{{clase_activa}}" del {{fecha_cancelacion}} fue cancelada. Si necesitas apoyo para reagendar, estoy pendiente.',1,1,'system',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

COMMIT;
`;

try {
  execFileSync(
    'psql',
    [
      '-h',
      process.env.PGHOST,
      '-p',
      process.env.PGPORT || '5432',
      '-U',
      process.env.PGUSER,
      '-d',
      process.env.PGDATABASE,
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      sql
    ],
    {
      env: { ...process.env, PGPASSWORD: process.env.PGPASSWORD },
      stdio: 'inherit',
      encoding: 'utf8'
    }
  );

  console.log('PostgreSQL seed completed successfully.');
} catch (error) {
  console.error('Failed to seed PostgreSQL:', error.message);
  process.exitCode = 1;
}

