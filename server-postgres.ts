import express, { type Request } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { readFile, writeFile } from 'node:fs/promises';
import { emailService } from './lib/emailService.ts';
import crypto from 'node:crypto';
import {
  calculateCancellationDeadline as calculateCancellationDeadlineTz,
  DEFAULT_APP_TIMEZONE
} from './lib/cancellationPolicy.ts';

dotenv.config({ path: '.env.local' });
dotenv.config();
process.env.TZ = process.env.APP_TIMEZONE || DEFAULT_APP_TIMEZONE;

const IS_PROD = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT || 3000);
const APP_TIMEZONE = process.env.APP_TIMEZONE || DEFAULT_APP_TIMEZONE;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const emailConfigPath = path.resolve(process.cwd(), 'email-config.json');
const APP_BASE_URL = String(process.env.APP_BASE_URL || '').trim().replace(/\/+$/, '');
const MAX_IMAGE_UPLOAD_BYTES = 8 * 1024 * 1024;
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_UPLOAD_BYTES }
});
const cloudinaryCloudName = String(process.env.CLOUDINARY_CLOUD_NAME || '').trim();
const cloudinaryApiKey = String(process.env.CLOUDINARY_API_KEY || '').trim();
const cloudinaryApiSecret = String(process.env.CLOUDINARY_API_SECRET || '').trim();
const missingCloudinaryEnv = [
  !cloudinaryCloudName ? 'CLOUDINARY_CLOUD_NAME' : null,
  !cloudinaryApiKey ? 'CLOUDINARY_API_KEY' : null,
  !cloudinaryApiSecret ? 'CLOUDINARY_API_SECRET' : null
].filter(Boolean) as string[];
const hasCloudinaryConfig = Boolean(cloudinaryCloudName && cloudinaryApiKey && cloudinaryApiSecret);
if (hasCloudinaryConfig) {
  cloudinary.config({
    cloud_name: cloudinaryCloudName,
    api_key: cloudinaryApiKey,
    api_secret: cloudinaryApiSecret,
    secure: true
  });
}

const pgPool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || 'cabreu145_focusfitness',
  user: process.env.PGUSER || 'cabreu145_focusfitness_user',
  password: process.env.PGPASSWORD || '',
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 10
});

const createId = (prefix = '') => `${prefix}${Math.random().toString(36).slice(2, 11)}`;
const normalizeOptionalText = (value: any) => {
  const parsed = String(value ?? '').trim();
  return parsed ? parsed : null;
};
const normalizeOptionalTimestamp = (value: any) => {
  if (value == null || value === '') return null;
  const asText = String(value).trim();
  if (!asText) return null;
  const dt = new Date(asText);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
};
const normalizeInteger = (value: any, fallback = 0) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const normalizeActiveFlag = (value: any, fallback = 1) => {
  if (value == null) return fallback;
  if (typeof value === 'boolean') return value ? 1 : 0;
  const txt = String(value).trim().toLowerCase();
  if (txt === '1' || txt === 'true' || txt === 'active') return 1;
  if (txt === '0' || txt === 'false' || txt === 'inactive') return 0;
  return fallback;
};

const app = express();
app.use(cors());
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use('/api', (_req, res, next) => {
  if (!res.getHeader('Content-Type')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }
  next();
});

const query = async <T = any>(text: string, params: any[] = []) => {
  const res = await pgPool.query<T>(text, params);
  return res.rows;
};

const getOne = async <T = any>(text: string, params: any[] = []) => {
  const rows = await query<T>(text, params);
  return rows[0] || null;
};

type StoredEmailConfig = {
  provider?: 'console' | 'smtp' | 'sendgrid' | 'ses' | string;
  smtp?: {
    host?: string;
    port?: number;
    secure?: boolean;
    user?: string;
    pass?: string;
  } | null;
  sendgrid?: any;
  ses?: any;
};

const readEmailConfig = async (): Promise<StoredEmailConfig> => {
  try {
    const raw = await readFile(emailConfigPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed : { provider: 'console' };
  } catch {
    return { provider: 'console' };
  }
};

const persistEmailConfig = async (config: StoredEmailConfig) => {
  await writeFile(emailConfigPath, JSON.stringify(config ?? { provider: 'console' }, null, 2), 'utf-8');
};

const randomToken = () => crypto.randomBytes(24).toString('hex');
const uploadImageToCloudinary = async (buffer: Buffer, folder = 'focus-fitness') => {
  const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image'
      },
      (error, uploaded) => {
        if (error || !uploaded?.secure_url || !uploaded?.public_id) {
          reject(error || new Error('No se pudo subir la imagen a Cloudinary.'));
          return;
        }
        resolve({
          secure_url: uploaded.secure_url,
          public_id: uploaded.public_id
        });
      }
    );
    stream.end(buffer);
  });
  return result;
};

const getBusinessNotificationEmail = async () => {
  const cfg = await readEmailConfig();
  const fromSmtp = String(cfg?.smtp?.user || '').trim().toLowerCase();
  return fromSmtp;
};

const resolvePublicBaseUrl = (req: Request) => {
  if (APP_BASE_URL) return APP_BASE_URL;

  const xfProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const xfHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const host = xfHost || String(req.headers.host || '').trim();
  const protocol = xfProto || req.protocol || 'https';

  if (!host) return 'http://localhost:3000';
  return `${protocol}://${host}`.replace(/\/+$/, '');
};

const buildEmailLayout = (title: string, subtitle: string, contentHtml: string) => `
  <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; background: #f5f7fb; padding: 24px;">
    <div style="background: linear-gradient(135deg, #111827 0%, #0f172a 100%); border-radius: 20px 20px 0 0; padding: 30px; text-align: center;">
      <h1 style="color: #22d3ee; margin: 0; font-size: 32px; letter-spacing: 1px;">FOCUS FITNESS</h1>
      <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 13px; letter-spacing: .12em; text-transform: uppercase;">${subtitle}</p>
    </div>
    <div style="background: #ffffff; border-radius: 0 0 20px 20px; padding: 28px; border: 1px solid #e5e7eb;">
      <h2 style="margin: 0 0 12px; color: #111827; font-size: 22px;">${title}</h2>
      ${contentHtml}
      <p style="margin: 22px 0 0; color: #6b7280; font-size: 12px;">© ${new Date().getFullYear()} Focus Fitness</p>
    </div>
  </div>
`;

const getSettings = async () => {
  const rows = await query<{ setting_key: string; setting_value: string }>(
    `SELECT setting_key, setting_value FROM system_settings`
  );
  const map: Record<string, string> = {};
  for (const row of rows) map[row.setting_key] = String(row.setting_value ?? '');
  return {
    cancellation_limit_hours: Number(map.cancellation_limit_hours || 8),
    cancellation_cutoff_morning: map.cancellation_cutoff_morning || '08:00',
    cancellation_deadline_evening: map.cancellation_deadline_evening || '22:00'
  };
};

const calculateCancellationDeadline = async (classDate: string, classStartTime: string) => {
  const settings = await getSettings();
  return calculateCancellationDeadlineTz(classDate, classStartTime, settings, APP_TIMEZONE);
};

const syncStudentCredits = async (studentId: string) => {
  const row = await getOne<{ total: string }>(
    `
      SELECT COALESCE(SUM(sb.clases_restantes), 0)::text AS total
      FROM suscripcion_beneficiarios sb
      JOIN suscripciones_alumno sa ON sa.id = sb.suscripcion_id
      WHERE sb.alumno_id = $1
        AND sb.estado = 'active'
        AND sa.estado = 'active'
        AND COALESCE(sa.congelado, 0) = 0
        AND sb.deleted_at IS NULL
        AND sa.deleted_at IS NULL
    `,
    [studentId]
  );
  const credits = Number(row?.total || 0);
  await query(
    `UPDATE profiles SET credits_remaining = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [studentId, credits]
  );
  return credits;
};

const sanitizeProfile = (profile: any) => {
  if (!profile) return null;
  const { password_hash, ...safe } = profile;
  return safe;
};

app.get('/api/system-settings/public', async (_req, res) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch {
    res.status(500).json({ error: 'No se pudo obtener la configuración del sistema.' });
  }
});

app.get('/api/class-types', async (_req, res) => {
  try {
    const rows = await query(
      `
      SELECT id, name, image_url, icon, color_theme, description, duration, is_active, created_at, updated_at
      FROM class_types
      WHERE is_active = 1
      ORDER BY name ASC
    `
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'No se pudieron obtener los tipos de clase.' });
  }
});

app.post('/api/class-types', async (req, res) => {
  try {
    const id = createId('ctype_');
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'El nombre del tipo de clase es obligatorio.' });
    const imageUrl = String(req.body?.image_url || req.body?.imageUrl || '').trim() || null;
    const icon = String(req.body?.icon || '').trim() || null;
    const colorTheme = String(req.body?.color_theme || req.body?.colorTheme || '').trim() || null;
    const description = String(req.body?.description || '').trim() || null;
    const duration = Number(req.body?.duration ?? 60);

    await query(
      `
      INSERT INTO class_types (id, name, image_url, icon, color_theme, description, duration, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
      [id, name, imageUrl, icon, colorTheme, description, Number.isFinite(duration) ? duration : 60]
    );
    const created = await getOne(`SELECT * FROM class_types WHERE id = $1`, [id]);
    res.status(201).json(created);
  } catch {
    res.status(500).json({ error: 'No se pudo crear el tipo de clase.' });
  }
});

app.put('/api/class-types/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'El nombre del tipo de clase es obligatorio.' });
    const imageUrl = String(req.body?.image_url || req.body?.imageUrl || '').trim() || null;
    const icon = String(req.body?.icon || '').trim() || null;
    const colorTheme = String(req.body?.color_theme || req.body?.colorTheme || '').trim() || null;
    const description = String(req.body?.description || '').trim() || null;
    const duration = Number(req.body?.duration ?? 60);
    await query(
      `
      UPDATE class_types
      SET name = $2,
          image_url = $3,
          icon = $4,
          color_theme = $5,
          description = $6,
          duration = $7,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
      [id, name, imageUrl, icon, colorTheme, description, Number.isFinite(duration) ? duration : 60]
    );
    const updated = await getOne(`SELECT * FROM class_types WHERE id = $1`, [id]);
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'No se pudo actualizar el tipo de clase.' });
  }
});

app.delete('/api/class-types/:id', async (req, res) => {
  try {
    await query(`UPDATE class_types SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'No se pudo eliminar el tipo de clase.' });
  }
});

app.post('/api/upload/image', (req, res) => {
  imageUpload.single('image')(req, res, async (error: any) => {
    try {
      if (!hasCloudinaryConfig) {
        console.error('[UPLOAD] Cloudinary config faltante', missingCloudinaryEnv);
        return res.status(500).json({
          error: 'La carga de imágenes no está disponible en este entorno.',
          ...(IS_PROD ? {} : { missing: missingCloudinaryEnv })
        });
      }
      if (error) {
        if (error?.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'La imagen excede el tamaño máximo permitido (8 MB).' });
        }
        return res.status(400).json({ error: 'No pudimos procesar el archivo seleccionado.' });
      }

      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) {
        return res.status(400).json({ error: 'Selecciona una imagen para continuar.' });
      }
      if (!String(file.mimetype || '').startsWith('image/')) {
        return res.status(400).json({ error: 'El archivo debe ser una imagen válida (JPG, PNG, WEBP, etc.).' });
      }

      const uploaded = await uploadImageToCloudinary(file.buffer);
      return res.status(201).json({
        secure_url: uploaded.secure_url,
        public_id: uploaded.public_id
      });
    } catch (err: any) {
      console.error('[UPLOAD] Error subiendo imagen a Cloudinary:', err?.message || err);
      return res.status(500).json({ error: 'No pudimos subir la imagen. Intenta de nuevo en unos segundos.' });
    }
  });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '').trim();
    const fullName = String(req.body?.fullName || '').trim();
    const whatsappPhone = String(req.body?.whatsappPhone || '').trim();

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Completa los campos obligatorios para registrarte.' });
    }

    const existingProfile = await getOne<any>(`SELECT id, deleted_at FROM profiles WHERE email = $1`, [email]);
    if (existingProfile && !existingProfile.deleted_at) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const verificationToken = randomToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    if (existingProfile && existingProfile.deleted_at) {
      await query(
        `
        UPDATE profiles
        SET full_name = $2,
            password_hash = $3,
            role = 'student',
            whatsapp_phone = $4,
            email_verified = FALSE,
            email_verification_token = $5,
            email_verification_expires = $6,
            deleted_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
        [existingProfile.id, fullName, hash, whatsappPhone || null, verificationToken, verificationExpires]
      );
    } else {
      const id = createId('usr_');
      await query(
        `
        INSERT INTO profiles (
          id, email, full_name, password_hash, role, credits_remaining, total_attended, whatsapp_phone, email_verified, email_verification_token, email_verification_expires, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, 'student', 0, 0, $5, FALSE, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
        [id, email, fullName, hash, whatsappPhone || null, verificationToken, verificationExpires]
      );
    }

    const verifyUrl = `${resolvePublicBaseUrl(req)}/verify-email?token=${verificationToken}`;
    void emailService
      .sendEmail({
        to: email,
        subject: 'Verifica tu correo - Focus Fitness',
        html: buildEmailLayout(
          '¡Bienvenido a Focus Fitness!',
          'Confirmación de correo',
          `
            <p style="color:#374151;line-height:1.6;margin:0 0 16px;">Tu perfil fue creado correctamente. Para activarlo, confirma tu correo.</p>
            <p style="margin: 20px 0;">
              <a href="${verifyUrl}" style="display:inline-block;background:#111827;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700;">Verificar mi correo</a>
            </p>
            <p style="color:#6b7280;font-size:13px;margin:0;">Este enlace expira en 24 horas.</p>
          `
        )
      })
      .catch((err) => {
        console.error('Error enviando correo de verificación:', err?.message || err);
      });

    res.status(201).json({
      success: true,
      requiresVerification: true,
      message: 'Perfil creado. Revisa tu correo para confirmar tu cuenta.'
    });
  } catch (error: any) {
    console.error('Register error:', error?.message || error);
    res.status(500).json({ error: 'No pudimos completar tu registro. Intenta nuevamente.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '').trim();
    if (!email || !password) {
      return res.status(400).json({ error: 'Ingresa tu correo y contraseña.' });
    }

    const user = await getOne(`SELECT * FROM profiles WHERE email = $1 AND deleted_at IS NULL`, [email]);
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    if (!Boolean(user.email_verified)) {
      return res.status(401).json({ error: 'Debes verificar tu correo antes de iniciar sesión.' });
    }

    const safeUser = sanitizeProfile(user);
    res.json({ success: true, user: safeUser, session: { user: safeUser } });
  } catch {
    res.status(500).json({ error: 'No se pudo iniciar sesión. Intenta de nuevo.' });
  }
});

