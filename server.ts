import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { EmailService } from './lib/emailService.ts';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import { emailService } from './lib/emailService.ts';
import path from 'path';

console.log('Starting server...');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Variable global para almacenar configuración de email
let emailConfig: any = null;

// Función para cargar configuración de email
async function loadEmailConfig() {
  try {
    const { default: fs } = await import('fs');
    if (fs.existsSync('./email-config.json')) {
      const configData = fs.readFileSync('./email-config.json', 'utf8');
      emailConfig = JSON.parse(configData);
      console.log('✅ Email configuration loaded from file');
    }
  } catch (error) {
    console.log('⚠️  No email configuration file found, using defaults');
  }
}

// Log para verificar que la consola funciona
setInterval(() => {
  console.log('🟢 SERVIDOR ACTIVO - ' + new Date().toLocaleTimeString());
}, 10000); // Cada 10 segundos

async function startServer() {
  console.log('startServer() called');
  
  // Cargar configuración de email
  await loadEmailConfig();
  
  try {
    const db = new Database('fitness_v4.db');

    db.exec(`
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME
      );

      CREATE TABLE IF NOT EXISTS classes (
        id TEXT PRIMARY KEY,
        type TEXT,
        date TEXT,
        start_time TEXT,
        end_time TEXT,
        capacity INTEGER DEFAULT 8,
        status TEXT DEFAULT 'active',
        created_by TEXT,
        updated_by TEXT,
        canceled_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME
      );

      CREATE TABLE IF NOT EXISTS reservations (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        class_id TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME,
        FOREIGN KEY(user_id) REFERENCES profiles(id),
        FOREIGN KEY(class_id) REFERENCES classes(id)
      );
    `);
    console.log('Database initialized');
    const columnExists = (table: string, column: string) => {
      const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
      return columns.some((c) => c.name === column);
    };

    const addColumnIfMissing = (table: string, column: string, definition: string) => {
      if (!columnExists(table, column)) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        console.log(`Added ${table}.${column}`);
      }
    };

    // Idempotent migrations for existing databases
    addColumnIfMissing('profiles', 'password_hash', 'TEXT');
    addColumnIfMissing('profiles', 'credits_remaining', 'INTEGER DEFAULT 0');
    addColumnIfMissing('profiles', 'total_attended', 'INTEGER DEFAULT 0');
    addColumnIfMissing('profiles', 'email_verified', 'BOOLEAN DEFAULT FALSE');
    addColumnIfMissing('profiles', 'email_verification_token', 'TEXT');
    addColumnIfMissing('profiles', 'email_verification_expires', 'TEXT');
    addColumnIfMissing('profiles', 'password_reset_token', 'TEXT');
    addColumnIfMissing('profiles', 'password_reset_expires', 'TEXT');
    addColumnIfMissing('profiles', 'patient_external_id', 'TEXT');
    addColumnIfMissing('profiles', 'created_at', 'DATETIME');
    addColumnIfMissing('profiles', 'updated_at', 'DATETIME');
    addColumnIfMissing('profiles', 'deleted_at', 'DATETIME');
    db.prepare("UPDATE profiles SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP), updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)").run();

    addColumnIfMissing('classes', 'status', "TEXT DEFAULT 'active'");
    addColumnIfMissing('classes', 'created_by', 'TEXT');
    addColumnIfMissing('classes', 'updated_by', 'TEXT');
    addColumnIfMissing('classes', 'canceled_by', 'TEXT');
    addColumnIfMissing('classes', 'real_time_status', "TEXT DEFAULT 'scheduled'");
    addColumnIfMissing('classes', 'created_at', 'DATETIME');
    addColumnIfMissing('classes', 'updated_at', 'DATETIME');
    addColumnIfMissing('classes', 'deleted_at', 'DATETIME');
    db.prepare("UPDATE classes SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP), updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)").run();

    addColumnIfMissing('reservations', 'created_at', 'DATETIME');
    addColumnIfMissing('reservations', 'updated_at', 'DATETIME');
    addColumnIfMissing('reservations', 'deleted_at', 'DATETIME');
    db.prepare("UPDATE reservations SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP), updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)").run();

    db.exec(`
      CREATE TABLE IF NOT EXISTS paquetes (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        capacidad INTEGER NOT NULL DEFAULT 1,
        numero_clases INTEGER NOT NULL,
        vigencia_semanas INTEGER NOT NULL,
        detalles TEXT,
        precio_base REAL NOT NULL DEFAULT 0,
        estado TEXT NOT NULL DEFAULT 'active',
        created_by TEXT,
        updated_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME
      );

      CREATE TABLE IF NOT EXISTS suscripciones_alumno (
        id TEXT PRIMARY KEY,
        alumno_id TEXT NOT NULL,
        paquete_id TEXT,
        fecha_compra DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        fecha_vencimiento DATETIME NOT NULL,
        clases_totales INTEGER NOT NULL,
        clases_restantes INTEGER NOT NULL,
        clases_consumidas INTEGER NOT NULL DEFAULT 0,
        estado TEXT NOT NULL DEFAULT 'active',
        congelado INTEGER NOT NULL DEFAULT 0,
        freeze_iniciado_en DATETIME,
        dias_congelados INTEGER NOT NULL DEFAULT 0,
        notas TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME,
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME,
        FOREIGN KEY(suscripcion_id) REFERENCES suscripciones_alumno(id),
        FOREIGN KEY(alumno_id) REFERENCES profiles(id),
        UNIQUE(suscripcion_id, alumno_id)
      );

      CREATE TABLE IF NOT EXISTS registros_asistencia (
        id TEXT PRIMARY KEY,
        alumno_id TEXT NOT NULL,
        clase_id TEXT NOT NULL,
        suscripcion_id TEXT NOT NULL,
        estado TEXT NOT NULL DEFAULT 'attended',
        asistio_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        registrado_por TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME,
        FOREIGN KEY(alumno_id) REFERENCES profiles(id),
        FOREIGN KEY(clase_id) REFERENCES classes(id),
        FOREIGN KEY(suscripcion_id) REFERENCES suscripciones_alumno(id)
      );

      CREATE TABLE IF NOT EXISTS transacciones_pago (
        id TEXT PRIMARY KEY,
        suscripcion_id TEXT NOT NULL,
        alumno_id TEXT NOT NULL,
        paquete_id TEXT,
        monto REAL NOT NULL,
        moneda TEXT NOT NULL DEFAULT 'MXN',
        metodo_pago TEXT,
        referencia TEXT,
        fecha_pago DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME,
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME,
        FOREIGN KEY(alumno_id) REFERENCES profiles(id),
        FOREIGN KEY(suscripcion_id) REFERENCES suscripciones_alumno(id)
      );

      CREATE INDEX IF NOT EXISTS idx_suscripciones_alumno_estado ON suscripciones_alumno(alumno_id, estado);
      CREATE INDEX IF NOT EXISTS idx_suscripciones_vencimiento ON suscripciones_alumno(fecha_vencimiento);
      CREATE INDEX IF NOT EXISTS idx_beneficiarios_suscripcion ON suscripcion_beneficiarios(suscripcion_id, alumno_id);
      CREATE INDEX IF NOT EXISTS idx_beneficiarios_alumno ON suscripcion_beneficiarios(alumno_id, estado);
      CREATE INDEX IF NOT EXISTS idx_transacciones_fecha ON transacciones_pago(fecha_pago);
      CREATE INDEX IF NOT EXISTS idx_asistencia_alumno_clase ON registros_asistencia(alumno_id, clase_id);
    `);

    const createId = (prefix = '') => `${prefix}${Math.random().toString(36).slice(2, 11)}`;

    addColumnIfMissing('suscripciones_alumno', 'congelado', 'INTEGER DEFAULT 0');
    addColumnIfMissing('suscripciones_alumno', 'freeze_iniciado_en', 'DATETIME');
    addColumnIfMissing('suscripciones_alumno', 'dias_congelados', 'INTEGER DEFAULT 0');

    const ensureTitularBeneficiary = (subscriptionId: string) => {
      const subscription = db.prepare(`
        SELECT id, alumno_id, clases_totales, clases_restantes, estado
        FROM suscripciones_alumno
        WHERE id = ?
      `).get(subscriptionId) as any;

      if (!subscription) return;

      const existing = db.prepare(`
        SELECT id
        FROM suscripcion_beneficiarios
        WHERE suscripcion_id = ?
          AND alumno_id = ?
          AND deleted_at IS NULL
      `).get(subscriptionId, subscription.alumno_id);

      if (existing) return;

      db.prepare(`
        INSERT INTO suscripcion_beneficiarios (
          id, suscripcion_id, alumno_id, es_titular, clases_asignadas, clases_restantes, estado, created_at, updated_at
        ) VALUES (?, ?, ?, 1, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(
        createId('ben_'),
        subscriptionId,
        subscription.alumno_id,
        Number(subscription.clases_totales || 0),
        Number(subscription.clases_restantes || 0),
        subscription.estado === 'active' ? 'active' : subscription.estado
      );
    };

    const syncStudentCredits = (studentId: string) => {
      const balance = db.prepare(`
        SELECT COALESCE(SUM(sb.clases_restantes), 0) as total
        FROM suscripcion_beneficiarios sb
        JOIN suscripciones_alumno s ON s.id = sb.suscripcion_id
        WHERE sb.alumno_id = ?
          AND sb.deleted_at IS NULL
          AND sb.estado = 'active'
          AND s.deleted_at IS NULL
          AND s.estado = 'active'
          AND s.congelado = 0
          AND datetime(s.fecha_vencimiento) >= datetime('now')
      `).get(studentId) as { total: number };

      db.prepare(`
        UPDATE profiles
        SET credits_remaining = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(Number(balance.total || 0), studentId);
    };

    const redistributeBeneficiaries = (subscriptionId: string) => {
      const subscription = db.prepare(`
        SELECT s.*, p.capacidad
        FROM suscripciones_alumno s
        LEFT JOIN paquetes p ON p.id = s.paquete_id
        WHERE s.id = ?
          AND s.deleted_at IS NULL
      `).get(subscriptionId) as any;

      if (!subscription) throw new Error('SUBSCRIPTION_NOT_FOUND');
      ensureTitularBeneficiary(subscriptionId);

      const beneficiaries = db.prepare(`
        SELECT id, alumno_id, clases_asignadas, clases_restantes, es_titular
        FROM suscripcion_beneficiarios
        WHERE suscripcion_id = ?
          AND deleted_at IS NULL
        ORDER BY es_titular DESC, datetime(created_at) ASC
      `).all(subscriptionId) as Array<any>;

      const capacity = Number(subscription.capacidad || 1);
      if (beneficiaries.length > capacity) {
        throw new Error('CAPACITY_EXCEEDED');
      }

      const memberCount = Math.max(beneficiaries.length, 1);
      const totalClasses = Number(subscription.clases_totales || 0);
      const base = Math.floor(totalClasses / memberCount);
      let remainder = totalClasses % memberCount;

      let totalRemaining = 0;
      beneficiaries.forEach((beneficiary) => {
        const previousAssigned = Number(beneficiary.clases_asignadas || 0);
        const previousRemaining = Number(beneficiary.clases_restantes || 0);
        const consumed = Math.max(0, previousAssigned - previousRemaining);

        const assigned = base + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder -= 1;

        const remaining = Math.max(0, assigned - consumed);
        totalRemaining += remaining;

        db.prepare(`
          UPDATE suscripcion_beneficiarios
          SET clases_asignadas = ?,
              clases_restantes = ?,
              estado = CASE WHEN ? <= 0 THEN 'depleted' ELSE 'active' END,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(assigned, remaining, remaining, beneficiary.id);
      });

      db.prepare(`
        UPDATE suscripciones_alumno
        SET clases_restantes = ?,
            clases_consumidas = clases_totales - ?,
            estado = CASE
              WHEN estado = 'expired' THEN 'expired'
              WHEN ? <= 0 THEN 'depleted'
              ELSE 'active'
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(totalRemaining, totalRemaining, totalRemaining, subscriptionId);

      const impacted = beneficiaries.map((row) => row.alumno_id);
      impacted.forEach((studentId) => syncStudentCredits(studentId));
    };

    const refreshSubscriptions = () => {
      const subscriptions = db.prepare(`
        SELECT id
        FROM suscripciones_alumno
        WHERE deleted_at IS NULL
      `).all() as Array<{ id: string }>;
      subscriptions.forEach((row) => ensureTitularBeneficiary(row.id));

      db.prepare(`
        UPDATE suscripciones_alumno
        SET estado = 'expired', updated_at = CURRENT_TIMESTAMP
        WHERE deleted_at IS NULL
          AND congelado = 0
          AND estado IN ('active', 'depleted')
          AND datetime(fecha_vencimiento) < datetime('now')
      `).run();

      db.prepare(`
        UPDATE suscripcion_beneficiarios
        SET estado = 'expired', updated_at = CURRENT_TIMESTAMP
        WHERE deleted_at IS NULL
          AND suscripcion_id IN (
            SELECT id
            FROM suscripciones_alumno
            WHERE estado = 'expired'
              AND deleted_at IS NULL
          )
      `).run();

      db.prepare(`
        UPDATE suscripcion_beneficiarios
        SET estado = 'depleted', updated_at = CURRENT_TIMESTAMP
        WHERE deleted_at IS NULL
          AND clases_restantes <= 0
          AND estado = 'active'
      `).run();

      db.prepare(`
        UPDATE suscripciones_alumno
        SET estado = 'depleted', updated_at = CURRENT_TIMESTAMP
        WHERE deleted_at IS NULL
          AND estado = 'active'
          AND NOT EXISTS (
            SELECT 1
            FROM suscripcion_beneficiarios sb
            WHERE sb.suscripcion_id = suscripciones_alumno.id
              AND sb.deleted_at IS NULL
              AND sb.estado = 'active'
              AND sb.clases_restantes > 0
          )
      `).run();

      const students = db.prepare(`
        SELECT id
        FROM profiles
        WHERE role = 'student'
          AND deleted_at IS NULL
      `).all() as Array<{ id: string }>;

      students.forEach((student) => syncStudentCredits(student.id));
    };

    refreshSubscriptions();
    setInterval(refreshSubscriptions, 60 * 1000);
    // Create Admin User if not exists
    const adminEmail = 'cabreudev';
    const adminPass = 'Cran1306.18';
    const existingAdmin = db.prepare('SELECT * FROM profiles WHERE email = ?').get(adminEmail);

    if (!existingAdmin) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(adminPass, salt);
      db.prepare('INSERT INTO profiles (id, email, full_name, password_hash, role, credits_remaining) VALUES (?, ?, ?, ?, ?, ?)').run(
        'admin-1',
        adminEmail,
        'Admin Focus',
        hash,
        'admin',
        999
      );
      console.log('Admin user created: cabreudev');
    } else {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(adminPass, salt);
      db.prepare("UPDATE profiles SET password_hash = ?, role = 'admin' WHERE email = ?").run(hash, adminEmail);
      console.log('Admin user updated: cabreudev');
    }

    const app = express();
    const PORT = 3000;

    // Function to reset yearly metrics and archive old data
  const resetYearlyMetrics = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const lastYear = currentYear - 1;
    
    // Archive last year's data to a separate table
    db.prepare(`
      CREATE TABLE IF NOT EXISTS classes_archive_${lastYear} AS
      SELECT * FROM classes WHERE strftime('%Y', date) = ?
    `).run(lastYear.toString());

    db.prepare(`
      CREATE TABLE IF NOT EXISTS reservations_archive_${lastYear} AS
      SELECT r.*, p.email as user_email, c.type as class_type, c.date as class_date 
      FROM reservations r
      JOIN profiles p ON r.user_id = p.id
      JOIN classes c ON r.class_id = c.id
      WHERE strftime('%Y', c.date) = ?
    `).run(lastYear.toString());

    // Reset student attended counts for new year
    db.prepare(`
      UPDATE profiles 
      SET total_attended = 0 
      WHERE role = 'student'
    `).run();

    console.log(`Yearly metrics reset completed for ${currentYear}. ${lastYear} data archived.`);
  };

  // Check if it's January 1st and reset metrics
  const checkYearlyReset = () => {
    const now = new Date();
    const isNewYear = now.getMonth() === 0 && now.getDate() === 1;
    
    if (isNewYear) {
      const lastYear = now.getFullYear() - 1;
      const resetAlreadyDone = db.prepare(`
        SELECT COUNT(*) as count FROM classes_archive_${lastYear}
      `).get() as { count: number };
      
      if (resetAlreadyDone.count === 0) {
        resetYearlyMetrics();
      }
    }
  };

  // Run yearly reset check daily
  setInterval(checkYearlyReset, 24 * 60 * 60 * 1000); // Check daily
  
  // Initial check on server start
  setTimeout(checkYearlyReset, 10000);

  app.use(express.json());
  app.use(express.urlencoded({ extended: true })); // Para parsear formularios POST
    console.log('Express middleware configured');

    // Update real-time class statuses
    const updateClassStatuses = () => {
      const now = new Date();
      const classes = db.prepare('SELECT id, date, start_time, end_time FROM classes').all();
      
      classes.forEach((cls: any) => {
        const classDateTime = new Date(`${cls.date}T${cls.start_time}`);
        const endDateTime = new Date(`${cls.date}T${cls.end_time}`);
        
        let newStatus = 'scheduled';
        
        if (now >= classDateTime && now < endDateTime) {
          newStatus = 'in_progress';
        } else if (now >= endDateTime) {
          newStatus = 'finished';
        }
        
        // Update status if changed
        db.prepare('UPDATE classes SET real_time_status = ? WHERE id = ?')
          .run(newStatus, cls.id);
      });
    };

    // Update statuses every 30 seconds
    setInterval(updateClassStatuses, 30000);
    
    // Run immediately on server start
    updateClassStatuses();

    app.get('/api/health', (req, res) => {
      console.log('Health check requested');
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

  // Global Error Handler for JSON
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Server Error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  });

  // Auth Routes
  app.post('/api/auth/register', async (req, res) => {
    const { email, password, fullName } = req.body;
    
    console.log('�🚨🚨 LLEGÓ PETICIÓN REGISTER 🚨🚨🚨');
    console.log('Body completo:', req.body);
    
    console.log('�� === PROCESANDO REGISTRO DE USUARIO ===');
    console.log('Email:', email);
    console.log('Nombre:', fullName);
    
    try {
      if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son requeridos' });
      }
      const existing = db.prepare('SELECT * FROM profiles WHERE email = ?').get(email);
      if (existing) {
        console.log('⚠️  Email ya registrado:', email);
        return res.status(400).json({ error: 'El email ya está registrado' });
      }

      const id = Math.random().toString(36).substr(2, 9);
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      const role = email.toLowerCase().includes('coach') || email.toLowerCase().includes('admin') ? 'coach' : 'student';
      
      // Generate verification token
      const verificationToken = Math.random().toString(36).substr(2, 32);
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      console.log('🔄 Creando usuario con email no verificado...');
      console.log('📧 Token de verificación:', verificationToken);

      db.prepare('INSERT INTO profiles (id, email, full_name, password_hash, role, credits_remaining, email_verified, email_verification_token, email_verification_expires) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        id, email, fullName || 'Atleta Focus', hash, role, 10, 0, verificationToken, verificationExpires.toISOString()
      );

      // Usar la instancia global de emailService
      console.log('📧 EmailConfig actual:', emailConfig);
      console.log('📧 emailConfig existe:', !!emailConfig);
      
      if (emailConfig && emailConfig.provider === 'smtp' && emailConfig.smtp) {
        console.log('📧 Configurando SMTP en emailService global para verificación...');
        console.log('📧 SMTP Config:', {
          host: emailConfig.smtp.host,
          port: emailConfig.smtp.port,
          secure: emailConfig.smtp.secure,
          user: emailConfig.smtp.user,
          hasPassword: !!emailConfig.smtp.pass
        });
        emailService.setSMTPConfig(emailConfig.smtp);
      } else {
        console.log('⚠️  Sin configuración SMTP, usando modo simulado para verificación');
        if (emailConfig) {
          console.log('emailConfig.provider:', emailConfig.provider);
          console.log('emailConfig.smtp existe:', !!emailConfig.smtp);
        } else {
          console.log('emailConfig es null/undefined');
        }
      }

      // Send verification email
      console.log('📧 Enviando email de verificación...');
      const emailSent = await emailService.sendVerificationEmail(email, verificationToken);
      console.log('📧 Resultado de sendVerificationEmail:', emailSent);
      
      if (emailSent) {
        console.log('✅ Email de verificación enviado exitosamente');
        console.log('📋 Usuario creado PERO no puede iniciar sesión hasta verificar email');
        
        res.json({ 
          success: true, 
          message: 'Usuario registrado. Por favor revisa tu email para verificar tu cuenta antes de iniciar sesión.',
          requiresVerification: true
        });
      } else {
        console.log('❌ Error al enviar email de verificación');
        // Si no se puede enviar el email, eliminar el usuario
        db.prepare('DELETE FROM profiles WHERE id = ?').run(id);
        res.json({ success: false, error: 'No se pudo enviar el email de verificación. Por favor intenta nuevamente.' });
      }
    } catch (error: any) {
      console.error('❌ Error en registro:', error.message);
      res.status(500).json({ error: 'Error al registrar usuario: ' + error.message });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    
    console.log('🔧 === PROCESANDO LOGIN ===');
    console.log('Email:', email);
    
    try {
      if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son requeridos' });
      }
      // Allow login by email or username (for admin)
      const profile = db.prepare('SELECT * FROM profiles WHERE email = ?').get(email) as any;
      if (!profile) {
        console.log(`❌ Login failed: User ${email} not found`);
        return res.status(401).json({ error: 'Usuario no encontrado' });
      }

      // Verificar si el email está verificado (excepto para admin/coach)
      if (!profile.email_verified && profile.role === 'student') {
        console.log(`❌ Login failed: Email not verified for ${email}`);
        return res.status(401).json({ 
          error: 'Por favor verifica tu email antes de iniciar sesión. Revisa tu bandeja de entrada o carpeta de spam.',
          requiresVerification: true 
        });
      }

      const match = await bcrypt.compare(password, profile.password_hash);
      if (!match) {
        console.log(`❌ Login failed: Incorrect password for ${email}`);
        return res.status(401).json({ error: 'Contraseña incorrecta' });
      }

      console.log(`✅ Login successful for ${email} (email_verified: ${profile.email_verified})`);

      const { password_hash, ...safeProfile } = profile;
      res.json({ session: { user: { id: profile.id, email: profile.email } }, profile: safeProfile });
    } catch (error: any) {
      console.error('❌ Error en login:', error.message);
      res.status(500).json({ error: 'Error en el servidor: ' + error.message });
    }
  });

  app.get('/api/classes', (req, res) => {
    try {
      const year = typeof req.query.year === 'string' ? req.query.year.trim() : '';
      const isValidYear = /^\d{4}$/.test(year);

      const classes = isValidYear
        ? db.prepare(`
            SELECT *
            FROM classes
            WHERE status = 'active'
              AND deleted_at IS NULL
              AND strftime('%Y', date) = ?
            ORDER BY date ASC, start_time ASC
          `).all(year)
        : db.prepare(`
            SELECT *
            FROM classes
            WHERE status = 'active'
              AND deleted_at IS NULL
            ORDER BY date ASC, start_time ASC
          `).all();

      res.json(classes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/availability', (req, res) => {
    try {
      const reservations = db.prepare("SELECT class_id, COUNT(*) as count FROM reservations WHERE status = 'active' GROUP BY class_id").all();
      const availability: Record<string, number> = {};
      reservations.forEach((r: any) => {
        availability[r.class_id] = r.count;
      });
      res.json(availability);
    } catch (error: any) {
      console.error('Availability Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/profile/:id', (req, res) => {
    refreshSubscriptions();
    const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.params.id);
    if (profile) {
      res.json(profile);
    } else {
      res.status(404).json({ error: 'Profile not found' });
    }
  });

  app.post('/api/reservations', (req, res) => {
    const { userId, classId } = req.body;
    
    if (!userId || !classId) {
      return res.status(400).json({ error: 'userId and classId are required' });
    }

    try {
      refreshSubscriptions();

      const transaction = db.transaction(() => {
        const existingReservation = db.prepare(`
          SELECT id
          FROM reservations
          WHERE user_id = ?
            AND class_id = ?
            AND deleted_at IS NULL
        `).get(userId, classId);

        if (existingReservation) {
          throw new Error('USER_ALREADY_RESERVED');
        }

        const classInfo = db.prepare(`
          SELECT id, capacity, status, real_time_status, date, start_time, end_time
          FROM classes
          WHERE id = ?
            AND deleted_at IS NULL
        `).get(classId) as any;

        if (!classInfo) {
          throw new Error('CLASS_NOT_FOUND');
        }

        if (classInfo.real_time_status === 'in_progress') {
          throw new Error('CLASS_IN_PROGRESS');
        }

        if (classInfo.real_time_status === 'finished') {
          throw new Error('CLASS_FINISHED');
        }

        if (classInfo.status === 'ongoing' || classInfo.status === 'completed') {
          throw new Error('CLASS_NOT_AVAILABLE');
        }

        if (classInfo.status !== 'active') {
          throw new Error('CLASS_NOT_ACTIVE');
        }

        const now = new Date();
        const classStartDateTime = new Date(`${classInfo.date}T${classInfo.start_time}`);
        const classEndDateTime = new Date(`${classInfo.date}T${classInfo.end_time}`);

        if (now >= classStartDateTime && now < classEndDateTime) {
          throw new Error('CLASS_IN_PROGRESS_REAL_TIME');
        }

        if (now >= classEndDateTime) {
          throw new Error('CLASS_FINISHED_REAL_TIME');
        }

        const currentReservations = db.prepare(`
          SELECT COUNT(*) as count
          FROM reservations
          WHERE class_id = ?
            AND deleted_at IS NULL
        `).get(classId) as { count: number };

        if (currentReservations.count >= classInfo.capacity) {
          throw new Error('CLASS_FULL');
        }

        const userProfile = db.prepare(`
          SELECT id, credits_remaining
          FROM profiles
          WHERE id = ?
            AND role = 'student'
            AND deleted_at IS NULL
        `).get(userId) as { id: string; credits_remaining: number } | undefined;

        if (!userProfile) {
          throw new Error('USER_NOT_FOUND');
        }

        const classStartIso = `${classInfo.date} ${classInfo.start_time}`;
        const eligibleSubscription = db.prepare(`
          SELECT sb.id
          FROM suscripcion_beneficiarios sb
          JOIN suscripciones_alumno s ON s.id = sb.suscripcion_id
          WHERE sb.alumno_id = ?
            AND sb.deleted_at IS NULL
            AND sb.estado = 'active'
            AND sb.clases_restantes > 0
            AND s.deleted_at IS NULL
            AND s.estado = 'active'
            AND s.congelado = 0
            AND datetime(s.fecha_vencimiento) >= datetime(?)
          ORDER BY datetime(s.fecha_vencimiento) ASC
          LIMIT 1
        `).get(userId, classStartIso) as { id: string } | undefined;

        if (!eligibleSubscription && (userProfile.credits_remaining || 0) <= 0) {
          throw new Error('INSUFFICIENT_CREDITS');
        }

        const reservationId = createId('res_');
        db.prepare(`
          INSERT INTO reservations (id, user_id, class_id, status, created_at, updated_at)
          VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(reservationId, userId, classId);

        return reservationId;
      });

      const reservationId = transaction();
      res.json({ success: true, id: reservationId, message: 'Reserva creada. El descuento se aplicará al registrar asistencia.' });

    } catch (error: any) {
      console.error('Reservation error:', error);
      
      // Handle specific error cases
      switch (error.message) {
        case 'USER_ALREADY_RESERVED':
          return res.status(409).json({ error: 'Ya tienes una reserva para esta clase' });
        case 'CLASS_NOT_FOUND':
          return res.status(404).json({ error: 'La clase no existe' });
        case 'CLASS_NOT_ACTIVE':
          return res.status(400).json({ error: 'La clase no está activa' });
        case 'CLASS_FULL':
          return res.status(409).json({ error: 'La clase está llena' });
        case 'USER_NOT_FOUND':
          return res.status(404).json({ error: 'Usuario no encontrado' });
        case 'INSUFFICIENT_CREDITS':
          return res.status(402).json({ error: 'No tienes créditos suficientes' });
        default:
          return res.status(500).json({ error: 'Error al crear la reserva' });
      }
    }
  });

  app.get('/api/students', (req, res) => {
    const students = db.prepare("SELECT * FROM profiles WHERE role = 'student' AND deleted_at IS NULL").all();
    res.json(students);
  });

  // === Coach Business Module: Packages / Community / Management / Cash Cut ===
  app.get('/api/coach/packages', (req, res) => {
    try {
      const packages = db.prepare(`
        SELECT *
        FROM paquetes
        WHERE deleted_at IS NULL
        ORDER BY datetime(created_at) DESC
      `).all();
      res.json(packages);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch packages', details: error.message });
    }
  });

  app.post('/api/coach/packages', (req, res) => {
    try {
      const {
        nombre,
        capacidad,
        numero_clases,
        vigencia_semanas,
        detalles,
        precio_base,
        estado,
        actor_id
      } = req.body;

      if (!nombre || !numero_clases || !vigencia_semanas) {
        return res.status(400).json({ error: 'nombre, numero_clases y vigencia_semanas son requeridos' });
      }

      const parsedCapacity = Number(capacidad || 1);
      const parsedTotalClasses = Number(numero_clases);
      if (parsedCapacity > 1 && parsedTotalClasses % parsedCapacity !== 0) {
        return res.status(400).json({ error: 'El total de clases debe ser divisible equitativamente entre la capacidad del paquete.' });
      }

      const id = createId('pkg_');
      db.prepare(`
        INSERT INTO paquetes (
          id, nombre, capacidad, numero_clases, vigencia_semanas, detalles, precio_base, estado, created_by, updated_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(
        id,
        nombre,
        parsedCapacity,
        parsedTotalClasses,
        Number(vigencia_semanas),
        detalles || '',
        Number(precio_base || 0),
        estado || 'active',
        actor_id || null,
        actor_id || null
      );

      const created = db.prepare('SELECT * FROM paquetes WHERE id = ?').get(id);
      res.json({ success: true, package: created });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to create package', details: error.message });
    }
  });

  app.put('/api/coach/packages/:id', (req, res) => {
    try {
      const { nombre, capacidad, numero_clases, vigencia_semanas, detalles, precio_base, estado, actor_id } = req.body;
      const parsedCapacity = Number(capacidad || 1);
      const parsedTotalClasses = Number(numero_clases);
      if (parsedCapacity > 1 && parsedTotalClasses % parsedCapacity !== 0) {
        return res.status(400).json({ error: 'El total de clases debe ser divisible equitativamente entre la capacidad del paquete.' });
      }
      db.prepare(`
        UPDATE paquetes
        SET nombre = ?,
            capacidad = ?,
            numero_clases = ?,
            vigencia_semanas = ?,
            detalles = ?,
            precio_base = ?,
            estado = ?,
            updated_by = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND deleted_at IS NULL
      `).run(
        nombre,
        parsedCapacity,
        parsedTotalClasses,
        Number(vigencia_semanas),
        detalles || '',
        Number(precio_base || 0),
        estado || 'active',
        actor_id || null,
        req.params.id
      );

      const updated = db.prepare('SELECT * FROM paquetes WHERE id = ?').get(req.params.id);
      res.json({ success: true, package: updated });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update package', details: error.message });
    }
  });

  app.delete('/api/coach/packages/:id', (req, res) => {
    try {
      db.prepare(`
        UPDATE paquetes
        SET estado = 'inactive',
            deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND deleted_at IS NULL
      `).run(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to delete package', details: error.message });
    }
  });

  app.post('/api/coach/subscriptions', (req, res) => {
    try {
      refreshSubscriptions();

      const {
        alumno_id,
        paquete_id,
        fecha_compra,
        metodo_pago,
        referencia,
        monto,
        actor_id,
        notas
      } = req.body;

      if (!alumno_id || !paquete_id) {
        return res.status(400).json({ error: 'alumno_id y paquete_id son requeridos' });
      }

      const student = db.prepare(`
        SELECT id
        FROM profiles
        WHERE id = ?
          AND role = 'student'
          AND deleted_at IS NULL
      `).get(alumno_id);

      if (!student) {
        return res.status(404).json({ error: 'Alumno no encontrado' });
      }

      const packageData = db.prepare(`
        SELECT *
        FROM paquetes
        WHERE id = ?
          AND deleted_at IS NULL
          AND estado = 'active'
      `).get(paquete_id) as any;

      if (!packageData) {
        return res.status(404).json({ error: 'Paquete no disponible' });
      }

      const totalClasses = Number(packageData.numero_clases || 0);
      const capacity = Number(packageData.capacidad || 1);
      if (capacity > 1 && totalClasses % capacity !== 0) {
        return res.status(400).json({
          error: 'El total de clases debe ser divisible equitativamente entre la capacidad del paquete.'
        });
      }

      const purchaseDate = fecha_compra ? new Date(fecha_compra) : new Date();
      const expiryDate = new Date(purchaseDate);
      expiryDate.setDate(expiryDate.getDate() + Number(packageData.vigencia_semanas || 0) * 7);

      const tx = db.transaction(() => {
        const subscriptionId = createId('sub_');
        db.prepare(`
          INSERT INTO suscripciones_alumno (
            id, alumno_id, paquete_id, fecha_compra, fecha_vencimiento,
            clases_totales, clases_restantes, clases_consumidas, estado, notas,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'active', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(
          subscriptionId,
          alumno_id,
          paquete_id,
          purchaseDate.toISOString(),
          expiryDate.toISOString(),
          totalClasses,
          totalClasses,
          notas || null
        );

        db.prepare(`
          INSERT INTO suscripcion_beneficiarios (
            id, suscripcion_id, alumno_id, es_titular, clases_asignadas, clases_restantes, estado, created_at, updated_at
          ) VALUES (?, ?, ?, 1, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(
          createId('ben_'),
          subscriptionId,
          alumno_id,
          totalClasses,
          totalClasses
        );

        const paymentId = createId('pay_');
        const amountToRegister = monto != null ? Number(monto) : Number(packageData.precio_base || 0);
        db.prepare(`
          INSERT INTO transacciones_pago (
            id, suscripcion_id, alumno_id, paquete_id, monto, moneda, metodo_pago, referencia, fecha_pago, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'MXN', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(
          paymentId,
          subscriptionId,
          alumno_id,
          paquete_id,
          amountToRegister,
          metodo_pago || 'manual',
          referencia || null,
          purchaseDate.toISOString()
        );

        syncStudentCredits(alumno_id);
        return { subscriptionId, paymentId };
      });

      const result = tx();
      const subscription = db.prepare('SELECT * FROM suscripciones_alumno WHERE id = ?').get(result.subscriptionId);
      const payment = db.prepare('SELECT * FROM transacciones_pago WHERE id = ?').get(result.paymentId);

      res.json({ success: true, subscription, payment, actor_id: actor_id || null });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to create subscription', details: error.message });
    }
  });

  app.get('/api/coach/subscriptions/:id/beneficiaries', (req, res) => {
    try {
      const beneficiaries = db.prepare(`
        SELECT
          sb.*,
          p.full_name,
          p.email
        FROM suscripcion_beneficiarios sb
        JOIN profiles p ON p.id = sb.alumno_id
        WHERE sb.suscripcion_id = ?
          AND sb.deleted_at IS NULL
        ORDER BY sb.es_titular DESC, datetime(sb.created_at) ASC
      `).all(req.params.id);
      res.json(beneficiaries);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch beneficiaries', details: error.message });
    }
  });

  app.post('/api/coach/subscriptions/:id/beneficiaries', (req, res) => {
    try {
      refreshSubscriptions();

      const subscriptionId = req.params.id;
      const { alumno_id } = req.body;
      if (!alumno_id) {
        return res.status(400).json({ error: 'alumno_id es requerido' });
      }

      const subscription = db.prepare(`
        SELECT s.id, s.estado, s.paquete_id, p.capacidad
        FROM suscripciones_alumno s
        LEFT JOIN paquetes p ON p.id = s.paquete_id
        WHERE s.id = ?
          AND s.deleted_at IS NULL
      `).get(subscriptionId) as any;

      if (!subscription) {
        return res.status(404).json({ error: 'Suscripción no encontrada' });
      }

      const capacity = Number(subscription.capacidad || 1);
      if (capacity <= 1) {
        return res.status(400).json({ error: 'Este paquete no permite beneficiarios' });
      }

      const student = db.prepare(`
        SELECT id
        FROM profiles
        WHERE id = ?
          AND role = 'student'
          AND deleted_at IS NULL
      `).get(alumno_id);

      if (!student) {
        return res.status(404).json({ error: 'Alumno no encontrado' });
      }

      const existing = db.prepare(`
        SELECT id
        FROM suscripcion_beneficiarios
        WHERE suscripcion_id = ?
          AND alumno_id = ?
          AND deleted_at IS NULL
      `).get(subscriptionId, alumno_id);

      if (existing) {
        return res.status(409).json({ error: 'El alumno ya está vinculado a este paquete' });
      }

      const tx = db.transaction(() => {
        db.prepare(`
          INSERT INTO suscripcion_beneficiarios (
            id, suscripcion_id, alumno_id, es_titular, clases_asignadas, clases_restantes, estado, created_at, updated_at
          ) VALUES (?, ?, ?, 0, 0, 0, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(createId('ben_'), subscriptionId, alumno_id);

        redistributeBeneficiaries(subscriptionId);
      });

      tx();
      const beneficiaries = db.prepare(`
        SELECT sb.*, p.full_name, p.email
        FROM suscripcion_beneficiarios sb
        JOIN profiles p ON p.id = sb.alumno_id
        WHERE sb.suscripcion_id = ?
          AND sb.deleted_at IS NULL
        ORDER BY sb.es_titular DESC, datetime(sb.created_at) ASC
      `).all(subscriptionId);

      res.json({ success: true, beneficiaries });
    } catch (error: any) {
      if (error.message === 'CAPACITY_EXCEEDED') {
        return res.status(400).json({ error: 'La suscripción ya alcanzó la capacidad del paquete.' });
      }
      res.status(500).json({ error: 'Failed to add beneficiary', details: error.message });
    }
  });

  app.post('/api/coach/subscriptions/:id/freeze', (req, res) => {
    try {
      refreshSubscriptions();
      const subscriptionId = req.params.id;
      const { action } = req.body as { action?: 'pause' | 'resume' };

      if (!action || !['pause', 'resume'].includes(action)) {
        return res.status(400).json({ error: "action debe ser 'pause' o 'resume'" });
      }

      const subscription = db.prepare(`
        SELECT *
        FROM suscripciones_alumno
        WHERE id = ?
          AND deleted_at IS NULL
      `).get(subscriptionId) as any;

      if (!subscription) {
        return res.status(404).json({ error: 'Suscripción no encontrada' });
      }

      if (action === 'pause') {
        if (Number(subscription.congelado || 0) === 1) {
          return res.status(400).json({ error: 'La suscripción ya está congelada.' });
        }

        db.prepare(`
          UPDATE suscripciones_alumno
          SET congelado = 1,
              freeze_iniciado_en = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(subscriptionId);
      } else {
        if (Number(subscription.congelado || 0) === 0 || !subscription.freeze_iniciado_en) {
          return res.status(400).json({ error: 'La suscripción no está congelada.' });
        }

        const freezeStart = new Date(subscription.freeze_iniciado_en);
        const now = new Date();
        const msDiff = Math.max(0, now.getTime() - freezeStart.getTime());
        const pausedDays = Math.max(1, Math.ceil(msDiff / (24 * 60 * 60 * 1000)));

        const expiry = new Date(subscription.fecha_vencimiento);
        expiry.setDate(expiry.getDate() + pausedDays);

        db.prepare(`
          UPDATE suscripciones_alumno
          SET congelado = 0,
              freeze_iniciado_en = NULL,
              dias_congelados = COALESCE(dias_congelados, 0) + ?,
              fecha_vencimiento = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(pausedDays, expiry.toISOString(), subscriptionId);
      }

      refreshSubscriptions();
      const updated = db.prepare('SELECT * FROM suscripciones_alumno WHERE id = ?').get(subscriptionId);
      res.json({ success: true, subscription: updated });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to freeze/resume subscription', details: error.message });
    }
  });

  app.get('/api/coach/community', (req, res) => {
    try {
      refreshSubscriptions();

      const students = db.prepare(`
        SELECT
          p.id,
          p.full_name,
          p.email,
          p.email_verified,
          p.patient_external_id,
          p.credits_remaining,
          p.total_attended
        FROM profiles p
        WHERE p.role = 'student'
          AND p.deleted_at IS NULL
        ORDER BY p.full_name COLLATE NOCASE ASC
      `).all() as Array<any>;

      const payload = students.map((student) => {
        const currentSubscription = db.prepare(`
          SELECT
            sb.suscripcion_id,
            sb.es_titular,
            sb.clases_asignadas,
            sb.clases_restantes,
            sb.estado as beneficiary_status,
            s.fecha_compra,
            s.fecha_vencimiento,
            s.estado as subscription_status,
            s.congelado,
            pa.nombre as package_name,
            pa.capacidad as package_capacity
          FROM suscripcion_beneficiarios sb
          JOIN suscripciones_alumno s ON s.id = sb.suscripcion_id
          LEFT JOIN paquetes pa ON pa.id = s.paquete_id
          WHERE sb.alumno_id = ?
            AND sb.deleted_at IS NULL
            AND s.deleted_at IS NULL
          ORDER BY
            CASE
              WHEN s.estado = 'active' AND sb.estado = 'active' AND s.congelado = 0 AND datetime(s.fecha_vencimiento) >= datetime('now') THEN 0
              WHEN s.estado = 'active' THEN 1
              WHEN s.estado = 'depleted' THEN 2
              ELSE 3
            END,
            datetime(s.fecha_vencimiento) ASC,
            datetime(s.fecha_compra) DESC
          LIMIT 1
        `).get(student.id);

        const activeClass = db.prepare(`
          SELECT c.id, c.type, c.date, c.start_time, c.end_time
          FROM reservations r
          JOIN classes c ON c.id = r.class_id
          WHERE r.user_id = ?
            AND r.deleted_at IS NULL
            AND c.deleted_at IS NULL
            AND datetime(c.date || ' ' || c.start_time) <= datetime('now')
            AND datetime(c.date || ' ' || c.end_time) >= datetime('now')
          ORDER BY c.date ASC, c.start_time ASC
          LIMIT 1
        `).get(student.id);

        const nextClass = db.prepare(`
          SELECT c.id, c.type, c.date, c.start_time, c.end_time
          FROM reservations r
          JOIN classes c ON c.id = r.class_id
          WHERE r.user_id = ?
            AND r.deleted_at IS NULL
            AND c.deleted_at IS NULL
            AND datetime(c.date || ' ' || c.start_time) > datetime('now')
          ORDER BY c.date ASC, c.start_time ASC
          LIMIT 1
        `).get(student.id);

        let warningLowBattery = false;
        let daysToExpiry: number | null = null;
        if (currentSubscription?.fecha_vencimiento) {
          const diff = new Date(currentSubscription.fecha_vencimiento).getTime() - Date.now();
          daysToExpiry = Math.ceil(diff / (24 * 60 * 60 * 1000));
        }
        if (currentSubscription) {
          warningLowBattery =
            Number(currentSubscription.clases_restantes || 0) <= 3 ||
            (daysToExpiry != null && daysToExpiry >= 0 && daysToExpiry < 7);
        }

        return {
          ...student,
          current_subscription: currentSubscription || null,
          active_class: activeClass || null,
          next_class: nextClass || null,
          warning_low_battery: warningLowBattery,
          days_to_expiry: daysToExpiry
        };
      });

      res.json(payload);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch community', details: error.message });
    }
  });

  app.put('/api/coach/students/:id', (req, res) => {
    try {
      const { full_name, email_verified, patient_external_id } = req.body;
      db.prepare(`
        UPDATE profiles
        SET full_name = COALESCE(?, full_name),
            email_verified = COALESCE(?, email_verified),
            patient_external_id = COALESCE(?, patient_external_id),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND role = 'student'
          AND deleted_at IS NULL
      `).run(
        full_name ?? null,
        email_verified == null ? null : (email_verified ? 1 : 0),
        patient_external_id ?? null,
        req.params.id
      );

      const updated = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.params.id);
      res.json({ success: true, student: updated });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update student', details: error.message });
    }
  });

  app.post('/api/coach/students/:id/manual-credits', (req, res) => {
    try {
      refreshSubscriptions();

      const studentId = req.params.id;
      const { amount, reason, actor_id } = req.body;
      const delta = Number(amount);

      if (!Number.isFinite(delta) || delta === 0) {
        return res.status(400).json({ error: 'amount debe ser un número diferente de 0' });
      }

      const transaction = db.transaction(() => {
        const activeBeneficiary = db.prepare(`
          SELECT
            sb.*,
            s.estado as subscription_status,
            s.fecha_vencimiento
          FROM suscripcion_beneficiarios sb
          JOIN suscripciones_alumno s ON s.id = sb.suscripcion_id
          WHERE sb.alumno_id = ?
            AND sb.deleted_at IS NULL
            AND s.deleted_at IS NULL
            AND s.estado = 'active'
            AND sb.estado IN ('active', 'depleted')
            AND datetime(s.fecha_vencimiento) >= datetime('now')
          ORDER BY datetime(s.fecha_vencimiento) ASC
          LIMIT 1
        `).get(studentId) as any;

        let beforeBalance = 0;
        let afterBalance = 0;
        let targetSubscriptionId: string | null = null;

        if (activeBeneficiary) {
          beforeBalance = Number(activeBeneficiary.clases_restantes || 0);
          afterBalance = beforeBalance + delta;
          if (afterBalance < 0) {
            throw new Error('NEGATIVE_BALANCE_NOT_ALLOWED');
          }

          targetSubscriptionId = activeBeneficiary.suscripcion_id;
          db.prepare(`
            UPDATE suscripcion_beneficiarios
            SET clases_asignadas = CASE WHEN ? > 0 THEN clases_asignadas + ? ELSE clases_asignadas END,
                clases_restantes = clases_restantes + ?,
                estado = CASE WHEN (clases_restantes + ?) <= 0 THEN 'depleted' ELSE 'active' END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(delta, delta, delta, delta, activeBeneficiary.id);

          if (delta > 0) {
            db.prepare(`
              UPDATE suscripciones_alumno
              SET clases_totales = clases_totales + ?,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run(delta, targetSubscriptionId);
          }
        } else {
          if (delta < 0) {
            throw new Error('NO_ACTIVE_SUBSCRIPTION');
          }

          const subscriptionId = createId('sub_manual_');
          const purchaseDate = new Date();
          const expiryDate = new Date(purchaseDate);
          expiryDate.setDate(expiryDate.getDate() + 365);
          targetSubscriptionId = subscriptionId;
          beforeBalance = 0;
          afterBalance = delta;

          db.prepare(`
            INSERT INTO suscripciones_alumno (
              id, alumno_id, paquete_id, fecha_compra, fecha_vencimiento,
              clases_totales, clases_restantes, clases_consumidas, estado, notas, created_at, updated_at
            ) VALUES (?, ?, NULL, ?, ?, ?, ?, 0, 'active', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `).run(
            subscriptionId,
            studentId,
            purchaseDate.toISOString(),
            expiryDate.toISOString(),
            delta,
            delta,
            reason || 'Créditos manuales'
          );
          db.prepare(`
            INSERT INTO suscripcion_beneficiarios (
              id, suscripcion_id, alumno_id, es_titular, clases_asignadas, clases_restantes, estado, created_at, updated_at
            ) VALUES (?, ?, ?, 1, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `).run(createId('ben_'), subscriptionId, studentId, delta, delta);
        }

        db.prepare(`
          UPDATE suscripciones_alumno
          SET clases_restantes = (
              SELECT COALESCE(SUM(clases_restantes), 0)
              FROM suscripcion_beneficiarios
              WHERE suscripcion_id = suscripciones_alumno.id
                AND deleted_at IS NULL
            ),
            clases_consumidas = MAX(
              0,
              clases_totales - (
                SELECT COALESCE(SUM(clases_restantes), 0)
                FROM suscripcion_beneficiarios
                WHERE suscripcion_id = suscripciones_alumno.id
                  AND deleted_at IS NULL
              )
            ),
            estado = CASE
              WHEN estado = 'expired' THEN 'expired'
              WHEN (
                SELECT COALESCE(SUM(clases_restantes), 0)
                FROM suscripcion_beneficiarios
                WHERE suscripcion_id = suscripciones_alumno.id
                  AND deleted_at IS NULL
              ) <= 0 THEN 'depleted'
              ELSE 'active'
            END,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(targetSubscriptionId);

        const adjustmentId = createId('adj_');
        db.prepare(`
          INSERT INTO ajustes_credito (
            id, alumno_id, suscripcion_id, actor_id, ajuste, motivo,
            clases_restantes_antes, clases_restantes_despues, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(
          adjustmentId,
          studentId,
          targetSubscriptionId,
          actor_id || null,
          delta,
          reason || null,
          beforeBalance,
          afterBalance
        );

        syncStudentCredits(studentId);
      });

      transaction();
      const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(studentId);
      res.json({ success: true, profile });
    } catch (error: any) {
      if (error.message === 'NEGATIVE_BALANCE_NOT_ALLOWED') {
        return res.status(400).json({ error: 'No se puede dejar clases restantes en negativo' });
      }
      if (error.message === 'NO_ACTIVE_SUBSCRIPTION') {
        return res.status(400).json({ error: 'No hay suscripción activa para descontar clases' });
      }
      res.status(500).json({ error: 'Failed to apply manual credit adjustment', details: error.message });
    }
  });

  app.post('/api/coach/attendance', (req, res) => {
    try {
      refreshSubscriptions();

      const { alumno_id, clase_id, actor_id, estado } = req.body;
      const attendanceStatus = estado === 'no_show' ? 'no_show' : 'attended';
      if (!alumno_id || !clase_id) {
        return res.status(400).json({ error: 'alumno_id y clase_id son requeridos' });
      }

      const tx = db.transaction(() => {
        const alreadyRegistered = db.prepare(`
          SELECT id
          FROM registros_asistencia
          WHERE alumno_id = ?
            AND clase_id = ?
            AND deleted_at IS NULL
        `).get(alumno_id, clase_id);

        if (alreadyRegistered) {
          throw new Error('ATTENDANCE_ALREADY_REGISTERED');
        }

        const beneficiary = db.prepare(`
          SELECT
            sb.*,
            s.id as suscripcion_id,
            s.fecha_vencimiento
          FROM suscripcion_beneficiarios sb
          JOIN suscripciones_alumno s ON s.id = sb.suscripcion_id
          WHERE sb.alumno_id = ?
            AND sb.deleted_at IS NULL
            AND s.deleted_at IS NULL
            AND s.estado = 'active'
            AND s.congelado = 0
            AND sb.estado = 'active'
            AND sb.clases_restantes > 0
            AND datetime(s.fecha_vencimiento) >= datetime('now')
          ORDER BY datetime(s.fecha_vencimiento) ASC
          LIMIT 1
        `).get(alumno_id) as any;

        if (!beneficiary) {
          throw new Error('NO_ACTIVE_SUBSCRIPTION');
        }

        const classInfo = db.prepare(`
          SELECT id, date, start_time, end_time, status
          FROM classes
          WHERE id = ?
            AND deleted_at IS NULL
        `).get(clase_id) as any;

        if (!classInfo) {
          throw new Error('CLASS_NOT_FOUND');
        }

        if (classInfo.status !== 'active') {
          throw new Error('CLASS_NOT_ACTIVE');
        }

        const alreadyRegisteredSameDay = db.prepare(`
          SELECT ra.id
          FROM registros_asistencia ra
          JOIN classes c ON c.id = ra.clase_id
          WHERE ra.alumno_id = ?
            AND c.date = ?
            AND ra.deleted_at IS NULL
            AND c.deleted_at IS NULL
          LIMIT 1
        `).get(alumno_id, classInfo.date);

        if (alreadyRegisteredSameDay) {
          throw new Error('DAILY_LIMIT_REACHED');
        }

        const classStartDateTime = new Date(`${classInfo.date}T${classInfo.start_time || '00:00:00'}`);
        const subscriptionExpiryDate = new Date(beneficiary.fecha_vencimiento);
        if (classStartDateTime.getTime() > subscriptionExpiryDate.getTime()) {
          throw new Error('CLASS_AFTER_EXPIRY');
        }

        db.prepare(`
          UPDATE suscripcion_beneficiarios
          SET clases_restantes = clases_restantes - 1,
              estado = CASE WHEN (clases_restantes - 1) <= 0 THEN 'depleted' ELSE 'active' END,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(beneficiary.id);

        db.prepare(`
          UPDATE suscripciones_alumno
          SET clases_restantes = (
              SELECT COALESCE(SUM(clases_restantes), 0)
              FROM suscripcion_beneficiarios
              WHERE suscripcion_id = suscripciones_alumno.id
                AND deleted_at IS NULL
            ),
            clases_consumidas = MAX(
              0,
              clases_totales - (
                SELECT COALESCE(SUM(clases_restantes), 0)
                FROM suscripcion_beneficiarios
                WHERE suscripcion_id = suscripciones_alumno.id
                  AND deleted_at IS NULL
              )
            ),
            estado = CASE
              WHEN estado = 'expired' THEN 'expired'
              WHEN (
                SELECT COALESCE(SUM(clases_restantes), 0)
                FROM suscripcion_beneficiarios
                WHERE suscripcion_id = suscripciones_alumno.id
                  AND deleted_at IS NULL
              ) <= 0 THEN 'depleted'
              ELSE 'active'
            END,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(beneficiary.suscripcion_id);

        db.prepare(`
          INSERT INTO registros_asistencia (
            id, alumno_id, clase_id, suscripcion_id, estado, asistio_en, registrado_por, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(createId('att_'), alumno_id, clase_id, beneficiary.suscripcion_id, attendanceStatus, actor_id || null);

        db.prepare(`
          UPDATE reservations
          SET status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
            AND class_id = ?
            AND deleted_at IS NULL
        `).run(attendanceStatus, alumno_id, clase_id);

        if (attendanceStatus === 'attended') {
          db.prepare(`
            UPDATE profiles
            SET total_attended = total_attended + 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(alumno_id);
        }

        syncStudentCredits(alumno_id);
      });

      tx();
      const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(alumno_id);
      res.json({
        success: true,
        profile,
        message: attendanceStatus === 'no_show'
          ? 'Ausencia registrada. Clase descontada por política de no-show.'
          : 'Asistencia registrada y clase descontada correctamente.'
      });
    } catch (error: any) {
      if (error.message === 'ATTENDANCE_ALREADY_REGISTERED') {
        return res.status(409).json({ error: 'La asistencia ya fue registrada para este alumno y clase.' });
      }
      if (error.message === 'NO_ACTIVE_SUBSCRIPTION') {
        return res.status(400).json({ error: 'El alumno no tiene una suscripción activa con clases disponibles.' });
      }
      if (error.message === 'DAILY_LIMIT_REACHED') {
        return res.status(400).json({ error: 'No se puede registrar más de 1 clase por persona en el mismo día.' });
      }
      if (error.message === 'CLASS_AFTER_EXPIRY') {
        return res.status(400).json({ error: 'La fecha de la clase es posterior al vencimiento del paquete.' });
      }
      if (error.message === 'CLASS_NOT_FOUND') {
        return res.status(404).json({ error: 'Clase no encontrada para registrar asistencia.' });
      }
      if (error.message === 'CLASS_NOT_ACTIVE') {
        return res.status(400).json({ error: 'La clase no está activa.' });
      }
      res.status(500).json({ error: 'Failed to register attendance', details: error.message });
    }
  });

  app.get('/api/coach/students/:id/subscriptions', (req, res) => {
    try {
      refreshSubscriptions();
      const subscriptions = db.prepare(`
        SELECT DISTINCT
          s.*,
          p.nombre as package_name,
          p.capacidad as package_capacity,
          sb.es_titular,
          sb.clases_asignadas as alumno_clases_asignadas,
          sb.clases_restantes as alumno_clases_restantes
        FROM suscripciones_alumno s
        JOIN suscripcion_beneficiarios sb ON sb.suscripcion_id = s.id
        LEFT JOIN paquetes p ON p.id = s.paquete_id
        WHERE sb.alumno_id = ?
          AND sb.deleted_at IS NULL
          AND s.deleted_at IS NULL
        ORDER BY datetime(s.fecha_compra) DESC
      `).all(req.params.id);

      const subscriptionIds = subscriptions.map((sub: any) => sub.id);
      const beneficiariesBySubscription = subscriptionIds.length
        ? db.prepare(`
            SELECT
              sb.*,
              p.full_name,
              p.email
            FROM suscripcion_beneficiarios sb
            JOIN profiles p ON p.id = sb.alumno_id
            WHERE sb.deleted_at IS NULL
              AND sb.suscripcion_id IN (${subscriptionIds.map(() => '?').join(',')})
            ORDER BY sb.suscripcion_id, sb.es_titular DESC, datetime(sb.created_at) ASC
          `).all(...subscriptionIds)
        : [];

      const beneficiariesMap = beneficiariesBySubscription.reduce((acc: Record<string, any[]>, row: any) => {
        if (!acc[row.suscripcion_id]) acc[row.suscripcion_id] = [];
        acc[row.suscripcion_id].push(row);
        return acc;
      }, {});

      const transactions = db.prepare(`
        SELECT *
        FROM transacciones_pago
        WHERE alumno_id = ?
          AND deleted_at IS NULL
        ORDER BY datetime(fecha_pago) DESC
      `).all(req.params.id);

      const adjustments = db.prepare(`
        SELECT *
        FROM ajustes_credito
        WHERE alumno_id = ?
          AND deleted_at IS NULL
        ORDER BY datetime(created_at) DESC
      `).all(req.params.id);

      const activity = db.prepare(`
        SELECT
          'attendance' as tipo,
          ra.estado as evento,
          COALESCE(c.type, 'Clase') as referencia,
          COALESCE(c.date, date(ra.asistio_en)) as fecha,
          c.start_time as hora,
          ra.asistio_en as timestamp,
          NULL as ajuste,
          NULL as motivo
        FROM registros_asistencia ra
        LEFT JOIN classes c ON c.id = ra.clase_id
        WHERE ra.alumno_id = ?
          AND ra.deleted_at IS NULL

        UNION ALL

        SELECT
          'adjustment' as tipo,
          CASE WHEN ac.ajuste >= 0 THEN 'credit_add' ELSE 'credit_remove' END as evento,
          'Ajuste manual' as referencia,
          date(ac.created_at) as fecha,
          time(ac.created_at) as hora,
          ac.created_at as timestamp,
          ac.ajuste as ajuste,
          ac.motivo as motivo
        FROM ajustes_credito ac
        WHERE ac.alumno_id = ?
          AND ac.deleted_at IS NULL

        ORDER BY timestamp DESC
      `).all(req.params.id, req.params.id);

      const normalizedSubscriptions = subscriptions.map((sub: any) => ({
        ...sub,
        beneficiaries: beneficiariesMap[sub.id] || []
      }));

      res.json({ subscriptions: normalizedSubscriptions, transactions, adjustments, activity });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch student subscriptions', details: error.message });
    }
  });

  app.get('/api/coach/cash-cut', (req, res) => {
    try {
      const { startDate, endDate, year, month } = req.query as { startDate?: string; endDate?: string; year?: string; month?: string };
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      let start = startDate;
      let end = endDate;
      let selectedYear = year ? Number(year) : currentYear;
      let selectedMonth = month ? Number(month) : currentMonth;
      let filterMode: 'month' | 'year' | 'range' = 'month';

      if (startDate && endDate) {
        filterMode = 'range';
      } else if (year && month) {
        filterMode = 'month';
        const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
        const monthEnd = new Date(selectedYear, selectedMonth, 0);
        start = monthStart.toISOString().slice(0, 10);
        end = monthEnd.toISOString().slice(0, 10);
      } else if (year && !month) {
        filterMode = 'year';
        start = `${selectedYear}-01-01`;
        end = `${selectedYear}-12-31`;
      } else {
        filterMode = 'month';
        const monthStart = new Date(currentYear, currentMonth - 1, 1);
        const monthEnd = new Date(currentYear, currentMonth, 0);
        selectedYear = currentYear;
        selectedMonth = currentMonth;
        start = monthStart.toISOString().slice(0, 10);
        end = monthEnd.toISOString().slice(0, 10);
      }

      const availableYears = db.prepare(`
        SELECT DISTINCT CAST(strftime('%Y', fecha_pago) AS INTEGER) as year
        FROM transacciones_pago
        WHERE deleted_at IS NULL
        ORDER BY year DESC
      `).all().map((row: any) => row.year).filter((y: any) => !!y);

      const monthsForYear = db.prepare(`
        SELECT DISTINCT CAST(strftime('%m', fecha_pago) AS INTEGER) as month
        FROM transacciones_pago
        WHERE deleted_at IS NULL
          AND strftime('%Y', fecha_pago) = ?
        ORDER BY month ASC
      `).all(String(selectedYear)).map((row: any) => row.month).filter((m: any) => !!m);

      const baseFilter = `
        FROM transacciones_pago t
        LEFT JOIN paquetes p ON p.id = t.paquete_id
        WHERE t.deleted_at IS NULL
          AND date(t.fecha_pago) BETWEEN date(?) AND date(?)
      `;

      const summary = db.prepare(`
        SELECT
          COUNT(*) as paquetes_vendidos,
          COALESCE(SUM(t.monto), 0) as ingresos_totales
        ${baseFilter}
      `).get(start, end) as { paquetes_vendidos: number; ingresos_totales: number };

      const byPackage = db.prepare(`
        SELECT
          COALESCE(p.nombre, 'Sin paquete') as paquete,
          COUNT(*) as ventas,
          COALESCE(SUM(t.monto), 0) as ingresos
        ${baseFilter}
        GROUP BY COALESCE(p.nombre, 'Sin paquete')
        ORDER BY ingresos DESC
      `).all(start, end);

      const daily = db.prepare(`
        SELECT date(t.fecha_pago) as periodo, COUNT(*) as ventas, COALESCE(SUM(t.monto), 0) as ingresos
        ${baseFilter}
        GROUP BY date(t.fecha_pago)
        ORDER BY date(t.fecha_pago)
      `).all(start, end);

      const weekly = db.prepare(`
        SELECT strftime('%Y-W%W', t.fecha_pago) as periodo, COUNT(*) as ventas, COALESCE(SUM(t.monto), 0) as ingresos
        ${baseFilter}
        GROUP BY strftime('%Y-W%W', t.fecha_pago)
        ORDER BY periodo
      `).all(start, end);

      const monthly = db.prepare(`
        SELECT strftime('%Y-%m', t.fecha_pago) as periodo, COUNT(*) as ventas, COALESCE(SUM(t.monto), 0) as ingresos
        ${baseFilter}
        GROUP BY strftime('%Y-%m', t.fecha_pago)
        ORDER BY periodo
      `).all(start, end);

      const yearly = db.prepare(`
        SELECT strftime('%Y', t.fecha_pago) as periodo, COUNT(*) as ventas, COALESCE(SUM(t.monto), 0) as ingresos
        ${baseFilter}
        GROUP BY strftime('%Y', t.fecha_pago)
        ORDER BY periodo
      `).all(start, end);

      res.json({
        filterMode,
        selectedYear,
        selectedMonth,
        availableYears,
        availableMonths: monthsForYear,
        range: { startDate: start, endDate: end },
        paquetesVendidos: summary.paquetes_vendidos || 0,
        ingresosTotales: Number(summary.ingresos_totales || 0),
        porPaquete: byPackage,
        desglose: {
          diario: daily,
          semanal: weekly,
          mensual: monthly,
          anual: yearly
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to generate cash cut report', details: error.message });
    }
  });

  app.post('/api/classes', (req, res) => {
    const { type, date, start_time, end_time, capacity, created_by } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    try {
      db.prepare('INSERT INTO classes (id, type, date, start_time, end_time, capacity, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, type, date, start_time, end_time, capacity, created_by);
      res.json({ success: true, id });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create class' });
    }
  });

  app.patch('/api/classes/:id/cancel', (req, res) => {
    const { canceled_by } = req.body;
    try {
      db.prepare("UPDATE classes SET status = 'canceled', canceled_by = ? WHERE id = ?").run(canceled_by, req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to cancel class' });
    }
  });

  app.delete('/api/classes/:id', (req, res) => {
    try {
      db.prepare('DELETE FROM classes WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete class' });
    }
  });

  app.patch('/api/profiles/:id/credits', (req, res) => {
    const { credits } = req.body;
    try {
      db.prepare('UPDATE profiles SET credits_remaining = ? WHERE id = ?').run(credits, req.params.id);
      const updated = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.params.id);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update credits' });
    }
  });

  app.get('/api/admin/profiles', (req, res) => {
    // In a real app, we'd check if the requester is an admin
    const profiles = db.prepare('SELECT id, email, full_name, role, credits_remaining, total_attended, email_verified FROM profiles').all();
    res.json(profiles);
  });

  app.delete('/api/admin/profiles/:id', (req, res) => {
    try {
      const userId = req.params.id;
      
      // Check for dependencies before deletion
      const userReservations = db.prepare(`
        SELECT COUNT(*) as count FROM reservations WHERE user_id = ?
      `).get(userId) as { count: number };
      
      if (userReservations.count > 0) {
        // Get detailed reservation information
        const reservationDetails = db.prepare(`
          SELECT r.id, c.type, c.date, c.start_time, c.status
          FROM reservations r
          JOIN classes c ON r.class_id = c.id
          WHERE r.user_id = ?
          ORDER BY c.date DESC, c.start_time DESC
          LIMIT 5
        `).all(userId);
        
        return res.status(400).json({ 
          error: 'USER_HAS_RESERVATIONS',
          message: `No se puede eliminar el usuario porque tiene ${userReservations.count} reserva(s) activa(s).`,
          details: {
            reservationCount: userReservations.count,
            recentReservations: reservationDetails
          },
          suggestions: [
            'Cancelar las reservas del usuario primero',
            'Transferir las reservas a otro usuario',
            'Archivar el usuario en lugar de eliminarlo'
          ]
        });
      }
      
      // Check if user is a coach with assigned classes
      const coachClasses = db.prepare(`
        SELECT COUNT(*) as count FROM classes WHERE created_by = ? OR canceled_by = ?
      `).get(userId, userId) as { count: number };
      
      if (coachClasses.count > 0) {
        return res.status(400).json({
          error: 'USER_IS_COACH',
          message: `No se puede eliminar el usuario porque es coach de ${coachClasses.count} clase(s).`,
          details: {
            classCount: coachClasses.count
          },
          suggestions: [
            'Reasignar las clases a otro coach',
            'Archivar el usuario en lugar de eliminarlo'
          ]
        });
      }
      
      // Get user info for confirmation
      const userInfo = db.prepare('SELECT email, full_name FROM profiles WHERE id = ?').get(userId);
      
      // Safe to delete
      db.prepare('DELETE FROM profiles WHERE id = ?').run(userId);
      
      res.json({ 
        success: true, 
        message: `Usuario "${userInfo.full_name}" (${userInfo.email}) eliminado exitosamente.`,
        deletedUser: userInfo
      });
      
    } catch (error: any) {
      console.error('Error deleting profile:', error);
      res.status(500).json({ 
        error: 'DELETE_FAILED',
        message: 'Error al eliminar el usuario. Por favor contacta al administrador.',
        technical: error.message 
      });
    }
  });

  app.get('/api/admin/stats', (req, res) => {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM profiles').get() as any;
    const classCount = db.prepare('SELECT COUNT(*) as count FROM classes').get() as any;
    const reservationCount = db.prepare('SELECT COUNT(*) as count FROM reservations').get() as any;
    const totalCredits = db.prepare('SELECT SUM(credits_remaining) as total FROM profiles').get() as any;
    
    res.json({ 
      totalUsers: userCount.count, 
      totalClasses: classCount.count, 
      totalReservations: reservationCount.count,
      totalCredits: totalCredits.total || 0
    });
  });

  // Admin CRUD for Classes
  app.get('/api/admin/classes', (req, res) => {
    try {
      const classes = db.prepare(`
        SELECT 
          c.*,
          creator_profile.email as created_by_email,
          canceler_profile.email as canceled_by_email
        FROM classes c
        LEFT JOIN profiles creator_profile ON c.created_by = creator_profile.id
        LEFT JOIN profiles canceler_profile ON c.canceled_by = canceler_profile.id
        ORDER BY c.date DESC
      `).all();
      res.json(classes);
    } catch (error: any) {
      console.error('Error in /api/admin/classes:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/admin/classes/:id', (req, res) => {
    try {
      console.log('DELETE /api/admin/classes/:id - ID:', req.params.id);
      db.prepare('DELETE FROM classes WHERE id = ?').run(req.params.id);
      console.log('Class deleted successfully');
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting class:', error);
      res.status(500).json({ error: 'Failed to delete class permanently', details: error.message });
    }
  });

  app.put('/api/admin/classes/:id', (req, res) => {
    try {
      console.log('PUT /api/admin/classes/:id - Body:', req.body);
      const { type, date, start_time, end_time, capacity, status } = req.body;
      // Por ahora usamos un valor por defecto, en producción deberíamos obtener el usuario autenticado
      const userId = 'admin-updated';
      
      db.prepare('UPDATE classes SET type = ?, date = ?, start_time = ?, end_time = ?, capacity = ?, status = ?, updated_by = ? WHERE id = ?')
        .run(type, date, start_time, end_time, capacity, status || 'active', userId, req.params.id);
      console.log('Class updated successfully');
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error updating class:', error);
      res.status(500).json({ error: 'Failed to update class', details: error.message });
    }
  });

  // Coach Analytics API
  app.get('/api/coach/analytics', (req, res) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // Most reserved class type
    const mostReservedClass = db.prepare(`
      SELECT c.type, COUNT(r.id) as count
      FROM classes c
      LEFT JOIN reservations r ON c.id = r.class_id
      WHERE c.date >= date('now', '-12 months')
      GROUP BY c.type
      ORDER BY count DESC
      LIMIT 1
    `).get() as { type: string; count: number } | null;

    // Monthly stats for current year
    const monthlyStats = db.prepare(`
      SELECT 
        strftime('%m', date) as month_num,
        CASE strftime('%m', date)
          WHEN '01' THEN 'Enero'
          WHEN '02' THEN 'Febrero'
          WHEN '03' THEN 'Marzo'
          WHEN '04' THEN 'Abril'
          WHEN '05' THEN 'Mayo'
          WHEN '06' THEN 'Junio'
          WHEN '07' THEN 'Julio'
          WHEN '08' THEN 'Agosto'
          WHEN '09' THEN 'Septiembre'
          WHEN '10' THEN 'Octubre'
          WHEN '11' THEN 'Noviembre'
          WHEN '12' THEN 'Diciembre'
        END as month,
        COUNT(DISTINCT c.id) as classes,
        COUNT(r.id) as reservations
      FROM classes c
      LEFT JOIN reservations r ON c.id = r.class_id
      WHERE strftime('%Y', c.date) = ?
      GROUP BY strftime('%m', c.date), month
      ORDER BY month_num
    `).all(currentYear.toString());

    // Current month and year counts
    const currentMonthClasses = db.prepare(`
      SELECT COUNT(*) as count
      FROM classes
      WHERE strftime('%Y', date) = ? AND strftime('%m', date) = ?
    `).get(currentYear.toString(), currentMonth.toString().padStart(2, '0')) as { count: number };

    const currentYearClasses = db.prepare(`
      SELECT COUNT(*) as count
      FROM classes
      WHERE strftime('%Y', date) = ?
    `).get(currentYear.toString()) as { count: number };

    // Yearly stats
    const yearlyStats = db.prepare(`
      SELECT 
        COUNT(DISTINCT c.id) as classes,
        COUNT(r.id) as reservations,
        COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as completed
      FROM classes c
      LEFT JOIN reservations r ON c.id = r.class_id
      WHERE strftime('%Y', c.date) = ?
    `).get(currentYear.toString()) as { classes: number; reservations: number; completed: number };

    res.json({
      mostReservedClass,
      monthlyStats,
      yearlyStats: {
        year: currentYear.toString(),
        ...yearlyStats
      },
      currentMonthClasses: currentMonthClasses.count,
      currentYearClasses: currentYearClasses.count
    });
  });

  // Admin CRUD for Reservations
  app.get('/api/admin/reservations', (req, res) => {
    const reservations = db.prepare(`
      SELECT r.*, p.email as user_email, c.type as class_type, c.date as class_date 
      FROM reservations r
      JOIN profiles p ON r.user_id = p.id
      JOIN classes c ON r.class_id = c.id
      ORDER BY r.created_at DESC
    `).all();
    res.json(reservations);
  });

  app.delete('/api/admin/reservations/:id', (req, res) => {
    db.prepare('DELETE FROM reservations WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Admin CRUD for Profiles (Create & Update)
  app.post('/api/admin/profiles', async (req, res) => {
    const { email, password, full_name, role, credits_remaining } = req.body;
    try {
      const id = Math.random().toString(36).substr(2, 9);
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password || 'focus123', salt);
      db.prepare('INSERT INTO profiles (id, email, full_name, password_hash, role, credits_remaining) VALUES (?, ?, ?, ?, ?, ?)').run(
        id, email, full_name, hash, role, credits_remaining || 0
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/admin/profiles/:id', (req, res) => {
    const { full_name, role, credits_remaining } = req.body;
    db.prepare('UPDATE profiles SET full_name = ?, role = ?, credits_remaining = ? WHERE id = ?')
      .run(full_name, role, credits_remaining, req.params.id);
    res.json({ success: true });
  });

  // Email Verification Endpoints
  app.post('/api/send-verification', async (req, res) => {
    const { email } = req.body;
    try {
      const user = db.prepare('SELECT * FROM profiles WHERE email = ?').get(email);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      if (user.email_verified) {
        return res.status(400).json({ error: 'El correo ya está verificado' });
      }

      // Generate verification token
      const token = Math.random().toString(36).substr(2, 32);
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      db.prepare('UPDATE profiles SET email_verification_token = ?, email_verified = FALSE WHERE id = ?')
        .run(token, user.id);

      // Send verification email
      await emailService.sendVerificationEmail(email, token);
      
      res.json({ success: true, message: 'Email de verificación enviado' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/verify-email', (req, res) => {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ error: 'Token requerido' });
    }

    try {
      const user = db.prepare('SELECT * FROM profiles WHERE email_verification_token = ? AND email_verification_expires > ?').get(token, new Date().toISOString());
      
      if (!user) {
        return res.status(400).json({ error: 'Token inválido o expirado' });
      }

      // Mark email as verified
      db.prepare('UPDATE profiles SET email_verified = TRUE, email_verification_token = NULL, email_verification_expires = NULL WHERE id = ?')
        .run(user.id);

      res.json({ success: true, message: 'Correo verificado exitosamente' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Email Verification Page
  app.get('/verify-email', (req, res) => {
    const { token } = req.query;
    
    console.log('🔍 === VERIFICACIÓN EMAIL (GET) ===');
    console.log('Token recibido en query:', token);
    console.log('URL completa:', req.url);
    
    if (!token) {
      console.log('❌ Token no proporcionado en query params');
      return res.send(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 100px auto; padding: 40px; text-align: center; border: 1px solid #e9ecef; border-radius: 10px;">
          <h1 style="color: #dc3545;">❌ Error de Verificación</h1>
          <p style="color: #666; font-size: 16px;">No se proporcionó token de verificación.</p>
          <p style="color: #666; font-size: 14px; margin-top: 20px;">Por favor, usa el botón de verificación en el email que recibiste.</p>
          <a href="/" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Ir al Inicio</a>
        </div>
      `);
    }

    console.log('✅ Token recibido, redirigiendo a POST sin token en URL...');
    
    // Redirigir a POST sin token en URL usando JavaScript
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Verificando correo...</title>
        <meta charset="utf-8">
      </head>
      <body style="font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f8f9fa;">
        <div style="text-align: center;">
          <div style="width: 60px; height: 60px; border: 4px solid #f3f3f3; border-top: 4px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
          <h2 style="color: #333; margin: 0;">Verificando tu correo...</h2>
          <p style="color: #666; margin: 10px 0 0 0;">Por favor espera un momento.</p>
        </div>
        
        <form id="verifyForm" method="POST" style="display: none;">
          <input type="hidden" name="token" value="${token}" />
        </form>
        
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
        
        <script>
          // Enviar formulario automáticamente sin mostrar token en URL
          setTimeout(function() {
            document.getElementById('verifyForm').submit();
          }, 1000);
        </script>
      </body>
      </html>
    `);
  });

  // Password Reset Page
  app.get('/reset-password', (req, res) => {
    const { token } = req.query;
    
    console.log('🔍 === RESET PASSWORD (GET) ===');
    console.log('Token recibido en query:', token);
    console.log('URL completa:', req.url);
    
    if (!token) {
      console.log('❌ Token no proporcionado en query params');
      return res.send(`
        <div class="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-white overflow-hidden relative">
          <div class="absolute top-0 right-0 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-brand/5 rounded-full -mr-24 -mt-24 sm:-mr-48 sm:-mt-48 blur-3xl"></div>
          <div class="absolute bottom-0 left-0 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-brand/5 rounded-full -ml-24 -mb-24 sm:-ml-48 sm:-mb-48 blur-3xl"></div>
          <div class="w-full max-w-sm sm:max-w-md space-y-8 sm:space-y-12 relative z-10">
            <div class="text-center space-y-3 sm:space-y-4">
              <div class="flex justify-center mb-4">
                <img src="https://res.cloudinary.com/dawdatp8z/image/upload/v1771880764/c4c01b58-3d9e-4419-8d6a-a5bcb7b702d9-removebg-preview_zuearf.png" 
                     alt="Focus Fitness Logo" 
                     class="w-24 h-24 sm:w-32 sm:h-32 object-contain">
              </div>
              <h2 class="text-5xl sm:text-6xl lg:text-8xl font-bebas text-zinc-900 tracking-tighter uppercase italic leading-[0.8]">
                ERROR DE <br/>
                <span class="text-rose-500">RESTABLECIMIENTO</span>
              </h2>
              <p class="text-[8px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-[0.5em]">
                Token no proporcionado
              </p>
            </div>
            <div class="bg-white border-2 border-zinc-100 p-8 sm:p-12 rounded-[3rem] sm:rounded-[4rem] shadow-2xl shadow-zinc-200/50 space-y-6 sm:space-y-8">
              <div class="bg-rose-50 text-rose-500 p-4 sm:p-6 rounded-2xl sm:rounded-3xl text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-center border border-rose-100">
                No se proporcionó token de restablecimiento. Por favor, usa el enlace que recibiste en tu email.
              </div>
              <div class="text-center">
                <a href="/" class="w-full py-6 sm:py-8 bg-zinc-900 hover:bg-brand text-white font-black rounded-[1.8rem] sm:rounded-[2rem] text-[10px] sm:text-[12px] uppercase tracking-[0.4em] transition-all shadow-xl active:scale-95 inline-block">
                  IR AL INICIO
                </a>
              </div>
            </div>
          </div>
        </div>
      `);
    }

    console.log('✅ Token recibido, redirigiendo a POST sin token en URL...');
    
    // Redirigir a POST sin token en URL usando JavaScript
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Redirigiendo...</title>
        <meta charset="utf-8">
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  brand: '#667eea'
                },
                fontFamily: {
                  'bebas': ['Bebas Neue', 'cursive']
                }
              }
            }
          }
        </script>
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" rel="stylesheet">
      </head>
      <body class="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-white overflow-hidden relative">
        <!-- Background Decor -->
        <div class="absolute top-0 right-0 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-brand/5 rounded-full -mr-24 -mt-24 sm:-mr-48 sm:-mt-48 blur-3xl"></div>
        <div class="absolute bottom-0 left-0 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-brand/5 rounded-full -ml-24 -mb-24 sm:-ml-48 sm:-mb-48 blur-3xl"></div>

        <div class="w-full max-w-sm sm:max-w-md space-y-8 sm:space-y-12 relative z-10">
          <div class="text-center space-y-3 sm:space-y-4">
            <div class="flex justify-center mb-4">
              <div class="w-48 h-36 sm:w-56 sm:h-42 lg:w-64 lg:h-48 bg-zinc-900 rounded-2xl flex items-center justify-center p-3 overflow-hidden">
                <img src="https://res.cloudinary.com/dvf1wagvx/image/upload/v1773890396/Gemini_Generated_Image_3rtis53rtis53rti-Picsart-BackgroundRemover_fdvs9q.png" 
                     alt="Focus Fitness Logo" 
                     class="w-full h-full object-cover">
              </div>
            </div>
            <h2 class="text-5xl sm:text-6xl lg:text-8xl font-bebas text-zinc-900 tracking-tighter uppercase italic leading-[0.8]">
              PROCESANDO <br/>
              <span class="text-brand">RESTABLECIMIENTO</span>
            </h2>
            <p class="text-[8px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-[0.5em]">
              Por favor espera...
            </p>
          </div>

          <div class="bg-white border-2 border-zinc-100 p-8 sm:p-12 rounded-[3rem] sm:rounded-[4rem] shadow-2xl shadow-zinc-200/50 space-y-6 sm:space-y-8">
            <div class="text-center">
              <div class="w-16 h-16 border-4 border-zinc-200 border-t-brand rounded-full animate-spin mx-auto mb-4"></div>
              <p class="text-[8px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                Verificando token de seguridad...
              </p>
              <p class="text-[6px] sm:text-[7px] text-zinc-300 uppercase tracking-[0.3em] mt-2">
                La URL cambiará a una segura sin token
              </p>
            </div>
          </div>
        </div>
        
        <form id="resetForm" method="POST" action="/reset-password" style="display: none;">
          <input type="hidden" name="token" value="${token}" />
        </form>
        
        <script>
          console.log('🔄 Redirigiendo de URL con token a URL segura...');
          console.log('📋 Token actual:', '${token}');
          console.log('📋 Formulario encontrado:', !!document.getElementById('resetForm'));
          
          // Enviar formulario automáticamente sin mostrar token en URL
          setTimeout(function() {
            console.log('⏰ Ejecutando submit automático...');
            const form = document.getElementById('resetForm');
            console.log('📋 Formulario antes de submit:', form);
            console.log('📋 Action del formulario:', form?.action);
            form.submit();
            console.log('✅ Submit ejecutado');
          }, 2000);
        </script>
      </body>
      </html>
    `);
  });

  // Password Reset Form (POST - muestra el formulario real)
  app.post('/reset-password', (req, res) => {
    const { token } = req.body;
    
    console.log('🔍 === RESET PASSWORD FORM (POST) ===');
    console.log('Token recibido en body:', token);
    
    if (!token) {
      console.log('❌ Token no proporcionado en body');
      return res.send(`
        <div class="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-white overflow-hidden relative">
          <div class="absolute top-0 right-0 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-brand/5 rounded-full -mr-24 -mt-24 sm:-mr-48 sm:-mt-48 blur-3xl"></div>
          <div class="absolute bottom-0 left-0 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-brand/5 rounded-full -ml-24 -mb-24 sm:-ml-48 sm:-mb-48 blur-3xl"></div>
          <div class="w-full max-w-sm sm:max-w-md space-y-8 sm:space-y-12 relative z-10">
            <div class="text-center space-y-3 sm:space-y-4">
              <div class="flex justify-center mb-4">
                <img src="https://res.cloudinary.com/dawdatp8z/image/upload/v1771880764/c4c01b58-3d9e-4419-8d6a-a5bcb7b702d9-removebg-preview_zuearf.png" 
                     alt="Focus Fitness Logo" 
                     class="w-24 h-24 sm:w-32 sm:h-32 object-contain">
              </div>
              <h2 class="text-5xl sm:text-6xl lg:text-8xl font-bebas text-zinc-900 tracking-tighter uppercase italic leading-[0.8]">
                ERROR DE <br/>
                <span class="text-rose-500">RESTABLECIMIENTO</span>
              </h2>
              <p class="text-[8px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-[0.5em]">
                Token no proporcionado
              </p>
            </div>
            <div class="bg-white border-2 border-zinc-100 p-8 sm:p-12 rounded-[3rem] sm:rounded-[4rem] shadow-2xl shadow-zinc-200/50 space-y-6 sm:space-y-8">
              <div class="bg-rose-50 text-rose-500 p-4 sm:p-6 rounded-2xl sm:rounded-3xl text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-center border border-rose-100">
                No se proporcionó token de restablecimiento. Por favor, usa el enlace que recibiste en tu email.
              </div>
              <div class="text-center">
                <a href="/" class="w-full py-6 sm:py-8 bg-zinc-900 hover:bg-brand text-white font-black rounded-[1.8rem] sm:rounded-[2rem] text-[10px] sm:text-[12px] uppercase tracking-[0.4em] transition-all shadow-xl active:scale-95 inline-block">
                  IR AL INICIO
                </a>
              </div>
            </div>
          </div>
        </div>
      `);
    }

    console.log('✅ Token recibido, mostrando formulario de reset...');
    
    // Mostrar formulario de reset de contraseña
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Restablecer Contraseña - Focus Fitness</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  brand: '#667eea'
                },
                fontFamily: {
                  'bebas': ['Bebas Neue', 'cursive']
                }
              }
            }
          }
        </script>
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" rel="stylesheet">
      </head>
      <body class="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-white overflow-hidden relative">
        <!-- Background Decor -->
        <div class="absolute top-0 right-0 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-brand/5 rounded-full -mr-24 -mt-24 sm:-mr-48 sm:-mt-48 blur-3xl"></div>
        <div class="absolute bottom-0 left-0 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-brand/5 rounded-full -ml-24 -mb-24 sm:-ml-48 sm:-mb-48 blur-3xl"></div>

        <div class="w-full max-w-sm sm:max-w-md space-y-8 sm:space-y-12 relative z-10">
          <div class="text-center space-y-3 sm:space-y-4">
            <div class="flex justify-center mb-4">
              <div class="w-48 h-36 sm:w-56 sm:h-42 lg:w-64 lg:h-48 bg-zinc-900 rounded-2xl flex items-center justify-center p-3 overflow-hidden">
                <img src="https://res.cloudinary.com/dvf1wagvx/image/upload/v1773890396/Gemini_Generated_Image_3rtis53rtis53rti-Picsart-BackgroundRemover_fdvs9q.png" 
                     alt="Focus Fitness Logo" 
                     class="w-full h-full object-cover">
              </div>
            </div>
            <h2 class="text-5xl sm:text-6xl lg:text-8xl font-bebas text-zinc-900 tracking-tighter uppercase italic leading-[0.8]">
              RESTABLECER <br/>
              <span class="text-brand">CONTRASEÑA</span>
            </h2>
            <p class="text-[8px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-[0.5em]">
              Recupera tu acceso
            </p>
          </div>

          <div class="bg-white border-2 border-zinc-100 p-8 sm:p-12 rounded-[3rem] sm:rounded-[4rem] shadow-2xl shadow-zinc-200/50 space-y-6 sm:space-y-8">
            <div id="error-message" class="bg-rose-50 text-rose-500 p-4 sm:p-6 rounded-2xl sm:rounded-3xl text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-center border border-rose-100 hidden"></div>
            <div id="success-message" class="bg-green-50 text-green-500 p-4 sm:p-6 rounded-2xl sm:rounded-3xl text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-center border border-green-100 hidden"></div>
            
            <form id="resetForm" class="space-y-6 sm:space-y-8" onsubmit="return false;">
              <input type="hidden" name="token" value="${token}" />
              
              <div class="space-y-2 sm:space-y-3">
                <label class="text-[8px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-2">Nueva Contraseña</label>
                <input 
                  type="password" 
                  id="password" 
                  name="password" 
                  required 
                  minlength="6"
                  class="w-full bg-zinc-50 border border-zinc-100 rounded-[1.2rem] sm:rounded-[1.5rem] px-6 sm:px-8 py-4 sm:py-5 focus:border-brand focus:bg-white transition-all text-sm outline-none font-bold"
                  placeholder="••••••••"
                />
              </div>
              
              <div class="space-y-2 sm:space-y-3">
                <label class="text-[8px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-2">Confirmar Contraseña</label>
                <input 
                  type="password" 
                  id="confirmPassword" 
                  name="confirmPassword" 
                  required 
                  minlength="6"
                  class="w-full bg-zinc-50 border border-zinc-100 rounded-[1.2rem] sm:rounded-[1.5rem] px-6 sm:px-8 py-4 sm:py-5 focus:border-brand focus:bg-white transition-all text-sm outline-none font-bold"
                  placeholder="••••••••"
                />
              </div>
              
              <button type="submit" class="w-full py-6 sm:py-8 bg-zinc-900 hover:bg-brand text-white font-black rounded-[1.8rem] sm:rounded-[2rem] text-[10px] sm:text-[12px] uppercase tracking-[0.4em] transition-all shadow-xl active:scale-95">
                🔐 RESTABLECER CONTRASEÑA
              </button>
            </form>
            
            <div class="text-center">
              <a href="/" class="text-[7px] sm:text-[8px] font-black uppercase tracking-[0.3em] text-zinc-300 hover:text-brand transition-colors">
                ← VOLVER AL INICIO
              </a>
            </div>
          </div>
        </div>
        
        <script>
          document.getElementById('resetForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const password = formData.get('password');
            const confirmPassword = formData.get('confirmPassword');
            const token = formData.get('token');
            
            // Validar contraseñas
            if (password !== confirmPassword) {
              showError('Las contraseñas no coinciden');
              return;
            }
            
            if (password.length < 6) {
              showError('La contraseña debe tener al menos 6 caracteres');
              return;
            }
            
            try {
              const response = await fetch('/reset-password-process', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                  token: token,
                  password: password
                })
              });
              
              const result = await response.text();
              console.log('Respuesta del servidor:', result); // Debug
              
              if (result.includes('Contraseña Restablecida') || result.includes('restablecida exitosamente')) {
                showSuccess('¡Contraseña restablecida exitosamente! Redirigiendo...');
                setTimeout(() => {
                  window.location.href = '/';
                }, 2000);
              } else {
                showError('Error al restablecer la contraseña. El enlace puede haber expirado.');
              }
            } catch (error) {
              showError('Error de conexión. Por favor intenta nuevamente.');
            }
          });
          
          function showError(message) {
            const errorDiv = document.getElementById('error-message');
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            document.getElementById('success-message').style.display = 'none';
          }
          
          function showSuccess(message) {
            const successDiv = document.getElementById('success-message');
            successDiv.textContent = message;
            successDiv.style.display = 'block';
            document.getElementById('error-message').style.display = 'none';
          }
        </script>
      </body>
      </html>
    `);
  });

  // Password Reset Process (POST - procesa el reset real)
  app.post('/reset-password-process', async (req, res) => {
    const { token, password } = req.body;
    
    console.log('🔍 === RESET PASSWORD (POST) ===');
    console.log('Token recibido en body:', token);
    console.log('Password recibido:', !!password);
    console.log('Body completo:', req.body);
    
    if (!token || !password) {
      console.log('❌ Token o password no proporcionados');
      return res.send(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 100px auto; padding: 40px; text-align: center; border: 1px solid #e9ecef; border-radius: 10px;">
          <h1 style="color: #dc3545;">❌ Error de Restablecimiento</h1>
          <p style="color: #666; font-size: 16px;">No se proporcionó token o contraseña.</p>
          <a href="/" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Ir al Inicio</a>
        </div>
      `);
    }

    try {
      console.log('🔍 Buscando usuario con token de reset...');
      const user = db.prepare('SELECT * FROM profiles WHERE password_reset_token = ? AND password_reset_expires > ?').get(token, new Date().toISOString());
      
      console.log('Usuario encontrado:', !!user);
      if (user) {
        console.log('Email usuario:', user.email);
        console.log('Token expira:', user.password_reset_expires);
        console.log('Fecha actual:', new Date().toISOString());
      }
      
      if (!user) {
        console.log('❌ Token de reset inválido o expirado');
        return res.send(`
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 100px auto; padding: 40px; text-align: center; border: 1px solid #e9ecef; border-radius: 10px;">
            <h1 style="color: #dc3545;">❌ Token Inválido</h1>
            <p style="color: #666; font-size: 16px;">El token de restablecimiento es inválido o ha expirado.</p>
            <p style="color: #666; font-size: 14px; margin-top: 10px;">Por favor solicita un nuevo restablecimiento de contraseña.</p>
            <a href="/" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Ir al Inicio</a>
          </div>
        `);
      }

      // Hashear nueva contraseña
      console.log('🔐 Hasheando nueva contraseña...');
      const { default: bcrypt } = await import('bcrypt');
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);

      // Actualizar contraseña y limpiar token
      console.log('✅ Actualizando contraseña...');
      db.prepare('UPDATE profiles SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?')
        .run(hash, user.id);

      console.log('✅ Contraseña restablecida exitosamente para:', user.email);

      // Mostrar página de éxito
      res.send(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 100px auto; padding: 40px; text-align: center; border: 1px solid #e9ecef; border-radius: 10px;">
          <div style="width: 80px; height: 80px; background: #28a745; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 40px;">✓</span>
          </div>
          <h1 style="color: #28a745; margin-bottom: 10px;">¡Contraseña Restablecida!</h1>
          <p style="color: #666; font-size: 16px; margin-bottom: 30px;">Tu contraseña ha sido actualizada exitosamente.</p>
          <p style="color: #666; font-size: 16px; margin-bottom: 30px;">Ahora puedes iniciar sesión con tu nueva contraseña.</p>
          <a href="/" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Iniciar Sesión</a>
        </div>
      `);
      
    } catch (error) {
      console.error('❌ Error en reset password POST:', error);
      res.send(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 100px auto; padding: 40px; text-align: center; border: 1px solid #e9ecef; border-radius: 10px;">
          <h1 style="color: #dc3545;">❌ Error</h1>
          <p style="color: #666; font-size: 16px;">Ocurrió un error al restablecer tu contraseña.</p>
          <a href="/" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Ir al Inicio</a>
        </div>
      `);
    }
  });

  app.post('/verify-email', (req, res) => {
    const { token } = req.body;
    
    console.log('🔍 === VERIFICACIÓN EMAIL (POST) ===');
    console.log('Token recibido en body:', token);
    console.log('Body completo:', req.body);
    
    if (!token) {
      console.log('❌ Token no proporcionado en body');
      return res.send(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 100px auto; padding: 40px; text-align: center; border: 1px solid #e9ecef; border-radius: 10px;">
          <h1 style="color: #dc3545;">❌ Error de Verificación</h1>
          <p style="color: #666; font-size: 16px;">No se proporcionó token de verificación.</p>
          <p style="color: #666; font-size: 14px; margin-top: 20px;">Por favor, usa el botón de verificación en el email que recibiste.</p>
          <a href="/" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Ir al Inicio</a>
        </div>
      `);
    }

    try {
      console.log('🔍 Buscando usuario con token...');
      const user = db.prepare('SELECT * FROM profiles WHERE email_verification_token = ? AND email_verification_expires > ?').get(token, new Date().toISOString());
      
      console.log('Usuario encontrado:', !!user);
      if (user) {
        console.log('Email usuario:', user.email);
        console.log('Token expira:', user.email_verification_expires);
        console.log('Fecha actual:', new Date().toISOString());
      }
      
      if (!user) {
        console.log('❌ Token inválido o expirado');
        return res.send(`
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 100px auto; padding: 40px; text-align: center; border: 1px solid #e9ecef; border-radius: 10px;">
            <h1 style="color: #dc3545;">❌ Token Inválido</h1>
            <p style="color: #666; font-size: 16px;">El token de verificación es inválido o ha expirado.</p>
            <a href="/" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Ir al Inicio</a>
          </div>
        `);
      }

      // Marcar email como verificado
      console.log('✅ Marcando email como verificado...');
      db.prepare('UPDATE profiles SET email_verified = TRUE, email_verification_token = NULL, email_verification_expires = NULL WHERE id = ?')
        .run(user.id);

      console.log('✅ Email verificado exitosamente para:', user.email);

      // Mostrar página de éxito
      res.send(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 100px auto; padding: 40px; text-align: center; border: 1px solid #e9ecef; border-radius: 10px;">
          <div style="width: 80px; height: 80px; background: #28a745; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 40px;">✓</span>
          </div>
          <h1 style="color: #28a745; margin-bottom: 10px;">¡Correo Verificado!</h1>
          <p style="color: #666; font-size: 16px; margin-bottom: 30px;">Tu correo <strong>${user.email}</strong> ha sido verificado exitosamente.</p>
          <p style="color: #666; font-size: 16px; margin-bottom: 30px;">Ahora puedes iniciar sesión en tu cuenta.</p>
          <a href="/" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Iniciar Sesión</a>
        </div>
      `);
      
    } catch (error) {
      console.error('❌ Error en verificación POST:', error);
      res.send(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 100px auto; padding: 40px; text-align: center; border: 1px solid #e9ecef; border-radius: 10px;">
          <h1 style="color: #dc3545;">❌ Error</h1>
          <p style="color: #666; font-size: 16px;">Ocurrió un error al verificar tu correo.</p>
          <a href="/" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Ir al Inicio</a>
        </div>
      `);
    }
  });

  // Save Email Configuration
  app.post('/api/save-email-config', async (req, res) => {
    const { config } = req.body;
    
    console.log('💾 === GUARDANDO CONFIGURACIÓN EMAIL ===');
    console.log('Config:', JSON.stringify(config, null, 2));
    
    try {
      // Usar import dinámico para fs en ES modules
      const { default: fs } = await import('fs');
      emailConfig = config;
      fs.writeFileSync('./email-config.json', JSON.stringify(config, null, 2));
      console.log('✅ Email configuration saved to file');
      res.json({ success: true, message: 'Configuración guardada exitosamente' });
    } catch (error: any) {
      console.error('❌ Error saving email config:', error);
      res.status(500).json({ error: 'Error al guardar configuración' });
    }
  });

  // Get Email Configuration
  app.get('/api/email-config', (req, res) => {
    try {
      res.json(emailConfig || { provider: 'console' });
    } catch (error: any) {
      res.status(500).json({ error: 'Error al obtener configuración' });
    }
  });

  // Test Email Configuration
  app.post('/api/test-email', async (req, res) => {
    console.log('🚨🚨🚨 LLEGÓ PETICIÓN A /api/test-email 🚨🚨🚨');
    
    const { email, config } = req.body;
    
    console.log('🔧 === INICIANDO PRUEBA DE EMAIL ===');
    console.log('Email destino:', email);
    console.log('Configuración:', JSON.stringify(config, null, 2));
    
    try {
      // Usar el import estático en lugar del dinámico
      const service = new EmailService();
      
      // Si es configuración SMTP, establecerla
      if (config.provider === 'smtp' && config.smtp) {
        console.log('🔧 Configurando SMTP para prueba...');
        console.log('SMTP Config:', {
          host: config.smtp.host,
          port: config.smtp.port,
          secure: config.smtp.secure,
          user: config.smtp.user,
          hasPassword: !!config.smtp.pass
        });
        service.setSMTPConfig(config.smtp);
      } else {
        console.log('⚠️  Usando modo simulado (sin SMTP)');
      }
      
      const testContent = {
        to: email,
        subject: '✅ Email de Prueba - Focus Fitness',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #00d4ff, #090979); color: white; padding: 30px; border-radius: 10px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px;">✅ CONFIGURACIÓN EXITOSA</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">El sistema de emails está funcionando correctamente</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
              <h2 style="color: #333; margin-top: 0;">Detalles de la Configuración:</h2>
              <ul style="color: #666; line-height: 1.6;">
                <li><strong>Proveedor:</strong> ${config.provider}</li>
                <li><strong>Fecha de prueba:</strong> ${new Date().toLocaleString('es-ES')}</li>
                <li><strong>Sistema:</strong> Focus Fitness Reservation System</li>
                ${config.smtp ? `<li><strong>Servidor SMTP:</strong> ${config.smtp.host}:${config.smtp.port}</li>` : ''}
              </ul>
            </div>
            
            <div style="text-align: center; padding: 20px; background: #e3f2fd; border-radius: 10px;">
              <p style="color: #1976d2; margin: 0; font-weight: bold;">
                🎉 ¡Tu configuración de email está lista para usar!
              </p>
            </div>
          </div>
        `
      };
      
      console.log('📧 Enviando email...');
      const success = await service.sendEmail(testContent);
      console.log('📧 Resultado del envío:', success);
      
      if (success) {
        console.log('✅ === PRUEBA DE EMAIL EXITOSA ===');
        res.json({ success: true });
      } else {
        console.log('❌ === PRUEBA DE EMAIL FALLÓ ===');
        res.json({ success: false, error: 'Failed to send test email - check server logs for details' });
      }
    } catch (error: any) {
      console.error('❌ === ERROR EN PRUEBA DE EMAIL ===');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Error details:', error);
      console.error('=====================================');
      res.json({ success: false, error: error.message });
    }
  });

  // Password Reset Endpoints
  app.post('/api/forgot-password', async (req, res) => {
    console.log('🚨🚨🚨 LLEGÓ PETICIÓN FORGOT-PASSWORD 🚨🚨🚨');
    console.log('Body completo:', req.body);
    
    const { email } = req.body;
    
    console.log('🔧 === PROCESANDO OLVIDÉ CONTRASEÑA ===');
    console.log('Email solicitado:', email);
    
    try {
      const user = db.prepare('SELECT * FROM profiles WHERE email = ?').get(email);
      if (!user) {
        console.log('⚠️  Email no encontrado en la base de datos');
        // Don't reveal if user exists or not for security
        return res.json({ success: true, message: 'Si el correo existe, recibirás instrucciones' });
      }

      console.log('✅ Usuario encontrado:', user.email);

      // Generate reset token
      const token = Math.random().toString(36).substr(2, 32);
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      db.prepare('UPDATE profiles SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?')
        .run(token, expires.toISOString(), user.id);

      // Usar la instancia global de emailService que ya tiene la configuración
      console.log('📧 EmailConfig actual:', emailConfig);
      
      if (emailConfig && emailConfig.provider === 'smtp' && emailConfig.smtp) {
        console.log('📧 Configurando SMTP en emailService global...');
        emailService.setSMTPConfig(emailConfig.smtp);
      }

      // Send reset email
      console.log('📧 Enviando email de restablecimiento...');
      const emailSent = await emailService.sendPasswordResetEmail(email, token);
      console.log('📧 Resultado de sendPasswordResetEmail:', emailSent);
      
      if (emailSent) {
        console.log('✅ Email de restablecimiento enviado exitosamente');
        res.json({ success: true, message: 'Instrucciones enviadas a tu correo' });
      } else {
        console.log('❌ Error al enviar email de restablecimiento');
        res.json({ success: false, error: 'No se pudo enviar el email de restablecimiento' });
      }
    } catch (error: any) {
      console.error('❌ === ERROR EN FORGOT-PASSWORD ===');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Error details:', error);
      console.error('=====================================');
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/reset-password', (req, res) => {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token y nueva contraseña requeridos' });
    }

    try {
      const user = db.prepare('SELECT * FROM profiles WHERE password_reset_token = ? AND password_reset_expires > datetime("now")').get(token);
      
      if (!user) {
        return res.status(400).json({ error: 'Token inválido o expirado' });
      }

      // Hash new password
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(newPassword, salt);

      // Update password and clear reset token
      db.prepare('UPDATE profiles SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?')
        .run(hash, user.id);

      res.json({ success: true, message: 'Contraseña actualizada exitosamente' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin Password Change Endpoint
  app.put('/api/admin/change-password/:id', (req, res) => {
    const { newPassword } = req.body;
    const userId = req.params.id;
    
    if (!newPassword) {
      return res.status(400).json({ error: 'Nueva contraseña requerida' });
    }

    try {
      const user = db.prepare('SELECT * FROM profiles WHERE id = ?').get(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Hash new password
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(newPassword, salt);

      // Update password
      db.prepare('UPDATE profiles SET password_hash = ? WHERE id = ?')
        .run(hash, userId);

      res.json({ success: true, message: 'Contraseña actualizada exitosamente' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Server running on http://localhost:${PORT}`);

    // Vite middleware for development
    if (process.env.NODE_ENV !== 'production') {
      console.log('Initializing Vite middleware...');
      const { createServer } = await import('vite');
      const vite = await createServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('Vite middleware initialized');
      app.get('*', (req, res) => {
        if (req.path.startsWith('/api/')) {
          return res.status(404).json({ error: 'API route not found' });
        }
        return res.sendFile(path.join(__dirname, 'index.html'));
      });
    } else {
      app.use(express.static(path.join(__dirname, 'dist')));
      app.get('*', (req, res) => {
        if (req.path.startsWith('/api/')) {
          return res.status(404).json({ error: 'API route not found' });
        }
        return res.sendFile(path.join(__dirname, 'dist', 'index.html'));
      });
    }
  });
} catch (error) {
  console.error('CRITICAL SERVER ERROR:', error);
}
}

startServer();