app.get('/api/verify-email', async (req, res) => {
  try {
    const token = String(req.query?.token || '').trim();
    if (!token) return res.status(400).json({ success: false, error: 'Token de verificación inválido.' });

    const user = await getOne<any>(
      `
      SELECT id, email_verification_expires, email_verified
      FROM profiles
      WHERE email_verification_token = $1
        AND deleted_at IS NULL
    `,
      [token]
    );
    if (!user) return res.status(400).json({ success: false, error: 'El enlace de verificación no es válido.' });
    if (Boolean(user.email_verified)) {
      return res.json({ success: true, message: 'Tu correo ya estaba verificado.' });
    }
    if (user.email_verification_expires && new Date(user.email_verification_expires).getTime() < Date.now()) {
      return res.status(400).json({ success: false, error: 'El enlace de verificación expiró. Regístrate de nuevo.' });
    }

    await query(
      `
      UPDATE profiles
      SET email_verified = TRUE,
          email_verification_token = NULL,
          email_verification_expires = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
      [user.id]
    );

    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: 'No se pudo verificar el correo.' });
  }
});

app.post('/api/forgot-password', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ success: false, error: 'Ingresa un correo válido.' });

    const profile = await getOne<any>(`SELECT id, full_name FROM profiles WHERE email = $1 AND deleted_at IS NULL`, [email]);
    if (!profile) {
      return res.json({ success: true });
    }

    const token = randomToken();
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await query(
      `
      UPDATE profiles
      SET password_reset_token = $2,
          password_reset_expires = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
      [profile.id, token, expires]
    );

    const resetUrl = `${resolvePublicBaseUrl(req)}/reset-password?token=${token}`;
    void emailService
      .sendEmail({
        to: email,
        subject: 'Restablece tu contraseña - Focus Fitness',
        html: buildEmailLayout(
          'Restablecer contraseña',
          'Seguridad de cuenta',
          `
            <p style="color:#374151;line-height:1.6;margin:0 0 16px;">Hola${profile?.full_name ? `, ${profile.full_name}` : ''}. Recibimos una solicitud para restablecer tu contraseña.</p>
            <p style="margin: 20px 0;">
              <a href="${resetUrl}" style="display:inline-block;background:#111827;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700;">Crear nueva contraseña</a>
            </p>
            <p style="color:#6b7280;font-size:13px;margin:0;">Este enlace expira en 1 hora.</p>
          `
        )
      })
      .catch((err) => {
        console.error('Error enviando correo de reset:', err?.message || err);
      });

    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: 'No se pudo procesar la solicitud.' });
  }
});

app.post('/api/reset-password', async (req, res) => {
  try {
    const token = String(req.body?.token || '').trim();
    const newPassword = String(req.body?.newPassword || '').trim();
    if (!token || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Datos inválidos para restablecer contraseña.' });
    }

    const profile = await getOne<any>(
      `
      SELECT id, password_reset_expires
      FROM profiles
      WHERE password_reset_token = $1
        AND deleted_at IS NULL
    `,
      [token]
    );
    if (!profile) return res.status(400).json({ success: false, error: 'El enlace de restablecimiento no es válido.' });
    if (profile.password_reset_expires && new Date(profile.password_reset_expires).getTime() < Date.now()) {
      return res.status(400).json({ success: false, error: 'El enlace de restablecimiento expiró.' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await query(
      `
      UPDATE profiles
      SET password_hash = $2,
          password_reset_token = NULL,
          password_reset_expires = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
      [profile.id, hash]
    );
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: 'No se pudo restablecer la contraseña.' });
  }
});

app.get('/api/profile/:id', async (req, res) => {
  try {
    const profile = await getOne(`SELECT * FROM profiles WHERE id = $1 AND deleted_at IS NULL`, [req.params.id]);
    if (!profile) return res.status(404).json({ error: 'Perfil no encontrado.' });
    res.json(sanitizeProfile(profile));
  } catch {
    res.status(500).json({ error: 'No se pudo obtener el perfil.' });
  }
});

app.post('/api/profile/:id/policy-acceptance', async (req, res) => {
  try {
    await query(
      `UPDATE profiles SET policy_accepted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [req.params.id]
    );
    const profile = await getOne(`SELECT * FROM profiles WHERE id = $1`, [req.params.id]);
    res.json({ success: true, profile: sanitizeProfile(profile) });
  } catch {
    res.status(500).json({ error: 'No se pudo registrar la aceptación de políticas.' });
  }
});

app.get('/api/classes', async (req, res) => {
  try {
    const year = Number(req.query.year);
    const includeAllStates = String(req.query.includeAllStates || 'false') === 'true';
    const includeRoster = String(req.query.includeRoster || 'false') === 'true';
    const viewerId = String(req.query.viewerId || '').trim();

    const params: any[] = [];
    const where: string[] = [`c.deleted_at IS NULL`];
    if (!includeAllStates) where.push(`c.status = 'active'`);
    if (Number.isFinite(year) && year > 2000) {
      params.push(String(year));
      where.push(`EXTRACT(YEAR FROM to_date(c.date, 'YYYY-MM-DD')) = $${params.length}`);
    }

    const rows = await query(
      `
      SELECT
        c.*,
        COALESCE(ct.name, c.type) AS type,
        ct.image_url,
        ct.icon,
        ct.color_theme,
        ct.description,
        ct.duration,
        COUNT(r.id) FILTER (WHERE r.status = 'active' AND r.deleted_at IS NULL)::int AS reserved_count
      FROM classes c
      LEFT JOIN class_types ct ON ct.id = c.class_type_id
      LEFT JOIN reservations r ON r.class_id = c.id
      WHERE ${where.join(' AND ')}
      GROUP BY c.id, ct.id
      ORDER BY c.date ASC, c.start_time ASC
    `,
      params
    );

    if (includeRoster) {
      for (const row of rows as any[]) {
        const roster = await query(
          `
          SELECT p.id, p.full_name, p.email, p.whatsapp_phone
          FROM reservations r
          JOIN profiles p ON p.id = r.user_id
          WHERE r.class_id = $1 AND r.status = 'active' AND r.deleted_at IS NULL
          ORDER BY p.full_name ASC
        `,
          [row.id]
        );
        row.roster = roster;
      }
    }

    if (viewerId) {
      const enrolledRows = await query<{ class_id: string }>(
        `
        SELECT class_id
        FROM reservations
        WHERE user_id = $1 AND status = 'active' AND deleted_at IS NULL
      `,
        [viewerId]
      );
      const enrolledSet = new Set(enrolledRows.map((r) => r.class_id));
      for (const row of rows as any[]) row.is_enrolled = enrolledSet.has(row.id);
    }

    res.json(rows);
  } catch {
    res.status(500).json({ error: 'No se pudieron obtener las clases.' });
  }
});

app.get('/api/calendar/classes', async (req, res) => {
  try {
    const startDate = String(req.query.startDate || '').trim();
    const endDate = String(req.query.endDate || '').trim();
    const viewerId = String(req.query.viewerId || '').trim();
    const params: any[] = [];
    const where = [`c.deleted_at IS NULL`];
    if (startDate) {
      params.push(startDate);
      where.push(`c.date >= $${params.length}`);
    }
    if (endDate) {
      params.push(endDate);
      where.push(`c.date <= $${params.length}`);
    }
    const rows = await query(
      `
      SELECT
        c.*,
        COALESCE(ct.name, c.type) AS type,
        ct.image_url,
        COUNT(r.id) FILTER (WHERE r.status = 'active' AND r.deleted_at IS NULL)::int AS reserved_count
      FROM classes c
      LEFT JOIN class_types ct ON ct.id = c.class_type_id
      LEFT JOIN reservations r ON r.class_id = c.id
      WHERE ${where.join(' AND ')}
      GROUP BY c.id, ct.id
      ORDER BY c.date ASC, c.start_time ASC
    `,
      params
    );
    const classIds = (rows as any[]).map((row: any) => row.id).filter(Boolean);

    let viewerRole: string | null = null;
    if (viewerId) {
      const viewer = await getOne<{ role: string }>(
        `SELECT role FROM profiles WHERE id = $1 AND deleted_at IS NULL`,
        [viewerId]
      );
      viewerRole = String(viewer?.role || '').trim().toLowerCase() || null;
    }
    const canViewParticipants = viewerRole === 'coach' || viewerRole === 'admin';

    const participantsByClass = new Map<string, any[]>();
    if (classIds.length > 0 && canViewParticipants) {
      const participantRows = await query<{
        class_id: string;
        reservation_id: string;
        user_id: string;
        full_name: string;
        email: string | null;
        whatsapp_phone: string | null;
      }>(
        `
        SELECT
          r.class_id,
          r.id AS reservation_id,
          p.id AS user_id,
          p.full_name,
          p.email,
          p.whatsapp_phone
        FROM reservations r
        JOIN profiles p ON p.id = r.user_id
        WHERE r.status = 'active'
          AND r.deleted_at IS NULL
          AND r.class_id = ANY($1::text[])
        ORDER BY r.created_at ASC
      `,
        [classIds]
      );
      for (const participant of participantRows) {
        const current = participantsByClass.get(participant.class_id) || [];
        current.push(participant);
        participantsByClass.set(participant.class_id, current);
      }
    }

    const viewerReservationByClass = new Map<string, any>();
    if (viewerId && classIds.length > 0) {
      const viewerRows = await query<{
        id: string;
        class_id: string;
        user_id: string;
      }>(
        `
        SELECT id, class_id, user_id
        FROM reservations
        WHERE user_id = $1
          AND status = 'active'
          AND deleted_at IS NULL
          AND class_id = ANY($2::text[])
      `,
        [viewerId, classIds]
      );
      for (const viewerRow of viewerRows) {
        viewerReservationByClass.set(viewerRow.class_id, {
          reservation_id: viewerRow.id,
          user_id: viewerRow.user_id
        });
      }
    }

    const now = new Date();
    const normalized = (rows as any[]).map((row: any) => {
      const participants = canViewParticipants ? participantsByClass.get(row.id) || [] : [];
      const reservationsCount = Number(row.reserved_count || participants.length || 0);
      const maxCapacity = Number(row.max_capacity || row.capacity || 0);
      const startDateTime = new Date(`${row.date}T${String(row.start_time || '00:00').slice(0, 5)}:00`);
      const endDateTime = new Date(`${row.date}T${String(row.end_time || '00:00').slice(0, 5)}:00`);
      const normalizedStatus = String(row.status || '').toLowerCase();
      const normalizedRealtime = String(row.real_time_status || '').toLowerCase();

      let classStatus: 'available' | 'full' | 'cancelled' | 'finished' = 'available';
      if (
        normalizedStatus === 'canceled' ||
        normalizedStatus === 'cancelled' ||
        normalizedRealtime === 'canceled' ||
        normalizedRealtime === 'cancelled'
      ) {
        classStatus = 'cancelled';
      } else if (now.getTime() >= endDateTime.getTime() || normalizedRealtime === 'finished') {
        classStatus = 'finished';
      } else if (maxCapacity > 0 && reservationsCount >= maxCapacity) {
        classStatus = 'full';
      }

      return {
        ...row,
        participants,
        reservations_count: reservationsCount,
        remaining_spots: Math.max(0, maxCapacity - reservationsCount),
        class_status: classStatus,
        viewer_reservation: viewerReservationByClass.get(row.id) || null,
        is_enrolled: Boolean(viewerReservationByClass.get(row.id))
      };
    });

    res.json(normalized);
  } catch {
    res.status(500).json({ error: 'No se pudieron obtener las clases del calendario.' });
  }
});

app.get('/api/availability', async (_req, res) => {
  try {
    const rows = await query<{ class_id: string; count: number }>(
      `
      SELECT class_id, COUNT(*)::int AS count
      FROM reservations
      WHERE status = 'active' AND deleted_at IS NULL
      GROUP BY class_id
    `
    );
    const map: Record<string, number> = {};
    for (const row of rows) map[row.class_id] = Number(row.count || 0);
    res.json(map);
  } catch {
    res.status(500).json({ error: 'No se pudo obtener la disponibilidad.' });
  }
});

app.post('/api/classes', async (req, res) => {
  try {
    const classTypeId = String(req.body?.class_type_id || req.body?.classTypeId || '').trim();
    const date = String(req.body?.date || '').trim();
    const startTime = String(req.body?.start_time || req.body?.startTime || '').trim().slice(0, 5);
    const endTime = String(req.body?.end_time || req.body?.endTime || '').trim().slice(0, 5);
    const minCapacity = Number(req.body?.min_capacity ?? req.body?.minCapacity ?? 1);
    const maxCapacity = Number(req.body?.max_capacity ?? req.body?.maxCapacity ?? req.body?.capacity ?? 8);
    const createdBy = String(req.body?.created_by || req.body?.createdBy || '').trim() || null;

    if (!classTypeId || !date || !startTime || !endTime) {
      return res.status(400).json({ error: 'Completa fecha, horario y tipo de clase.' });
    }
    if (!Number.isFinite(minCapacity) || !Number.isFinite(maxCapacity) || minCapacity < 1 || maxCapacity < minCapacity) {
      return res.status(400).json({ error: 'La capacidad mínima y máxima no es válida.' });
    }

    const classType = await getOne(`SELECT name FROM class_types WHERE id = $1`, [classTypeId]);
    if (!classType) return res.status(404).json({ error: 'El tipo de clase no existe.' });

    const id = createId('cls_');
    await query(
      `
      INSERT INTO classes (
        id, type, class_type_id, date, start_time, end_time, min_capacity, max_capacity, capacity, status, real_time_status, created_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, 'active', 'scheduled', $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
      [id, classType.name, classTypeId, date, startTime, endTime, minCapacity, maxCapacity, createdBy]
    );

    const created = await getOne(`SELECT * FROM classes WHERE id = $1`, [id]);
    res.status(201).json({ success: true, class: created });
  } catch {
    res.status(500).json({ error: 'No se pudo crear la clase.' });
  }
});

app.post('/api/classes/recurring', async (req, res) => {
  try {
    const classTypeId = String(req.body?.class_type_id || req.body?.classTypeId || '').trim();
    const startDate = String(req.body?.startDate || '').trim();
    const startTime = String(req.body?.start_time || req.body?.startTime || '').trim().slice(0, 5);
    const endTime = String(req.body?.end_time || req.body?.endTime || '').trim().slice(0, 5);
    const minCapacity = Number(req.body?.min_capacity ?? req.body?.minCapacity ?? 1);
    const maxCapacity = Number(req.body?.max_capacity ?? req.body?.maxCapacity ?? req.body?.capacity ?? 8);
    const weeks = Math.max(1, Number(req.body?.weeks || req.body?.durationWeeks || 1));
    const recurrenceType = String(req.body?.recurrenceType || 'weekly');
    const weekdays: number[] = Array.isArray(req.body?.weekdays) ? req.body.weekdays.map((n: any) => Number(n)) : [];
    const createdBy = String(req.body?.created_by || req.body?.createdBy || '').trim() || null;

    if (!classTypeId || !startDate || !startTime || !endTime) {
      return res.status(400).json({ error: 'Completa los datos de la programación recurrente.' });
    }

    const classType = await getOne(`SELECT name FROM class_types WHERE id = $1`, [classTypeId]);
    if (!classType) return res.status(404).json({ error: 'El tipo de clase no existe.' });

    const base = new Date(`${startDate}T00:00:00`);
    const toInsert: string[] = [];
    if (recurrenceType === 'daily') {
      for (let i = 0; i < weeks * 7; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        toInsert.push(d.toISOString().slice(0, 10));
      }
    } else {
      const selectedDays = weekdays.length ? weekdays : [base.getDay()];
      for (let w = 0; w < weeks; w++) {
        for (const day of selectedDays) {
          const d = new Date(base);
          const current = d.getDay();
          const diff = (day - current + 7) % 7;
          d.setDate(base.getDate() + w * 7 + diff);
          toInsert.push(d.toISOString().slice(0, 10));
        }
      }
    }

    const uniqueDates = [...new Set(toInsert)].sort();
    const created: any[] = [];
    for (const date of uniqueDates) {
      const id = createId('cls_');
      await query(
        `
        INSERT INTO classes (
          id, type, class_type_id, date, start_time, end_time, min_capacity, max_capacity, capacity, status, real_time_status, created_by, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, 'active', 'scheduled', $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
        [id, classType.name, classTypeId, date, startTime, endTime, minCapacity, maxCapacity, createdBy]
      );
      created.push({ id, date });
    }

    res.status(201).json({ success: true, createdCount: created.length, created });
  } catch {
    res.status(500).json({ error: 'No se pudo crear la programación recurrente.' });
  }
});

app.patch('/api/classes/:id/cancel', async (req, res) => {
  const client = await pgPool.connect();
  try {
    const classId = req.params.id;
    const canceledBy = String(req.body?.canceled_by || '').trim() || null;
    await client.query('BEGIN');

    const classInfoResult = await client.query(
      `
      SELECT id, type, date, start_time, end_time
      FROM classes
      WHERE id = $1 AND deleted_at IS NULL
      FOR UPDATE
    `,
      [classId]
    );
    const classInfo: any = classInfoResult.rows[0];
    if (!classInfo) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No encontramos la clase a cancelar.' });
    }

    const reservationsResult = await client.query(
      `
      SELECT
        r.id AS reservation_id,
        r.user_id,
        r.suscripcion_id,
        r.beneficiario_id,
        p.full_name,
        p.email,
        p.whatsapp_phone
      FROM reservations r
      JOIN profiles p ON p.id = r.user_id
      WHERE r.class_id = $1
        AND r.status = 'active'
        AND r.deleted_at IS NULL
      FOR UPDATE
    `,
      [classId]
    );
    const activeReservations: any[] = reservationsResult.rows || [];

    await client.query(
      `
      UPDATE classes
      SET status = 'canceled',
          real_time_status = 'canceled',
          cancellation_source = 'coach',
          canceled_by = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
      [classId, canceledBy]
    );

    await client.query(
      `
      UPDATE reservations
      SET status = 'cancelled',
          cancellation_reason = 'cancelacion_clase_coach',
          cancellation_notified_to_student = 1,
          cancellation_notified_to_business = 1,
          cancellation_notified_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE class_id = $1
        AND status = 'active'
        AND deleted_at IS NULL
    `,
      [classId]
    );

    for (const reservation of activeReservations) {
      if (reservation.beneficiario_id) {
        await client.query(
          `
          UPDATE suscripcion_beneficiarios
          SET clases_restantes = clases_restantes + 1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
          [reservation.beneficiario_id]
        );
      }

      if (reservation.suscripcion_id) {
        await client.query(
          `
          UPDATE suscripciones_alumno
          SET clases_restantes = clases_restantes + 1,
              clases_consumidas = GREATEST(clases_consumidas - 1, 0),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
          [reservation.suscripcion_id]
        );
      }
    }

    await client.query('COMMIT');

    const affectedStudentIds = Array.from(
      new Set(activeReservations.map((r) => String(r.user_id || '').trim()).filter(Boolean))
    );
    for (const studentId of affectedStudentIds) {
      await syncStudentCredits(String(studentId));
    }

    const businessEmail = await getBusinessNotificationEmail();
    const notifiedLines = activeReservations.map(
      (row) => `- ${row.full_name || 'Alumno'} — ${row.email || 'sin correo'} — ${row.whatsapp_phone || 'sin WhatsApp'}`
    );

    if (businessEmail) {
      void emailService
        .sendEmail({
          to: businessEmail,
          subject: `Clase cancelada por coach - ${classInfo.type}`,
          html: buildEmailLayout(
            'Cancelación de clase',
            'Alerta interna',
            `
              <p style="color:#374151;margin:0 0 8px;"><strong>Clase:</strong> ${classInfo.type}</p>
              <p style="color:#374151;margin:0 0 8px;"><strong>Horario:</strong> ${classInfo.date} ${String(classInfo.start_time || '').slice(0, 5)} - ${String(classInfo.end_time || '').slice(0, 5)}</p>
              <p style="color:#374151;margin:0 0 8px;"><strong>Origen:</strong> Coach</p>
              <p style="color:#374151;margin:0 0 8px;"><strong>Motivo:</strong> Cancelación manual desde panel del coach</p>
              <p style="color:#111827;margin:14px 0 8px;"><strong>Alumnos notificados:</strong></p>
              <pre style="white-space:pre-wrap;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:10px;margin:0;">${notifiedLines.length ? notifiedLines.join('\n') : '- Sin alumnos inscritos'}</pre>
            `
          )
        })
        .catch((err) => console.error('Error correo de cancelación al negocio:', err?.message || err));
    }

    for (const participant of activeReservations) {
      if (!participant.email) continue;
      void emailService
        .sendEmail({
          to: participant.email,
          subject: `Tu clase fue cancelada - ${classInfo.type}`,
          html: buildEmailLayout(
            'Clase cancelada',
            'Actualización de clase',
            `
              <p style="color:#374151;line-height:1.6;margin:0 0 10px;">Hola ${participant.full_name || 'atleta'},</p>
              <p style="color:#374151;line-height:1.6;margin:0 0 10px;">Te avisamos que la clase <strong>${classInfo.type}</strong> (${classInfo.date} ${String(classInfo.start_time || '').slice(0, 5)} - ${String(classInfo.end_time || '').slice(0, 5)}) fue cancelada por el coach.</p>
              <p style="color:#374151;margin:0;">Tu crédito fue devuelto automáticamente.</p>
            `
          )
        })
        .catch((err) => console.error('Error correo de cancelación a alumno:', err?.message || err));
    }

    res.json({ success: true, refunded_students: affectedStudentIds.length });
  } catch {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: 'No se pudo cancelar la clase.' });
  } finally {
    client.release();
  }
});

app.delete('/api/classes/:id', async (req, res) => {
  const client = await pgPool.connect();
  try {
    const classId = req.params.id;
    await client.query('BEGIN');

    const activeReservations = await client.query(
      `
      SELECT id, user_id, suscripcion_id, beneficiario_id
      FROM reservations
      WHERE class_id = $1
        AND status = 'active'
        AND deleted_at IS NULL
      FOR UPDATE
    `,
      [classId]
    );

    for (const reservation of activeReservations.rows as any[]) {
      if (reservation.beneficiario_id) {
        await client.query(
          `UPDATE suscripcion_beneficiarios SET clases_restantes = clases_restantes + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [reservation.beneficiario_id]
        );
      }
      if (reservation.suscripcion_id) {
        await client.query(
          `UPDATE suscripciones_alumno SET clases_restantes = clases_restantes + 1, clases_consumidas = GREATEST(clases_consumidas - 1, 0), updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [reservation.suscripcion_id]
        );
      }
    }

    await client.query(
      `
      UPDATE reservations
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE class_id = $1
        AND status = 'active'
        AND deleted_at IS NULL
    `,
      [classId]
    );

    await client.query(
      `UPDATE classes SET status = 'canceled', real_time_status = 'canceled', deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [classId]
    );

    await client.query('COMMIT');
    const affectedStudentIds = Array.from(
      new Set((activeReservations.rows as any[]).map((r) => String(r.user_id || '').trim()).filter(Boolean))
    );
    for (const studentId of affectedStudentIds) {
      await syncStudentCredits(String(studentId));
    }
    res.json({ success: true, refunded_students: affectedStudentIds.length });
  } catch {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: 'No se pudo eliminar la clase.' });
  } finally {
    client.release();
  }
});

app.post('/api/reservations', async (req, res) => {
  const client = await pgPool.connect();
  let reservationPayload: any = null;
  try {
    const userId = String(req.body?.userId || '').trim();
    const classId = String(req.body?.classId || '').trim();
    if (!userId || !classId) {
      return res.status(400).json({ error: 'Faltan datos para crear la reservación.' });
    }

    await client.query('BEGIN');

    const existingReservation = await client.query(
      `
      SELECT id FROM reservations
      WHERE user_id = $1 AND class_id = $2 AND status = 'active' AND deleted_at IS NULL
    `,
      [userId, classId]
    );
    if (existingReservation.rowCount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ya tienes una reservación activa para esta clase.' });
    }

    const classInfoResult = await client.query(
      `
      SELECT id, date, start_time, end_time, status, min_capacity, max_capacity, capacity, COALESCE(type, '') AS type
      FROM classes
      WHERE id = $1 AND deleted_at IS NULL
    `,
      [classId]
    );
    const classInfo: any = classInfoResult.rows[0];
    if (!classInfo) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'La clase seleccionada no existe.' });
    }
    if (classInfo.status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Esta clase no está disponible para reservar.' });
    }

    const countResult = await client.query(
      `
      SELECT COUNT(*)::int AS total
      FROM reservations
      WHERE class_id = $1 AND status = 'active' AND deleted_at IS NULL
    `,
      [classId]
    );
    const currentReservations = Number(countResult.rows[0]?.total || 0);
    const maxCap = Number(classInfo.max_capacity || classInfo.capacity || 8);
    if (currentReservations >= maxCap) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Esta clase ya no tiene lugares disponibles.' });
    }

    const beneficiaryResult = await client.query(
      `
      SELECT
        sb.id,
        sb.suscripcion_id,
        sb.clases_restantes,
        sa.fecha_vencimiento,
        sa.estado AS suscripcion_estado,
        sa.congelado
      FROM suscripcion_beneficiarios sb
      JOIN suscripciones_alumno sa ON sa.id = sb.suscripcion_id
      WHERE sb.alumno_id = $1
        AND sb.estado = 'active'
        AND sb.clases_restantes > 0
        AND sb.deleted_at IS NULL
        AND sa.deleted_at IS NULL
        AND sa.estado = 'active'
      ORDER BY sa.fecha_vencimiento ASC
      LIMIT 1
    `,
      [userId]
    );
    const beneficiary: any = beneficiaryResult.rows[0];
    if (!beneficiary) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No tienes créditos suficientes para reservar esta clase.' });
    }
    if (Number(beneficiary.congelado || 0) === 1) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Tu suscripción está pausada temporalmente.' });
    }
    if (beneficiary.fecha_vencimiento && String(beneficiary.fecha_vencimiento).slice(0, 10) < classInfo.date) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Tu paquete no cubre la fecha de esta clase.' });
    }

    const reservationId = createId('res_');
    await client.query(
      `
      INSERT INTO reservations (id, user_id, class_id, suscripcion_id, beneficiario_id, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
      [reservationId, userId, classId, beneficiary.suscripcion_id, beneficiary.id]
    );

    await client.query(
      `
      UPDATE suscripcion_beneficiarios
      SET clases_restantes = clases_restantes - 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
      [beneficiary.id]
    );

    await client.query(
      `
      UPDATE suscripciones_alumno
      SET clases_restantes = GREATEST(clases_restantes - 1, 0),
          clases_consumidas = clases_consumidas + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
      [beneficiary.suscripcion_id]
    );

    await client.query('COMMIT');
    await syncStudentCredits(userId);

    const studentProfile = await getOne<any>(
      `SELECT id, full_name, email FROM profiles WHERE id = $1 AND deleted_at IS NULL`,
      [userId]
    );
    const cancellationDeadline = await calculateCancellationDeadline(classInfo.date, classInfo.start_time);
    reservationPayload = {
      to: String(studentProfile?.email || '').trim(),
      details: {
        fullName: String(studentProfile?.full_name || ''),
        className: String(classInfo.type || 'Clase'),
        classDate: String(classInfo.date || ''),
        startTime: String(classInfo.start_time || '').slice(0, 5),
        endTime: String(classInfo.end_time || '').slice(0, 5),
        ticketId: reservationId,
        minParticipants: Math.max(1, Number(classInfo.min_capacity || 1)),
        cancellationDeadlineLabel: cancellationDeadline.toLocaleString('es-MX', {
          timeZone: APP_TIMEZONE,
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        })
      }
    };

    res.json({
      success: true,
      reservationId,
      reservation: {
        id: reservationId,
        user_id: userId,
        class_id: classId,
        type: classInfo.type,
        date: classInfo.date,
        start_time: classInfo.start_time,
        end_time: classInfo.end_time
      }
    });
  } catch {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: 'No se pudo crear la reservación. Intenta de nuevo.' });
  } finally {
    client.release();
  }

  if (reservationPayload?.to) {
    void emailService.sendReservationConfirmationV2(reservationPayload.to, reservationPayload.details).catch((err) => {
      console.error('Error enviando confirmación de reserva:', err?.message || err);
    });
  }
});

app.delete('/api/reservations/:id', async (req, res) => {
  const client = await pgPool.connect();
  let cancellationMailPayload: any = null;
  try {
    const reservationId = req.params.id;
    await client.query('BEGIN');

    const reservationResult = await client.query(
      `
      SELECT r.*, c.date, c.start_time
      FROM reservations r
      JOIN classes c ON c.id = r.class_id
      WHERE r.id = $1 AND r.deleted_at IS NULL
    `,
      [reservationId]
    );
    const reservation: any = reservationResult.rows[0];
    if (!reservation) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No encontramos la reservación solicitada.' });
    }
    if (reservation.status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Esta reservación ya no está activa.' });
    }

    const deadline = await calculateCancellationDeadline(reservation.date, reservation.start_time);
    const canRefund = new Date() <= deadline;

    await client.query(
      `
      UPDATE reservations
      SET status = 'cancelled',
          cancellation_reason = 'cancelacion_usuario',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
      [reservationId]
    );

    if (canRefund && reservation.beneficiario_id && reservation.suscripcion_id) {
      await client.query(
        `
        UPDATE suscripcion_beneficiarios
        SET clases_restantes = clases_restantes + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
        [reservation.beneficiario_id]
      );
      await client.query(
        `
        UPDATE suscripciones_alumno
        SET clases_restantes = clases_restantes + 1,
            clases_consumidas = GREATEST(clases_consumidas - 1, 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
        [reservation.suscripcion_id]
      );
    }

    await client.query('COMMIT');
    await syncStudentCredits(reservation.user_id);

    const classMeta = await getOne<any>(`SELECT type, end_time FROM classes WHERE id = $1`, [reservation.class_id]);
    const studentProfile = await getOne<any>(
      `SELECT full_name, email, whatsapp_phone FROM profiles WHERE id = $1 AND deleted_at IS NULL`,
      [reservation.user_id]
    );
    const businessEmail = await getBusinessNotificationEmail();
    cancellationMailPayload = {
      studentEmail: String(studentProfile?.email || '').trim(),
      businessEmail: String(businessEmail || '').trim(),
      refunded: canRefund,
      reservationId,
      classType: String(classMeta?.type || 'Clase'),
      classDate: String(reservation.date || ''),
      classStart: String(reservation.start_time || '').slice(0, 5),
      classEnd: String(classMeta?.end_time || '').slice(0, 5),
      studentName: String(studentProfile?.full_name || 'Alumno'),
      studentWhatsapp: String(studentProfile?.whatsapp_phone || '')
    };

    res.json({ success: true, refunded: canRefund, cancellationDeadline: deadline.toISOString() });
  } catch {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: 'No se pudo cancelar la reservación.' });
  } finally {
    client.release();
  }

  if (cancellationMailPayload?.studentEmail) {
    void emailService
      .sendEmail({
        to: cancellationMailPayload.studentEmail,
        subject: `Cancelación de reserva - ${cancellationMailPayload.classType}`,
        html: buildEmailLayout(
          'Reserva cancelada',
          'Actualización de clase',
          `
            <p style="color:#374151;line-height:1.6;margin:0 0 12px;">Tu reserva para <strong>${cancellationMailPayload.classType}</strong> (${cancellationMailPayload.classDate} ${cancellationMailPayload.classStart}-${cancellationMailPayload.classEnd}) fue cancelada.</p>
            <p style="color:#374151;margin:0;">${cancellationMailPayload.refunded ? 'Tu crédito fue devuelto.' : 'Esta cancelación fue tardía y el crédito no es reembolsable.'}</p>
          `
        )
      })
      .catch((err) => console.error('Error enviando correo de cancelación al alumno:', err?.message || err));
  }

  if (cancellationMailPayload?.businessEmail) {
    void emailService
      .sendEmail({
        to: cancellationMailPayload.businessEmail,
        subject: `Cancelación de alumno - ${cancellationMailPayload.classType}`,
        html: buildEmailLayout(
          'Cancelación registrada',
          'Alerta interna',
          `
            <p style="color:#374151;margin:0 0 8px;"><strong>Alumno:</strong> ${cancellationMailPayload.studentName}</p>
            <p style="color:#374151;margin:0 0 8px;"><strong>Clase:</strong> ${cancellationMailPayload.classType}</p>
            <p style="color:#374151;margin:0 0 8px;"><strong>Horario:</strong> ${cancellationMailPayload.classDate} ${cancellationMailPayload.classStart}-${cancellationMailPayload.classEnd}</p>
            <p style="color:#374151;margin:0;"><strong>Reembolso:</strong> ${cancellationMailPayload.refunded ? 'Sí' : 'No (cancelación tardía)'}</p>
          `
        )
      })
      .catch((err) => console.error('Error enviando correo de cancelación al negocio:', err?.message || err));
  }
});

app.get('/api/students/:id/dashboard', async (req, res) => {
  try {
    const studentId = req.params.id;

    const activeSubscription = await getOne(
      `
      SELECT
        sa.id,
        sa.paquete_id,
        sa.fecha_vencimiento,
        sa.clases_totales,
        sa.clases_restantes,
        sa.clases_consumidas,
        sa.estado,
        sa.congelado,
        p.nombre AS package_name
      FROM suscripcion_beneficiarios sb
      JOIN suscripciones_alumno sa ON sa.id = sb.suscripcion_id
      LEFT JOIN paquetes p ON p.id = sa.paquete_id
      WHERE sb.alumno_id = $1
        AND sb.estado = 'active'
        AND sb.deleted_at IS NULL
        AND sa.deleted_at IS NULL
        AND sa.estado = 'active'
        AND COALESCE(sa.congelado, 0) = 0
      ORDER BY sa.fecha_vencimiento ASC
      LIMIT 1
    `,
      [studentId]
    );

    const upcomingReservations = await query(
      `
      WITH now_local AS (
        SELECT (NOW() AT TIME ZONE 'America/Mexico_City') AS ts
      )
      SELECT
        r.id,
        r.class_id,
        c.date,
        c.start_time,
        c.end_time,
        COALESCE(c.type, '') AS type
      FROM reservations r
      JOIN classes c ON c.id = r.class_id
      CROSS JOIN now_local n
      WHERE r.user_id = $1
        AND r.status = 'active'
        AND r.deleted_at IS NULL
        AND c.deleted_at IS NULL
        AND (
          c.date::date > n.ts::date
          OR (
            c.date::date = n.ts::date
            AND (
              CASE
                WHEN COALESCE(c.end_time, '') ~ '^[0-9]{1,2}:[0-9]{2}(:[0-9]{2})?$' THEN c.end_time::time
                WHEN COALESCE(c.start_time, '') ~ '^[0-9]{1,2}:[0-9]{2}(:[0-9]{2})?$' THEN c.start_time::time
                ELSE '00:00'::time
              END
            ) >= n.ts::time
          )
        )
      ORDER BY c.date ASC, c.start_time ASC
      LIMIT 5
    `,
      [studentId]
    );

    res.json({
      activeSubscription: activeSubscription || null,
      upcomingReservations
    });
  } catch {
    res.status(500).json({ error: 'No se pudo cargar el dashboard del alumno.' });
  }
});

app.patch('/api/profiles/:id/credits', async (req, res) => {
  try {
    const id = req.params.id;
    const credits = Number(req.body?.credits);
    if (!Number.isFinite(credits) || credits < 0) {
      return res.status(400).json({ error: 'El valor de créditos no es válido.' });
    }
    await query(`UPDATE profiles SET credits_remaining = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [id, credits]);
    const profile = await getOne(`SELECT * FROM profiles WHERE id = $1`, [id]);
    res.json({ success: true, profile: sanitizeProfile(profile) });
  } catch {
    res.status(500).json({ error: 'No se pudieron actualizar los créditos.' });
  }
});

app.get('/api/students', async (_req, res) => {
  try {
    const rows = await query(
      `
      SELECT id, email, full_name, role, credits_remaining, total_attended, whatsapp_phone, email_verified, created_at, updated_at
      FROM profiles
      WHERE role = 'student' AND deleted_at IS NULL
      ORDER BY full_name ASC
    `
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'No se pudieron obtener los alumnos.' });
  }
});

app.get('/api/coach/packages', async (_req, res) => {
  try {
    const rows = await query(
      `
      SELECT *
      FROM paquetes
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'No se pudieron obtener los paquetes.' });
  }
});

app.post('/api/coach/packages', async (req, res) => {
  try {
    const id = createId('pack_');
    const nombre = String(req.body?.nombre || req.body?.name || '').trim();
    const capacidad = Number(req.body?.capacidad ?? req.body?.capacity ?? 1);
    const numeroClases = Number(req.body?.numero_clases ?? req.body?.numeroClases ?? req.body?.total_clases ?? 0);
    const vigenciaSemanas = Number(req.body?.vigencia_semanas ?? req.body?.vigenciaSemanas ?? req.body?.vigencia ?? 0);
    const detalles = String(req.body?.detalles || req.body?.details || '').trim() || null;
    const precioBase = Number(req.body?.precio_base ?? req.body?.precioBase ?? 0);
    const estado = String(req.body?.estado || 'active');
    if (!nombre || capacidad < 1 || numeroClases < 1 || vigenciaSemanas < 1) {
      return res.status(400).json({ error: 'Completa correctamente los datos del paquete.' });
    }
    if (numeroClases % capacidad !== 0) {
      return res.status(400).json({ error: 'El total de clases debe ser divisible equitativamente entre la capacidad del paquete.' });
    }
    await query(
      `
      INSERT INTO paquetes (id, nombre, capacidad, numero_clases, vigencia_semanas, detalles, precio_base, estado, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
    `,
      [id, nombre, capacidad, numeroClases, vigenciaSemanas, detalles, precioBase, estado]
    );
    const created = await getOne(`SELECT * FROM paquetes WHERE id = $1`, [id]);
    res.status(201).json(created);
  } catch {
    res.status(500).json({ error: 'No se pudo crear el paquete.' });
  }
});

app.put('/api/coach/packages/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const nombre = String(req.body?.nombre || req.body?.name || '').trim();
    const capacidad = Number(req.body?.capacidad ?? req.body?.capacity ?? 1);
    const numeroClases = Number(req.body?.numero_clases ?? req.body?.numeroClases ?? req.body?.total_clases ?? 0);
    const vigenciaSemanas = Number(req.body?.vigencia_semanas ?? req.body?.vigenciaSemanas ?? req.body?.vigencia ?? 0);
    const detalles = String(req.body?.detalles || req.body?.details || '').trim() || null;
    const precioBase = Number(req.body?.precio_base ?? req.body?.precioBase ?? 0);
    const estado = String(req.body?.estado || 'active');
    if (!nombre || capacidad < 1 || numeroClases < 1 || vigenciaSemanas < 1) {
      return res.status(400).json({ error: 'Completa correctamente los datos del paquete.' });
    }
    if (numeroClases % capacidad !== 0) {
      return res.status(400).json({ error: 'El total de clases debe ser divisible equitativamente entre la capacidad del paquete.' });
    }
    await query(
      `
      UPDATE paquetes
      SET nombre=$2, capacidad=$3, numero_clases=$4, vigencia_semanas=$5, detalles=$6, precio_base=$7, estado=$8, updated_at=CURRENT_TIMESTAMP
      WHERE id=$1
    `,
      [id, nombre, capacidad, numeroClases, vigenciaSemanas, detalles, precioBase, estado]
    );
    const updated = await getOne(`SELECT * FROM paquetes WHERE id = $1`, [id]);
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'No se pudo actualizar el paquete.' });
  }
});

app.delete('/api/coach/packages/:id', async (req, res) => {
  try {
    await query(`UPDATE paquetes SET deleted_at = CURRENT_TIMESTAMP, estado='inactive', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [
      req.params.id
    ]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'No se pudo dar de baja el paquete.' });
  }
});

app.get('/api/coach/highlights', async (_req, res) => {
  try {
    const rows = await query(
      `
      SELECT
        id,
        title,
        subtitle,
        image_url,
        cta_label,
        cta_url,
        start_at,
        end_at,
        sort_order,
        is_active,
        created_by,
        updated_by,
        created_at,
        updated_at
      FROM coach_highlights
      WHERE deleted_at IS NULL
      ORDER BY sort_order ASC, created_at DESC
    `
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'No se pudieron obtener los highlights del negocio.' });
  }
});

app.post('/api/coach/highlights', async (req, res) => {
  try {
    const title = String(req.body?.title || '').trim();
    const subtitle = normalizeOptionalText(req.body?.subtitle);
    const imageUrl = normalizeOptionalText(req.body?.image_url || req.body?.imageUrl);
    const ctaLabel = normalizeOptionalText(req.body?.cta_label || req.body?.ctaLabel);
    const ctaUrl = normalizeOptionalText(req.body?.cta_url || req.body?.ctaUrl);
    const startAt = normalizeOptionalTimestamp(req.body?.start_at || req.body?.startAt);
    const endAt = normalizeOptionalTimestamp(req.body?.end_at || req.body?.endAt);
    const sortOrder = normalizeInteger(req.body?.sort_order ?? req.body?.sortOrder, 0);
    const isActive = normalizeActiveFlag(req.body?.is_active ?? req.body?.isActive, 1);
    const actorId = normalizeOptionalText(req.body?.actor_id || req.body?.actorId);

    if (!title) {
      return res.status(400).json({ error: 'El título del highlight es obligatorio.' });
    }
    if (startAt && endAt && new Date(endAt).getTime() < new Date(startAt).getTime()) {
      return res.status(400).json({ error: 'La vigencia final no puede ser menor a la vigencia inicial.' });
    }

    const id = createId('hl_');
    await query(
      `
      INSERT INTO coach_highlights (
        id, title, subtitle, image_url, cta_label, cta_url, start_at, end_at, sort_order, is_active, created_by, updated_by, created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
      )
    `,
      [id, title, subtitle, imageUrl, ctaLabel, ctaUrl, startAt, endAt, sortOrder, isActive, actorId]
    );
    const created = await getOne(
      `
      SELECT
        id, title, subtitle, image_url, cta_label, cta_url, start_at, end_at, sort_order, is_active, created_by, updated_by, created_at, updated_at
      FROM coach_highlights
      WHERE id = $1
    `,
      [id]
    );
    res.status(201).json(created);
  } catch {
    res.status(500).json({ error: 'No se pudo crear el highlight.' });
  }
});

app.put('/api/coach/highlights/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const existing = await getOne(`SELECT id FROM coach_highlights WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (!existing) {
      return res.status(404).json({ error: 'No encontramos el highlight que intentas editar.' });
    }

    const title = String(req.body?.title || '').trim();
    const subtitle = normalizeOptionalText(req.body?.subtitle);
    const imageUrl = normalizeOptionalText(req.body?.image_url || req.body?.imageUrl);
    const ctaLabel = normalizeOptionalText(req.body?.cta_label || req.body?.ctaLabel);
    const ctaUrl = normalizeOptionalText(req.body?.cta_url || req.body?.ctaUrl);
    const startAt = normalizeOptionalTimestamp(req.body?.start_at || req.body?.startAt);
    const endAt = normalizeOptionalTimestamp(req.body?.end_at || req.body?.endAt);
    const sortOrder = normalizeInteger(req.body?.sort_order ?? req.body?.sortOrder, 0);
    const isActive = normalizeActiveFlag(req.body?.is_active ?? req.body?.isActive, 1);
    const actorId = normalizeOptionalText(req.body?.actor_id || req.body?.actorId);

    if (!title) {
      return res.status(400).json({ error: 'El título del highlight es obligatorio.' });
    }
    if (startAt && endAt && new Date(endAt).getTime() < new Date(startAt).getTime()) {
      return res.status(400).json({ error: 'La vigencia final no puede ser menor a la vigencia inicial.' });
    }

    await query(
      `
      UPDATE coach_highlights
      SET title = $2,
          subtitle = $3,
          image_url = $4,
          cta_label = $5,
          cta_url = $6,
          start_at = $7,
          end_at = $8,
          sort_order = $9,
          is_active = $10,
          updated_by = $11,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND deleted_at IS NULL
    `,
      [id, title, subtitle, imageUrl, ctaLabel, ctaUrl, startAt, endAt, sortOrder, isActive, actorId]
    );
    const updated = await getOne(
      `
      SELECT
        id, title, subtitle, image_url, cta_label, cta_url, start_at, end_at, sort_order, is_active, created_by, updated_by, created_at, updated_at
      FROM coach_highlights
      WHERE id = $1
    `,
      [id]
    );
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'No se pudo actualizar el highlight.' });
  }
});

app.delete('/api/coach/highlights/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await query(
      `
      UPDATE coach_highlights
      SET deleted_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND deleted_at IS NULL
    `,
      [id]
    );
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'No se pudo eliminar el highlight.' });
  }
});

app.patch('/api/coach/highlights/:id/toggle', async (req, res) => {
  try {
    const id = req.params.id;
    const isActive = normalizeActiveFlag(req.body?.is_active ?? req.body?.isActive, 1);
    const actorId = normalizeOptionalText(req.body?.actor_id || req.body?.actorId);
    const existing = await getOne(`SELECT id FROM coach_highlights WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (!existing) {
      return res.status(404).json({ error: 'No encontramos el highlight que intentas actualizar.' });
    }

    await query(
      `
      UPDATE coach_highlights
      SET is_active = $2,
          updated_by = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND deleted_at IS NULL
    `,
      [id, isActive, actorId]
    );
    const updated = await getOne(
      `
      SELECT
        id, title, subtitle, image_url, cta_label, cta_url, start_at, end_at, sort_order, is_active, created_by, updated_by, created_at, updated_at
      FROM coach_highlights
      WHERE id = $1
    `,
      [id]
    );
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'No se pudo actualizar el estado del highlight.' });
  }
});

app.get('/api/highlights/active', async (_req, res) => {
  try {
    const rows = await query(
      `
      SELECT
        id,
        title,
        subtitle,
        image_url,
        cta_label,
        cta_url,
        start_at,
        end_at,
        sort_order
      FROM coach_highlights
      WHERE deleted_at IS NULL
        AND is_active = 1
        AND (start_at IS NULL OR start_at <= CURRENT_TIMESTAMP)
        AND (end_at IS NULL OR end_at >= CURRENT_TIMESTAMP)
      ORDER BY sort_order ASC, created_at DESC
    `
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'No se pudieron obtener los highlights activos.' });
  }
});

app.post('/api/coach/subscriptions', async (req, res) => {
  const client = await pgPool.connect();
  try {
    const alumnoId = String(req.body?.alumno_id || req.body?.alumnoId || req.body?.studentId || '').trim();
    const paqueteId = String(req.body?.paquete_id || req.body?.paqueteId || req.body?.packageId || '').trim();
    const reuseActiveSubscription = Boolean(
      req.body?.reuse_active_subscription ?? req.body?.reuseActiveSubscription ?? false
    );
    const rawMonto = req.body?.monto ?? req.body?.amount;
    const parsedMonto = Number(rawMonto);
    const metodoPago = String(req.body?.metodo_pago || req.body?.metodoPago || req.body?.paymentMethod || 'Transferencia').trim();
    const referencia = String(req.body?.referencia || req.body?.reference || '').trim() || null;
    if (!alumnoId || !paqueteId) return res.status(400).json({ error: 'Alumno y paquete son obligatorios.' });

    const pkgRes = await client.query(`SELECT * FROM paquetes WHERE id = $1 AND deleted_at IS NULL`, [paqueteId]);
    const pkg: any = pkgRes.rows[0];
    if (!pkg) return res.status(404).json({ error: 'El paquete seleccionado no existe.' });

    await client.query('BEGIN');
    const totalClases = Number(pkg.numero_clases || 0);
    const assigned = Math.floor(totalClases / Math.max(Number(pkg.capacidad || 1), 1));
    const packagePrice = Number(pkg.precio_base || 0);
    const finalAmount = Number.isFinite(parsedMonto) && parsedMonto >= 0 ? parsedMonto : packagePrice;
    const actorId = String(req.body?.actor_id || 'coach').trim() || 'coach';

    let subId = createId('subs_');
    let reused = false;

    if (reuseActiveSubscription) {
      const existingSubRes = await client.query(
        `
        SELECT id, fecha_vencimiento
        FROM suscripciones_alumno
        WHERE alumno_id = $1
          AND paquete_id = $2
          AND estado = 'active'
          AND deleted_at IS NULL
        ORDER BY fecha_vencimiento DESC, created_at DESC
        LIMIT 1
        FOR UPDATE
      `,
        [alumnoId, paqueteId]
      );

      const existingSub: any = existingSubRes.rows[0];
      if (existingSub) {
        reused = true;
        subId = String(existingSub.id);

        const now = new Date();
        const currentExpiry = existingSub.fecha_vencimiento ? new Date(existingSub.fecha_vencimiento) : now;
        const expiryBase = currentExpiry.getTime() > now.getTime() ? currentExpiry : now;
        const newExpiry = new Date(expiryBase);
        newExpiry.setDate(newExpiry.getDate() + Number(pkg.vigencia_semanas || 0) * 7);

        await client.query(
          `
          UPDATE suscripciones_alumno
          SET clases_totales = clases_totales + $2,
              clases_restantes = clases_restantes + $2,
              fecha_vencimiento = $3,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
          [subId, totalClases, newExpiry.toISOString()]
        );

        const titularRes = await client.query(
          `
          SELECT id, clases_asignadas, clases_restantes
          FROM suscripcion_beneficiarios
          WHERE suscripcion_id = $1
            AND alumno_id = $2
            AND es_titular = 1
            AND deleted_at IS NULL
          LIMIT 1
          FOR UPDATE
        `,
          [subId, alumnoId]
        );
        const titular: any = titularRes.rows[0];
        const before = Number(titular?.clases_restantes || 0);
        const after = before + assigned;

        if (titular) {
          await client.query(
            `
            UPDATE suscripcion_beneficiarios
            SET clases_asignadas = COALESCE(clases_asignadas, 0) + $2,
                clases_restantes = COALESCE(clases_restantes, 0) + $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `,
            [titular.id, assigned]
          );
        } else {
          await client.query(
            `
            INSERT INTO suscripcion_beneficiarios (
              id, suscripcion_id, alumno_id, es_titular, clases_asignadas, clases_restantes, estado, created_at, updated_at
            ) VALUES ($1,$2,$3,1,$4,$4,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
          `,
            [createId('sb_'), subId, alumnoId, assigned]
          );
        }

        await client.query(
          `
          INSERT INTO ajustes_credito (
            id, alumno_id, suscripcion_id, actor_id, ajuste, motivo, clases_restantes_antes, clases_restantes_despues, created_at, updated_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
        `,
          [
            createId('adj_'),
            alumnoId,
            subId,
            actorId,
            assigned,
            `Reutilizacion de suscripcion activa (${pkg.nombre || 'paquete'})`,
            before,
            after
          ]
        );
      }
    }

    if (!reused) {
      const fechaCompra = new Date();
      const fechaVencimiento = new Date(fechaCompra);
      fechaVencimiento.setDate(fechaVencimiento.getDate() + Number(pkg.vigencia_semanas || 0) * 7);
      await client.query(
        `
        INSERT INTO suscripciones_alumno (
          id, alumno_id, paquete_id, fecha_compra, fecha_vencimiento, clases_totales, clases_restantes, clases_consumidas, estado, created_at, updated_at
        ) VALUES ($1,$2,$3,CURRENT_TIMESTAMP,$4,$5,$5,0,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
      `,
        [subId, alumnoId, paqueteId, fechaVencimiento.toISOString(), totalClases]
      );

      const titularId = createId('sb_');
      await client.query(
        `
        INSERT INTO suscripcion_beneficiarios (
          id, suscripcion_id, alumno_id, es_titular, clases_asignadas, clases_restantes, estado, created_at, updated_at
        ) VALUES ($1,$2,$3,1,$4,$4,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
      `,
        [titularId, subId, alumnoId, assigned]
      );
    }

    await client.query(
      `
      INSERT INTO transacciones_pago (id, suscripcion_id, alumno_id, paquete_id, monto, metodo_pago, referencia, fecha_pago, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
    `,
      [createId('pay_'), subId, alumnoId, paqueteId, finalAmount, metodoPago, referencia]
    );

    await client.query('COMMIT');
    await syncStudentCredits(alumnoId);
    const created = await getOne(`SELECT * FROM suscripciones_alumno WHERE id = $1`, [subId]);
    res.status(201).json({ ...created, reused });
  } catch {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: 'No se pudo registrar la suscripción.' });
  } finally {
    client.release();
  }
});

app.get('/api/coach/subscriptions/:subscriptionId/beneficiaries', async (req, res) => {
  try {
    const rows = await query(
      `
      SELECT sb.*, p.full_name, p.email, p.whatsapp_phone
      FROM suscripcion_beneficiarios sb
      JOIN profiles p ON p.id = sb.alumno_id
      WHERE sb.suscripcion_id = $1 AND sb.deleted_at IS NULL
      ORDER BY sb.es_titular DESC, p.full_name ASC
    `,
      [req.params.subscriptionId]
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'No se pudieron obtener los beneficiarios.' });
  }
});

app.post('/api/coach/subscriptions/:subscriptionId/beneficiaries', async (req, res) => {
  const client = await pgPool.connect();
  try {
    const subscriptionId = req.params.subscriptionId;
    const alumnoId = String(req.body?.alumno_id || req.body?.alumnoId || req.body?.studentId || '').trim();
    if (!alumnoId) return res.status(400).json({ error: 'Selecciona un alumno para agregar como beneficiario.' });

    await client.query('BEGIN');
    const subRes = await client.query(
      `
      SELECT sa.id, sa.clases_totales, pa.capacidad
      FROM suscripciones_alumno sa
      JOIN paquetes pa ON pa.id = sa.paquete_id
      WHERE sa.id = $1 AND sa.deleted_at IS NULL
    `,
      [subscriptionId]
    );
    const sub: any = subRes.rows[0];
    if (!sub) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No se encontró la suscripción.' });
    }

    const countRes = await client.query(
      `SELECT COUNT(*)::int AS total FROM suscripcion_beneficiarios WHERE suscripcion_id = $1 AND deleted_at IS NULL`,
      [subscriptionId]
    );
    const currentCount = Number(countRes.rows[0]?.total || 0);
    if (currentCount >= Number(sub.capacidad || 1)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'La suscripción ya alcanzó su capacidad máxima de beneficiarios.' });
    }

    await client.query(
      `
      INSERT INTO suscripcion_beneficiarios (id, suscripcion_id, alumno_id, es_titular, clases_asignadas, clases_restantes, estado, created_at, updated_at)
      VALUES ($1,$2,$3,0,0,0,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
      ON CONFLICT (suscripcion_id, alumno_id) DO NOTHING
    `,
      [createId('sb_'), subscriptionId, alumnoId]
    );

    const allBenefRes = await client.query(
      `
      SELECT id, alumno_id, es_titular
      FROM suscripcion_beneficiarios
      WHERE suscripcion_id = $1 AND deleted_at IS NULL
      ORDER BY es_titular DESC, created_at ASC
    `,
      [subscriptionId]
    );
    const beneficiaries = allBenefRes.rows;
    const n = Math.max(beneficiaries.length, 1);
    const total = Number(sub.clases_totales || 0);
    const base = Math.floor(total / n);
    let remainder = total - base * n;
    for (const b of beneficiaries as any[]) {
      const add = remainder > 0 ? 1 : 0;
      if (remainder > 0) remainder -= 1;
      const assigned = base + add;
      await client.query(
        `
        UPDATE suscripcion_beneficiarios
        SET clases_asignadas = $2, clases_restantes = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
        [b.id, assigned]
      );
      await syncStudentCredits(b.alumno_id);
    }
    await client.query('COMMIT');
    const rows = await query(
      `
      SELECT sb.*, p.full_name, p.email
      FROM suscripcion_beneficiarios sb
      JOIN profiles p ON p.id = sb.alumno_id
      WHERE sb.suscripcion_id = $1 AND sb.deleted_at IS NULL
      ORDER BY sb.es_titular DESC, p.full_name ASC
    `,
      [subscriptionId]
    );
    res.status(201).json(rows);
  } catch {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: 'No se pudo agregar el beneficiario.' });
  } finally {
    client.release();
  }
});

app.post('/api/coach/subscriptions/:subscriptionId/freeze', async (req, res) => {
  try {
    const subscriptionId = req.params.subscriptionId;
    const action = String(req.body?.action || 'pause');
    const beneficiaryRows = await query<{ alumno_id: string }>(
      `
      SELECT alumno_id
      FROM suscripcion_beneficiarios
      WHERE suscripcion_id = $1
        AND deleted_at IS NULL
    `,
      [subscriptionId]
    );
    const affectedStudentIds = Array.from(
      new Set((beneficiaryRows || []).map((row) => String(row.alumno_id || '').trim()).filter(Boolean))
    );

    if (action === 'pause') {
      await query(
        `
        UPDATE suscripciones_alumno
        SET congelado = 1, freeze_iniciado_en = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
        [subscriptionId]
      );
    } else {
      const sub = await getOne<{ freeze_iniciado_en: string | null; fecha_vencimiento: string }>(
        `SELECT freeze_iniciado_en, fecha_vencimiento FROM suscripciones_alumno WHERE id = $1`,
        [subscriptionId]
      );
      if (sub?.freeze_iniciado_en) {
        const start = new Date(sub.freeze_iniciado_en);
        const now = new Date();
        const diffDays = Math.max(0, Math.ceil((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
        await query(
          `
          UPDATE suscripciones_alumno
          SET congelado = 0,
              freeze_iniciado_en = NULL,
              dias_congelados = COALESCE(dias_congelados, 0) + $2,
              fecha_vencimiento = (fecha_vencimiento + ($2 || ' days')::interval),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
          [subscriptionId, String(diffDays)]
        );
      } else {
        await query(
          `UPDATE suscripciones_alumno SET congelado = 0, freeze_iniciado_en = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [subscriptionId]
        );
      }
    }
    for (const studentId of affectedStudentIds) {
      await syncStudentCredits(String(studentId));
    }
    const updated = await getOne(`SELECT * FROM suscripciones_alumno WHERE id = $1`, [subscriptionId]);
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'No se pudo actualizar el estado de congelamiento.' });
  }
});

app.post('/api/coach/subscriptions/:subscriptionId/unassign', async (req, res) => {
  const client = await pgPool.connect();
  try {
    const subscriptionId = req.params.subscriptionId;
    const alumnoId = String(req.body?.alumno_id || req.body?.alumnoId || req.body?.studentId || '').trim();
    const actorId = String(req.body?.actor_id || 'coach').trim() || 'coach';
    if (!subscriptionId || !alumnoId) {
      return res.status(400).json({ error: 'Suscripcion y alumno son obligatorios para desasignar.' });
    }

    await client.query('BEGIN');

    const subRes = await client.query(
      `
      SELECT id
      FROM suscripciones_alumno
      WHERE id = $1
        AND deleted_at IS NULL
      FOR UPDATE
    `,
      [subscriptionId]
    );
    const subscription: any = subRes.rows[0];
    if (!subscription) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No encontramos la suscripcion seleccionada.' });
    }

    const targetRes = await client.query(
      `
      SELECT id, es_titular, clases_restantes
      FROM suscripcion_beneficiarios
      WHERE suscripcion_id = $1
        AND alumno_id = $2
        AND deleted_at IS NULL
      LIMIT 1
      FOR UPDATE
    `,
      [subscriptionId, alumnoId]
    );
    const target: any = targetRes.rows[0];
    if (!target) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No encontramos al alumno dentro de la suscripcion seleccionada.' });
    }

    const affectedStudentIds = new Set<string>();

    if (Number(target.es_titular || 0) === 1) {
      const allBeneficiariesRes = await client.query(
        `
        SELECT id, alumno_id, clases_restantes
        FROM suscripcion_beneficiarios
        WHERE suscripcion_id = $1
          AND deleted_at IS NULL
        FOR UPDATE
      `,
        [subscriptionId]
      );

      for (const beneficiary of allBeneficiariesRes.rows as any[]) {
        const before = Number(beneficiary.clases_restantes || 0);
        await client.query(
          `
          UPDATE suscripcion_beneficiarios
          SET estado = 'inactive',
              clases_asignadas = 0,
              clases_restantes = 0,
              deleted_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
          [beneficiary.id]
        );
        await client.query(
          `
          INSERT INTO ajustes_credito (
            id, alumno_id, suscripcion_id, actor_id, ajuste, motivo, clases_restantes_antes, clases_restantes_despues, created_at, updated_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
        `,
          [
            createId('adj_'),
            beneficiary.alumno_id,
            subscriptionId,
            actorId,
            -before,
            'Desasignacion de paquete por correccion manual',
            before
          ]
        );
        affectedStudentIds.add(String(beneficiary.alumno_id || '').trim());
      }

      await client.query(
        `
        UPDATE suscripciones_alumno
        SET estado = 'inactive',
            clases_restantes = 0,
            deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
        [subscriptionId]
      );
    } else {
      const before = Number(target.clases_restantes || 0);
      await client.query(
        `
        UPDATE suscripcion_beneficiarios
        SET estado = 'inactive',
            clases_asignadas = 0,
            clases_restantes = 0,
            deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
        [target.id]
      );
      await client.query(
        `
        UPDATE suscripciones_alumno
        SET clases_restantes = GREATEST(clases_restantes - $2, 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
        [subscriptionId, before]
      );
      await client.query(
        `
        INSERT INTO ajustes_credito (
          id, alumno_id, suscripcion_id, actor_id, ajuste, motivo, clases_restantes_antes, clases_restantes_despues, created_at, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
      `,
        [
          createId('adj_'),
          alumnoId,
          subscriptionId,
          actorId,
          -before,
          'Desasignacion de paquete por correccion manual',
          before
        ]
      );
      affectedStudentIds.add(alumnoId);
    }

    await client.query('COMMIT');

    for (const studentId of Array.from(affectedStudentIds)) {
      if (!studentId) continue;
      await syncStudentCredits(studentId);
    }

    const updated = await getOne(`SELECT * FROM suscripciones_alumno WHERE id = $1`, [subscriptionId]);
    res.json({ success: true, subscription: updated });
  } catch {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: 'No se pudo desasignar la suscripcion.' });
  } finally {
    client.release();
  }
});

app.put('/api/coach/students/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const fullName = String(req.body?.full_name || req.body?.fullName || '').trim();
    const emailVerified = req.body?.email_verified ?? req.body?.emailVerified;
    await query(
      `
      UPDATE profiles
      SET full_name = COALESCE(NULLIF($2, ''), full_name),
          email_verified = COALESCE($3::boolean, email_verified),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
      [id, fullName || null, emailVerified === undefined ? null : Boolean(emailVerified)]
    );
    const profile = await getOne(`SELECT * FROM profiles WHERE id = $1`, [id]);
    res.json(sanitizeProfile(profile));
  } catch {
    res.status(500).json({ error: 'No se pudo actualizar el alumno.' });
  }
});

app.post('/api/coach/students/:id/manual-credits', async (req, res) => {
  const client = await pgPool.connect();
  try {
    const alumnoId = req.params.id;
    const amount = Number(req.body?.amount ?? 0);
    const reason = String(req.body?.reason || 'Ajuste manual').trim();
    if (!Number.isFinite(amount) || amount === 0) {
      return res.status(400).json({ error: 'El ajuste de créditos debe ser un número distinto de cero.' });
    }
    await client.query('BEGIN');
    const beneficiaryRes = await client.query(
      `
      SELECT id, suscripcion_id, clases_restantes
      FROM suscripcion_beneficiarios
      WHERE alumno_id = $1
        AND estado = 'active'
        AND deleted_at IS NULL
      ORDER BY updated_at DESC
      LIMIT 1
    `,
      [alumnoId]
    );
    const beneficiary: any = beneficiaryRes.rows[0];
    if (beneficiary) {
      const before = Number(beneficiary.clases_restantes || 0);
      const after = Math.max(0, before + amount);
      const diff = after - before;
      await client.query(
        `UPDATE suscripcion_beneficiarios SET clases_restantes = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [beneficiary.id, after]
      );
      await client.query(
        `UPDATE suscripciones_alumno SET clases_restantes = GREATEST(clases_restantes + $2, 0), updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [beneficiary.suscripcion_id, diff]
      );
      await client.query(
        `
        INSERT INTO ajustes_credito (
          id, alumno_id, suscripcion_id, actor_id, ajuste, motivo, clases_restantes_antes, clases_restantes_despues, created_at, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
      `,
        [
          createId('adj_'),
          alumnoId,
          beneficiary.suscripcion_id,
          req.body?.actor_id || 'coach',
          diff,
          reason,
          before,
          after
        ]
      );
      await client.query('COMMIT');
      await syncStudentCredits(alumnoId);
      const profile = await getOne(`SELECT * FROM profiles WHERE id = $1`, [alumnoId]);
      return res.json({ success: true, profile: sanitizeProfile(profile) });
    }

    const profileRowRes = await client.query(
      `
      SELECT credits_remaining
      FROM profiles
      WHERE id = $1
        AND deleted_at IS NULL
      FOR UPDATE
    `,
      [alumnoId]
    );
    const profileRow: any = profileRowRes.rows[0];
    if (!profileRow) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No encontramos al alumno para ajustar creditos.' });
    }

    const before = Number(profileRow.credits_remaining || 0);
    const after = Math.max(0, before + amount);
    const diff = after - before;

    await client.query(
      `
      UPDATE profiles
      SET credits_remaining = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
      [alumnoId, after]
    );

    await client.query(
      `
      INSERT INTO ajustes_credito (
        id, alumno_id, suscripcion_id, actor_id, ajuste, motivo, clases_restantes_antes, clases_restantes_despues, created_at, updated_at
      )
      VALUES ($1,$2,NULL,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
    `,
      [createId('adj_'), alumnoId, req.body?.actor_id || 'coach', diff, reason, before, after]
    );

    await client.query('COMMIT');
    const profile = await getOne(`SELECT * FROM profiles WHERE id = $1`, [alumnoId]);
    return res.json({ success: true, profile: sanitizeProfile(profile) });
  } catch {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: 'No se pudo aplicar el ajuste de créditos.' });
  } finally {
    client.release();
  }
});

app.post('/api/coach/attendance', async (req, res) => {
  try {
    const alumnoId = String(req.body?.alumno_id || req.body?.alumnoId || req.body?.studentId || '').trim();
    const claseId = String(req.body?.clase_id || req.body?.claseId || req.body?.classId || '').trim();
    const estado = String(req.body?.estado || req.body?.status || 'attended').trim();
    if (!alumnoId || !claseId) {
      return res.status(400).json({ error: 'Alumno y clase son obligatorios para registrar asistencia.' });
    }
    const reservation = await getOne<{ suscripcion_id: string }>(
      `
      SELECT suscripcion_id
      FROM reservations
      WHERE user_id = $1 AND class_id = $2 AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `,
      [alumnoId, claseId]
    );
    if (!reservation?.suscripcion_id) {
      return res.status(404).json({ error: 'No encontramos una reservación asociada para este alumno en la clase seleccionada.' });
    }
    await query(
      `
      INSERT INTO registros_asistencia (
        id, alumno_id, clase_id, suscripcion_id, estado, asistio_en, registrado_por, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,CURRENT_TIMESTAMP,$6,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
    `,
      [createId('att_'), alumnoId, claseId, reservation.suscripcion_id, estado, req.body?.registrado_por || 'coach']
    );
    if (estado === 'attended' || estado === 'asistio') {
      await query(`UPDATE profiles SET total_attended = COALESCE(total_attended, 0) + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [
        alumnoId
      ]);
    }
    res.status(201).json({ success: true });
  } catch {
    res.status(500).json({ error: 'No se pudo registrar la asistencia.' });
  }
});

app.get('/api/coach/community', async (_req, res) => {
  try {
    const rows = await query(
      `
      SELECT
        p.id,
        p.email,
        p.full_name,
        p.email_verified,
        p.whatsapp_phone,
        p.credits_remaining,
        sa.id AS subscription_id,
        pa.nombre AS package_name,
        sa.fecha_vencimiento,
        sb.clases_restantes,
        COALESCE(
          (
            SELECT COALESCE(c2.type, '')
            FROM reservations r2
            JOIN classes c2 ON c2.id = r2.class_id
            WHERE r2.user_id = p.id
              AND r2.status = 'active'
              AND r2.deleted_at IS NULL
              AND c2.deleted_at IS NULL
              AND to_timestamp(c2.date || ' ' || c2.start_time, 'YYYY-MM-DD HH24:MI') >= NOW()
            ORDER BY c2.date ASC, c2.start_time ASC
            LIMIT 1
          ),
          ''
        ) AS proxima_clase
      FROM profiles p
      LEFT JOIN LATERAL (
        SELECT sb2.*
        FROM suscripcion_beneficiarios sb2
        JOIN suscripciones_alumno sa2 ON sa2.id = sb2.suscripcion_id
        WHERE sb2.alumno_id = p.id
          AND sb2.estado = 'active'
          AND sb2.deleted_at IS NULL
          AND sa2.deleted_at IS NULL
          AND sa2.estado = 'active'
        ORDER BY sa2.fecha_vencimiento ASC
        LIMIT 1
      ) sb ON true
      LEFT JOIN suscripciones_alumno sa ON sa.id = sb.suscripcion_id
      LEFT JOIN paquetes pa ON pa.id = sa.paquete_id
      WHERE p.role = 'student' AND p.deleted_at IS NULL
      ORDER BY p.full_name ASC
    `
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'No se pudo obtener la comunidad.' });
  }
});

app.get('/api/coach/whatsapp-templates', async (_req, res) => {
  try {
    const rows = await query(
      `
      SELECT *
      FROM whatsapp_templates
      WHERE is_active = 1
      ORDER BY created_at DESC
    `
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'No se pudieron obtener las plantillas de WhatsApp.' });
  }
});

app.post('/api/coach/whatsapp-templates', async (req, res) => {
  try {
    const id = createId('watpl_');
    const name = String(req.body?.name || '').trim();
    const body = String(req.body?.body || '').trim();
    const isDefault = Number(req.body?.is_default_cancellation || req.body?.isDefaultCancellation || 0) ? 1 : 0;
    if (!name || !body) return res.status(400).json({ error: 'El nombre y mensaje de la plantilla son obligatorios.' });

    if (isDefault) {
      await query(`UPDATE whatsapp_templates SET is_default_cancellation = 0, updated_at = CURRENT_TIMESTAMP`);
    }

    await query(
      `
      INSERT INTO whatsapp_templates (
        id, name, body, is_default_cancellation, is_active, created_by, updated_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, 1, $5, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
      [id, name, body, isDefault, req.body?.created_by || 'coach']
    );
    const created = await getOne(`SELECT * FROM whatsapp_templates WHERE id = $1`, [id]);
    res.status(201).json(created);
  } catch {
    res.status(500).json({ error: 'No se pudo guardar la plantilla.' });
  }
});

app.put('/api/coach/whatsapp-templates/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const name = String(req.body?.name || '').trim();
    const body = String(req.body?.body || '').trim();
    const isDefault = Number(req.body?.is_default_cancellation || req.body?.isDefaultCancellation || 0) ? 1 : 0;
    if (!name || !body) return res.status(400).json({ error: 'El nombre y mensaje de la plantilla son obligatorios.' });

    if (isDefault) {
      await query(`UPDATE whatsapp_templates SET is_default_cancellation = 0, updated_at = CURRENT_TIMESTAMP`);
    }

    await query(
      `
      UPDATE whatsapp_templates
      SET name = $2,
          body = $3,
          is_default_cancellation = $4,
          updated_by = $5,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
      [id, name, body, isDefault, req.body?.updated_by || 'coach']
    );
    const updated = await getOne(`SELECT * FROM whatsapp_templates WHERE id = $1`, [id]);
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'No se pudo actualizar la plantilla.' });
  }
});

app.delete('/api/coach/whatsapp-templates/:id', async (req, res) => {
  try {
    await query(`UPDATE whatsapp_templates SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [
      req.params.id
    ]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'No se pudo eliminar la plantilla.' });
  }
});

app.get('/api/coach/students/:id/subscriptions', async (req, res) => {
  try {
    const subscriptions = await query(
      `
      SELECT
        sa.*,
        pa.nombre AS package_name,
        pa.capacidad AS package_capacity,
        sb.es_titular,
        sb.clases_restantes AS alumno_clases_restantes,
        sb.clases_asignadas AS alumno_clases_asignadas,
        titular_sb.alumno_id AS titular_alumno_id,
        titular_p.full_name AS titular_nombre
      FROM suscripcion_beneficiarios sb
      JOIN suscripciones_alumno sa ON sa.id = sb.suscripcion_id
      LEFT JOIN paquetes pa ON pa.id = sa.paquete_id
      LEFT JOIN suscripcion_beneficiarios titular_sb
        ON titular_sb.suscripcion_id = sa.id
       AND titular_sb.es_titular = 1
       AND titular_sb.deleted_at IS NULL
      LEFT JOIN profiles titular_p ON titular_p.id = titular_sb.alumno_id
      WHERE sb.alumno_id = $1
        AND sb.deleted_at IS NULL
        AND sa.deleted_at IS NULL
      ORDER BY sa.created_at DESC
    `,
      [req.params.id]
    );
    const activity = await query(
      `
      SELECT
        'attendance' AS tipo,
        ra.estado AS estado,
        ra.asistio_en AS fecha,
        c.type AS clase,
        NULL::int AS ajuste,
        NULL::text AS motivo
      FROM registros_asistencia ra
      LEFT JOIN classes c ON c.id = ra.clase_id
      WHERE ra.alumno_id = $1 AND ra.deleted_at IS NULL
      UNION ALL
      SELECT
        'credit_adjustment' AS tipo,
        NULL::text AS estado,
        ac.created_at AS fecha,
        NULL::text AS clase,
        ac.ajuste AS ajuste,
        ac.motivo AS motivo
      FROM ajustes_credito ac
      WHERE ac.alumno_id = $1 AND ac.deleted_at IS NULL
      ORDER BY fecha DESC
      LIMIT 60
    `,
      [req.params.id]
    );
    res.json({ subscriptions, activity });
  } catch {
    res.status(500).json({ error: 'No se pudieron obtener las suscripciones del alumno.' });
  }
});

app.get('/api/coach/students/:id/history', async (req, res) => {
  try {
    const studentId = String(req.params.id || '').trim();
    if (!studentId) {
      return res.status(400).json({ error: 'ID de alumno invalido.' });
    }

    const attendance = await query<any>(
      `
      SELECT
        ra.id AS event_id,
        ra.estado,
        ra.asistio_en AS occurred_at,
        c.id AS class_id,
        c.type AS class_type,
        c.date AS class_date,
        c.start_time AS class_start_time,
        c.end_time AS class_end_time
      FROM registros_asistencia ra
      LEFT JOIN classes c ON c.id = ra.clase_id
      WHERE ra.alumno_id = $1
        AND ra.deleted_at IS NULL
      `,
      [studentId]
    );

    const reservations = await query<any>(
      `
      SELECT
        r.id AS reservation_id,
        r.status,
        r.cancellation_reason,
        r.created_at,
        r.updated_at,
        c.id AS class_id,
        c.type AS class_type,
        c.date AS class_date,
        c.start_time AS class_start_time,
        c.end_time AS class_end_time
      FROM reservations r
      LEFT JOIN classes c ON c.id = r.class_id
      WHERE r.user_id = $1
        AND r.deleted_at IS NULL
      `,
      [studentId]
    );

    const creditAdjustments = await query<any>(
      `
      SELECT
        ac.id AS event_id,
        ac.ajuste,
        ac.motivo,
        ac.clases_restantes_antes,
        ac.clases_restantes_despues,
        ac.created_at AS occurred_at
      FROM ajustes_credito ac
      WHERE ac.alumno_id = $1
        AND ac.deleted_at IS NULL
      `,
      [studentId]
    );

    const payments = await query<any>(
      `
      SELECT
        tp.id AS event_id,
        tp.monto,
        tp.moneda,
        tp.metodo_pago,
        tp.referencia,
        tp.fecha_pago AS occurred_at,
        pa.nombre AS package_name
      FROM transacciones_pago tp
      LEFT JOIN paquetes pa ON pa.id = tp.paquete_id
      WHERE tp.alumno_id = $1
        AND tp.deleted_at IS NULL
      `,
      [studentId]
    );
    const profileCredits = await getOne<{ credits_remaining: number }>(
      `SELECT credits_remaining FROM profiles WHERE id = $1 AND deleted_at IS NULL`,
      [studentId]
    );

    const formatEventDate = (dateValue: string | Date) => {
      const dt = new Date(dateValue);
      return {
        fecha: dt.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' }),
        hora: dt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
      };
    };

    const buildClassReference = (row: any) => {
      const type = String(row?.class_type || 'Clase');
      const date = String(row?.class_date || '').slice(0, 10);
      const start = String(row?.class_start_time || '').slice(0, 5);
      const end = String(row?.class_end_time || '').slice(0, 5);
      const dateAndTime = [date, start && end ? `${start}-${end}` : start].filter(Boolean).join(' ');
      return dateAndTime ? `${type} | ${dateAndTime}` : type;
    };

    const timeline: Array<any> = [];

    for (const row of attendance) {
      const when = row?.occurred_at || new Date().toISOString();
      const { fecha, hora } = formatEventDate(when);
      timeline.push({
        id: row.event_id,
        tipo: 'attendance',
        evento: 'Asistencia registrada',
        referencia: buildClassReference(row),
        ajuste: null,
        motivo: row.estado ? `Estado: ${row.estado}` : null,
        fecha,
        hora,
        timestamp: new Date(when).toISOString()
      });
    }

    for (const row of reservations) {
      const bookedAt = row?.created_at || new Date().toISOString();
      const bookedDate = formatEventDate(bookedAt);
      timeline.push({
        id: `${row.reservation_id}_booked`,
        tipo: 'reservation',
        evento: 'Reserva de clase',
        referencia: buildClassReference(row),
        ajuste: -1,
        motivo: 'Credito usado en reserva',
        fecha: bookedDate.fecha,
        hora: bookedDate.hora,
        timestamp: new Date(bookedAt).toISOString()
      });

      if (String(row?.status || '').toLowerCase() !== 'active') {
        const canceledAt = row?.updated_at || bookedAt;
        let refundDelta = 1;
        let refundReason = 'Credito devuelto por cancelacion del negocio.';

        if (String(row?.cancellation_reason || '') === 'cancelacion_usuario') {
          const cancellationDeadline = await calculateCancellationDeadline(
            String(row?.class_date || ''),
            String(row?.class_start_time || '')
          );
          const canceledDate = new Date(canceledAt);
          if (canceledDate > cancellationDeadline) {
            refundDelta = 0;
            refundReason = 'Cancelacion tardia: el credito no fue devuelto.';
          } else {
            refundReason = 'Cancelacion en tiempo: credito devuelto.';
          }
        }

        const canceledDateLabel = formatEventDate(canceledAt);
        timeline.push({
          id: `${row.reservation_id}_cancelled`,
          tipo: 'cancellation',
          evento: 'Cancelacion de reserva',
          referencia: buildClassReference(row),
          ajuste: refundDelta,
          motivo: refundReason,
          fecha: canceledDateLabel.fecha,
          hora: canceledDateLabel.hora,
          timestamp: new Date(canceledAt).toISOString()
        });
      }
    }

    for (const row of creditAdjustments) {
      const when = row?.occurred_at || new Date().toISOString();
      const { fecha, hora } = formatEventDate(when);
      const before = row?.clases_restantes_antes;
      const after = row?.clases_restantes_despues;
      const refParts = [];
      if (before != null) refParts.push(`Antes: ${before}`);
      if (after != null) refParts.push(`Despues: ${after}`);
      timeline.push({
        id: row.event_id,
        tipo: 'credit_adjustment',
        evento: 'Ajuste manual de creditos',
        referencia: refParts.join(' | ') || 'Ajuste de creditos',
        ajuste: Number(row?.ajuste || 0),
        motivo: row?.motivo || null,
        fecha,
        hora,
        timestamp: new Date(when).toISOString()
      });
    }

    for (const row of payments) {
      const when = row?.occurred_at || new Date().toISOString();
      const { fecha, hora } = formatEventDate(when);
      const amount = Number(row?.monto || 0);
      const money = Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
      const method = String(row?.metodo_pago || '').trim();
      const packageName = String(row?.package_name || 'Paquete');
      const parts = [`${packageName}`, `${money} ${String(row?.moneda || 'MXN')}`];
      if (method) parts.push(method);
      if (row?.referencia) parts.push(`Ref: ${row.referencia}`);
      timeline.push({
        id: row.event_id,
        tipo: 'package_sale',
        evento: 'Registro de pago de paquete',
        referencia: parts.join(' | '),
        ajuste: null,
        motivo: null,
        fecha,
        hora,
        timestamp: new Date(when).toISOString()
      });
    }

    const history = timeline
      .filter((item) => item?.timestamp)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 200);

    let rollingAfter = Number(profileCredits?.credits_remaining || 0);
    for (const event of history) {
      const delta = Number(event?.ajuste);
      if (Number.isFinite(delta)) {
        event.saldo_despues = rollingAfter;
        event.saldo_antes = rollingAfter - delta;
        rollingAfter = event.saldo_antes;
      } else {
        event.saldo_antes = null;
        event.saldo_despues = null;
      }
    }

    res.json({ studentId, history });
  } catch {
    res.status(500).json({ error: 'No se pudo obtener el historial del alumno.' });
  }
});

app.get('/api/coach/cash-cut', async (req, res) => {
  try {
    const year = req.query.year ? Number(req.query.year) : null;
    const month = req.query.month ? Number(req.query.month) : null;
    const startDate = req.query.startDate ? String(req.query.startDate) : null;
    const endDate = req.query.endDate ? String(req.query.endDate) : null;

    const params: any[] = [];
    const where = [`tp.deleted_at IS NULL`];

    if (startDate && endDate) {
      params.push(startDate, endDate);
      where.push(`DATE(tp.fecha_pago) BETWEEN $${params.length - 1} AND $${params.length}`);
    } else {
      if (year) {
        params.push(String(year));
        where.push(`EXTRACT(YEAR FROM tp.fecha_pago)::text = $${params.length}`);
      }
      if (month) {
        params.push(String(month));
        where.push(`EXTRACT(MONTH FROM tp.fecha_pago)::text = $${params.length}`);
      }
    }

    const totals = await getOne<{ total_ingresos: string; total_ventas: string }>(
      `
      SELECT
        COALESCE(SUM(tp.monto), 0)::text AS total_ingresos,
        COUNT(*)::text AS total_ventas
      FROM transacciones_pago tp
      WHERE ${where.join(' AND ')}
    `,
      params
    );

    const porPaquete = await query(
      `
      SELECT
        COALESCE(pa.nombre, 'Paquete sin nombre') AS paquete,
        COUNT(*)::int AS ventas,
        COALESCE(SUM(tp.monto), 0)::numeric AS ingresos
      FROM transacciones_pago tp
      LEFT JOIN paquetes pa ON pa.id = tp.paquete_id
      WHERE ${where.join(' AND ')}
      GROUP BY COALESCE(pa.nombre, 'Paquete sin nombre')
      ORDER BY ingresos DESC
    `,
      params
    );

    const diario = await query(
      `
      SELECT
        to_char(DATE(tp.fecha_pago), 'YYYY-MM-DD') AS periodo,
        COUNT(*)::int AS ventas,
        COALESCE(SUM(tp.monto), 0)::numeric AS ingresos
      FROM transacciones_pago tp
      WHERE ${where.join(' AND ')}
      GROUP BY DATE(tp.fecha_pago)
      ORDER BY DATE(tp.fecha_pago) ASC
    `,
      params
    );

    const semanal = await query(
      `
      SELECT
        to_char(date_trunc('week', tp.fecha_pago), 'IYYY-"W"IW') AS periodo,
        COUNT(*)::int AS ventas,
        COALESCE(SUM(tp.monto), 0)::numeric AS ingresos
      FROM transacciones_pago tp
      WHERE ${where.join(' AND ')}
      GROUP BY date_trunc('week', tp.fecha_pago)
      ORDER BY date_trunc('week', tp.fecha_pago) ASC
    `,
      params
    );

    const mensual = await query(
      `
      SELECT
        to_char(date_trunc('month', tp.fecha_pago), 'YYYY-MM') AS periodo,
        COUNT(*)::int AS ventas,
        COALESCE(SUM(tp.monto), 0)::numeric AS ingresos
      FROM transacciones_pago tp
      WHERE ${where.join(' AND ')}
      GROUP BY date_trunc('month', tp.fecha_pago)
      ORDER BY date_trunc('month', tp.fecha_pago) ASC
    `,
      params
    );

    const anual = await query(
      `
      SELECT
        to_char(date_trunc('year', tp.fecha_pago), 'YYYY') AS periodo,
        COUNT(*)::int AS ventas,
        COALESCE(SUM(tp.monto), 0)::numeric AS ingresos
      FROM transacciones_pago tp
      WHERE ${where.join(' AND ')}
      GROUP BY date_trunc('year', tp.fecha_pago)
      ORDER BY date_trunc('year', tp.fecha_pago) ASC
    `,
      params
    );

    const availableYearsRows = await query<{ year: number }>(
      `
      SELECT DISTINCT EXTRACT(YEAR FROM fecha_pago)::int AS year
      FROM transacciones_pago
      WHERE deleted_at IS NULL
      ORDER BY year DESC
    `
    );
    const availableMonthsRows = await query<{ month: number }>(
      `
      SELECT DISTINCT EXTRACT(MONTH FROM fecha_pago)::int AS month
      FROM transacciones_pago
      WHERE deleted_at IS NULL
        AND ($1::int IS NULL OR EXTRACT(YEAR FROM fecha_pago)::int = $1::int)
      ORDER BY month ASC
    `,
      [year || null]
    );

    res.json({
      paquetesVendidos: Number(totals?.total_ventas || 0),
      ingresosTotales: Number(totals?.total_ingresos || 0),
      porPaquete,
      desglose: { diario, semanal, mensual, anual },
      availableYears: availableYearsRows.map((r) => Number(r.year)),
      availableMonths: availableMonthsRows.map((r) => Number(r.month)),
      selectedYear: year || new Date().getFullYear(),
      selectedMonth: month || null,
      range: {
        startDate: startDate || null,
        endDate: endDate || null
      }
    });
  } catch {
    res.status(500).json({ error: 'No se pudo generar el corte de caja.' });
  }
});

app.get('/api/coach/analytics', async (_req, res) => {
  try {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;

    const currentMonthClasses = await getOne<{ total: string }>(
      `
      SELECT COUNT(*)::text AS total
      FROM classes
      WHERE deleted_at IS NULL
        AND EXTRACT(YEAR FROM to_date(date, 'YYYY-MM-DD'))::int = $1
        AND EXTRACT(MONTH FROM to_date(date, 'YYYY-MM-DD'))::int = $2
    `,
      [y, m]
    );
    const currentYearClasses = await getOne<{ total: string }>(
      `
      SELECT COUNT(*)::text AS total
      FROM classes
      WHERE deleted_at IS NULL
        AND EXTRACT(YEAR FROM to_date(date, 'YYYY-MM-DD'))::int = $1
    `,
      [y]
    );

    const mostReservedClass = await getOne<{ type: string; count: number }>(
      `
      SELECT COALESCE(c.type, 'Clase') AS type, COUNT(*)::int AS count
      FROM reservations r
      JOIN classes c ON c.id = r.class_id
      WHERE r.deleted_at IS NULL
      GROUP BY COALESCE(c.type, 'Clase')
      ORDER BY count DESC
      LIMIT 1
    `
    );

    const monthlyStats = await query(
      `
      SELECT
        to_char(date_trunc('month', to_date(c.date, 'YYYY-MM-DD')), 'TMMonth YYYY') AS month,
        COUNT(DISTINCT c.id)::int AS classes,
        COUNT(r.id)::int AS reservations
      FROM classes c
      LEFT JOIN reservations r ON r.class_id = c.id AND r.deleted_at IS NULL
      WHERE c.deleted_at IS NULL
        AND EXTRACT(YEAR FROM to_date(c.date, 'YYYY-MM-DD'))::int = $1
      GROUP BY date_trunc('month', to_date(c.date, 'YYYY-MM-DD'))
      ORDER BY date_trunc('month', to_date(c.date, 'YYYY-MM-DD')) ASC
    `,
      [y]
    );

    const yearlyReservations = await getOne<{ total: string }>(
      `
      SELECT COUNT(*)::text AS total
      FROM reservations r
      JOIN classes c ON c.id = r.class_id
      WHERE r.deleted_at IS NULL
        AND c.deleted_at IS NULL
        AND EXTRACT(YEAR FROM to_date(c.date, 'YYYY-MM-DD'))::int = $1
    `,
      [y]
    );

    const yearlyCompleted = await getOne<{ total: string }>(
      `
      SELECT COUNT(*)::text AS total
      FROM registros_asistencia ra
      JOIN classes c ON c.id = ra.clase_id
      WHERE ra.deleted_at IS NULL
        AND c.deleted_at IS NULL
        AND EXTRACT(YEAR FROM to_date(c.date, 'YYYY-MM-DD'))::int = $1
    `,
      [y]
    );

    res.json({
      currentMonthClasses: Number(currentMonthClasses?.total || 0),
      currentYearClasses: Number(currentYearClasses?.total || 0),
      mostReservedClass: mostReservedClass || null,
      monthlyStats: Array.isArray(monthlyStats) ? monthlyStats : [],
      yearlyStats: {
        year: String(y),
        classes: Number(currentYearClasses?.total || 0),
        reservations: Number(yearlyReservations?.total || 0),
        completed: Number(yearlyCompleted?.total || 0)
      }
    });
  } catch {
    res.status(500).json({ error: 'No se pudieron obtener las analíticas.' });
  }
});

app.get('/api/admin/stats', async (_req, res) => {
  try {
    const users = await getOne<{ n: string }>(`SELECT COUNT(*)::text AS n FROM profiles WHERE deleted_at IS NULL`);
    const classes = await getOne<{ n: string }>(`SELECT COUNT(*)::text AS n FROM classes WHERE deleted_at IS NULL`);
    const reservations = await getOne<{ n: string }>(`SELECT COUNT(*)::text AS n FROM reservations WHERE deleted_at IS NULL`);
    const credits = await getOne<{ n: string }>(
      `SELECT COALESCE(SUM(credits_remaining),0)::text AS n FROM profiles WHERE role='student' AND deleted_at IS NULL`
    );
    res.json({
      totalUsers: Number(users?.n || 0),
      totalClasses: Number(classes?.n || 0),
      totalReservations: Number(reservations?.n || 0),
      totalCredits: Number(credits?.n || 0)
    });
  } catch {
    res.status(500).json({ error: 'No se pudieron obtener las estadísticas.' });
  }
});

app.get('/api/admin/profiles', async (_req, res) => {
  try {
    const rows = await query(
      `
      SELECT id, email, full_name, role, credits_remaining, total_attended, whatsapp_phone, email_verified, created_at, updated_at, deleted_at
      FROM profiles
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'No se pudieron obtener los perfiles.' });
  }
});

app.post('/api/admin/profiles', async (req, res) => {
  try {
    const id = createId('usr_');
    const email = String(req.body?.email || '').trim().toLowerCase();
    const fullName = String(req.body?.full_name || req.body?.fullName || '').trim();
    const role = String(req.body?.role || 'student').trim();
    const password = String(req.body?.password || '12345678').trim();
    if (!email || !fullName) return res.status(400).json({ error: 'Nombre y correo son obligatorios.' });

    const existingProfile = await getOne<any>(`SELECT id, deleted_at FROM profiles WHERE email = $1`, [email]);
    if (existingProfile && !existingProfile.deleted_at) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
    }

    const hash = await bcrypt.hash(password, 10);

    if (existingProfile && existingProfile.deleted_at) {
      await query(
        `
        UPDATE profiles
        SET full_name = $2,
            password_hash = $3,
            role = $4,
            email_verified = TRUE,
            deleted_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
        [existingProfile.id, fullName, hash, role]
      );
      const reactivated = await getOne(`SELECT * FROM profiles WHERE id = $1`, [existingProfile.id]);
      return res.status(201).json(sanitizeProfile(reactivated));
    } else {
      await query(
        `
        INSERT INTO profiles (id,email,full_name,password_hash,role,credits_remaining,total_attended,email_verified,created_at,updated_at)
        VALUES ($1,$2,$3,$4,$5,0,0,TRUE,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
      `,
        [id, email, fullName, hash, role]
      );
      const created = await getOne(`SELECT * FROM profiles WHERE id = $1`, [id]);
      return res.status(201).json(sanitizeProfile(created));
    }
  } catch {
    res.status(500).json({ error: 'No se pudo crear el perfil.' });
  }
});

app.put('/api/admin/profiles/:id', async (req, res) => {
  try {
    await query(
      `
      UPDATE profiles
      SET email = COALESCE(NULLIF($2,''), email),
          full_name = COALESCE(NULLIF($3,''), full_name),
          role = COALESCE(NULLIF($4,''), role),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
      [req.params.id, req.body?.email || '', req.body?.full_name || req.body?.fullName || '', req.body?.role || '']
    );
    const updated = await getOne(`SELECT * FROM profiles WHERE id = $1`, [req.params.id]);
    res.json(sanitizeProfile(updated));
  } catch {
    res.status(500).json({ error: 'No se pudo actualizar el perfil.' });
  }
});

app.delete('/api/admin/profiles/:id', async (req, res) => {
  try {
    await query(`UPDATE profiles SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [
      req.params.id
    ]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'No se pudo eliminar el perfil.' });
  }
});

app.get('/api/admin/classes', async (_req, res) => {
  try {
    const rows = await query(
      `
      SELECT id, type, class_type_id, date, start_time, end_time, status, min_capacity, max_capacity, capacity, created_at, updated_at, deleted_at
      FROM classes
      WHERE deleted_at IS NULL
      ORDER BY date DESC, start_time DESC
    `
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'No se pudieron obtener las clases.' });
  }
});

app.put('/api/admin/classes/:id', async (req, res) => {
  try {
    await query(
      `
      UPDATE classes
      SET type = COALESCE(NULLIF($2,''), type),
          date = COALESCE(NULLIF($3,''), date),
          start_time = COALESCE(NULLIF($4,''), start_time),
          end_time = COALESCE(NULLIF($5,''), end_time),
          status = COALESCE(NULLIF($6,''), status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
      [
        req.params.id,
        req.body?.type || '',
        req.body?.date || '',
        req.body?.start_time || req.body?.startTime || '',
        req.body?.end_time || req.body?.endTime || '',
        req.body?.status || ''
      ]
    );
    const updated = await getOne(`SELECT * FROM classes WHERE id = $1`, [req.params.id]);
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'No se pudo actualizar la clase.' });
  }
});

app.delete('/api/admin/classes/:id', async (req, res) => {
  const client = await pgPool.connect();
  try {
    const classId = req.params.id;
    await client.query('BEGIN');

    const activeReservations = await client.query(
      `
      SELECT id, user_id, suscripcion_id, beneficiario_id
      FROM reservations
      WHERE class_id = $1
        AND status = 'active'
        AND deleted_at IS NULL
      FOR UPDATE
    `,
      [classId]
    );

    for (const reservation of activeReservations.rows as any[]) {
      if (reservation.beneficiario_id) {
        await client.query(
          `UPDATE suscripcion_beneficiarios SET clases_restantes = clases_restantes + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [reservation.beneficiario_id]
        );
      }
      if (reservation.suscripcion_id) {
        await client.query(
          `UPDATE suscripciones_alumno SET clases_restantes = clases_restantes + 1, clases_consumidas = GREATEST(clases_consumidas - 1, 0), updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [reservation.suscripcion_id]
        );
      }
    }

    await client.query(
      `
      UPDATE reservations
      SET status = 'cancelled',
          updated_at = CURRENT_TIMESTAMP
      WHERE class_id = $1
        AND status = 'active'
        AND deleted_at IS NULL
    `,
      [classId]
    );

    await client.query(
      `UPDATE classes SET status = 'canceled', real_time_status = 'canceled', deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [classId]
    );

    await client.query('COMMIT');
    const affectedStudentIds = Array.from(
      new Set((activeReservations.rows as any[]).map((r) => String(r.user_id || '').trim()).filter(Boolean))
    );
    for (const studentId of affectedStudentIds) {
      await syncStudentCredits(studentId);
    }
    res.json({ success: true, refunded_students: affectedStudentIds.length });
  } catch {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: 'No se pudo eliminar la clase.' });
  } finally {
    client.release();
  }
});

app.get('/api/admin/reservations', async (_req, res) => {
  try {
    const rows = await query(
      `
      SELECT
        r.id,
        r.status,
        r.created_at,
        p.full_name AS user_name,
        p.email AS user_email,
        c.type AS class_type,
        c.date AS class_date,
        c.start_time AS class_start_time
      FROM reservations r
      LEFT JOIN profiles p ON p.id = r.user_id
      LEFT JOIN classes c ON c.id = r.class_id
      ORDER BY r.created_at DESC
    `
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'No se pudieron obtener las reservaciones.' });
  }
});

app.delete('/api/admin/reservations/:id', async (req, res) => {
  const client = await pgPool.connect();
  try {
    const reservationId = req.params.id;
    await client.query('BEGIN');

    const reservationRes = await client.query(
      `
      SELECT id, user_id, status, suscripcion_id, beneficiario_id
      FROM reservations
      WHERE id = $1 AND deleted_at IS NULL
      FOR UPDATE
    `,
      [reservationId]
    );
    const reservation: any = reservationRes.rows[0];
    if (!reservation) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No encontramos la reservación solicitada.' });
    }

    const shouldRefund = String(reservation.status || '').toLowerCase() === 'active';
    if (shouldRefund && reservation.beneficiario_id) {
      await client.query(
        `
        UPDATE suscripcion_beneficiarios
        SET clases_restantes = clases_restantes + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
        [reservation.beneficiario_id]
      );
    }
    if (shouldRefund && reservation.suscripcion_id) {
      await client.query(
        `
        UPDATE suscripciones_alumno
        SET clases_restantes = clases_restantes + 1,
            clases_consumidas = GREATEST(clases_consumidas - 1, 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
        [reservation.suscripcion_id]
      );
    }

    await client.query(
      `
      UPDATE reservations
      SET status = 'cancelled',
          deleted_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
      [reservationId]
    );

    await client.query('COMMIT');
    if (reservation.user_id) {
      await syncStudentCredits(reservation.user_id);
    }
    res.json({ success: true, refunded: shouldRefund });
  } catch {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: 'No se pudo eliminar la reservación.' });
  } finally {
    client.release();
  }
});

app.get('/api/admin/settings', async (_req, res) => {
  try {
    const rows = await query(`SELECT setting_key, setting_value, updated_at FROM system_settings ORDER BY setting_key ASC`);
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'No se pudieron obtener los ajustes.' });
  }
});

app.post('/api/admin/settings', async (req, res) => {
  try {
    const key = String(req.body?.setting_key || '').trim();
    const value = String(req.body?.setting_value || '').trim();
    if (!key) return res.status(400).json({ error: 'El nombre del ajuste es obligatorio.' });
    await query(
      `
      INSERT INTO system_settings (setting_key, setting_value, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (setting_key) DO UPDATE
      SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP
    `,
      [key, value]
    );
    const row = await getOne(`SELECT setting_key, setting_value, updated_at FROM system_settings WHERE setting_key = $1`, [
      key
    ]);
    res.status(201).json(row);
  } catch {
    res.status(500).json({ error: 'No se pudo guardar el ajuste.' });
  }
});

app.put('/api/admin/settings/:key', async (req, res) => {
  try {
    const key = String(req.params.key || '').trim();
    const value = String(req.body?.setting_value || '').trim();
    await query(
      `
      INSERT INTO system_settings (setting_key, setting_value, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (setting_key) DO UPDATE
      SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP
    `,
      [key, value]
    );
    const row = await getOne(`SELECT setting_key, setting_value, updated_at FROM system_settings WHERE setting_key = $1`, [
      key
    ]);
    res.json(row);
  } catch {
    res.status(500).json({ error: 'No se pudo actualizar el ajuste.' });
  }
});

app.delete('/api/admin/settings/:key', async (req, res) => {
  try {
    await query(`DELETE FROM system_settings WHERE setting_key = $1`, [req.params.key]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'No se pudo eliminar el ajuste.' });
  }
});

app.put('/api/admin/change-password/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const newPassword = String(req.body?.newPassword || '').trim();
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await query(`UPDATE profiles SET password_hash = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [userId, hash]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'No se pudo cambiar la contraseña.' });
  }
});

app.get('/api/email-config', async (_req, res) => {
  try {
    const config = await readEmailConfig();
    res.json(config);
  } catch {
    res.status(500).json({ error: 'No se pudo cargar la configuración de correo.' });
  }
});

app.post('/api/save-email-config', async (req, res) => {
  try {
    const config = (req.body?.config || req.body) as StoredEmailConfig;
    if (!config || typeof config !== 'object') {
      return res.status(400).json({ error: 'Configuración de correo inválida.' });
    }
    await persistEmailConfig(config);
    res.json({ success: true, message: 'Configuración guardada exitosamente.' });
  } catch {
    res.status(500).json({ error: 'No se pudo guardar la configuración de correo.' });
  }
});

app.post('/api/test-email', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const config = (req.body?.config || null) as StoredEmailConfig | null;
    if (!email) {
      return res.status(400).json({ error: 'Ingresa un correo de prueba válido.' });
    }

    if (config && typeof config === 'object') {
      await persistEmailConfig(config);
    }

    await emailService.sendEmail({
      to: email,
      subject: 'Prueba de configuración SMTP - Focus Fitness',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 20px;">
          <h2 style="margin: 0 0 12px; color: #111827;">Configuración de correo verificada</h2>
          <p style="margin: 0 0 8px; color: #374151;">Tu configuración SMTP está funcionando correctamente.</p>
          <p style="margin: 0; color: #6b7280; font-size: 13px;">Focus Fitness · ${new Date().toLocaleString('es-MX', { timeZone: APP_TIMEZONE })}</p>
        </div>
      `
    });

    res.json({ success: true, message: 'Correo de prueba enviado correctamente.' });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error?.message || 'No se pudo enviar el correo de prueba con la configuración actual.'
    });
  }
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Ruta de API no encontrada.' });
});

if (IS_PROD) {
  app.use(express.static(__dirname));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.json({ ok: true, message: 'PostgreSQL server is running. Use Vite dev server for frontend.' });
  });
}

const ensureAdmin = async () => {
  const adminEmail = process.env.ADMIN_EMAIL || 'cabreu145@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Cran1306.18';
  const adminName = process.env.ADMIN_NAME || 'cabreudev';
  const existing = await getOne(`SELECT id FROM profiles WHERE email = $1`, [adminEmail]);
  if (existing) return;
  const hash = await bcrypt.hash(adminPassword, 10);
  await query(
    `
    INSERT INTO profiles (id, email, full_name, password_hash, role, credits_remaining, total_attended, email_verified, created_at, updated_at)
    VALUES ($1, $2, $3, $4, 'admin', 0, 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `,
    [createId('usr_'), adminEmail, adminName, hash]
  );
};

const ensureCoachHighlightsTable = async () => {
  await query(
    `
    CREATE TABLE IF NOT EXISTS coach_highlights (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT,
      image_url TEXT,
      cta_label TEXT,
      cta_url TEXT,
      start_at TIMESTAMP,
      end_at TIMESTAMP,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_by TEXT,
      updated_by TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP,
      FOREIGN KEY(created_by) REFERENCES profiles(id),
      FOREIGN KEY(updated_by) REFERENCES profiles(id)
    )
  `
  );
  await query(
    `
    CREATE INDEX IF NOT EXISTS idx_coach_highlights_active_dates
      ON coach_highlights(is_active, start_at, end_at, sort_order)
  `
  );
};

const start = async () => {
  try {
    await pgPool.query('SELECT 1');
    await ensureCoachHighlightsTable();
    await ensureAdmin();
    app.listen(PORT, () => {
      console.log(`PostgreSQL server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start PostgreSQL server:', error);
    process.exit(1);
  }
};

start();

