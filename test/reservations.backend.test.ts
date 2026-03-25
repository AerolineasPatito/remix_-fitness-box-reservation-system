// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import Database from 'better-sqlite3';
import path from 'node:path';

const BASE_URL = 'http://localhost:3000';
const DB_PATH = 'fitness_v4.db';
let serverProcess: ChildProcess | null = null;
let startedByTest = false;
let serverReady = false;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isServerAlive = async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/availability`);
    return res.ok;
  } catch {
    return false;
  }
};

const waitForServer = async (timeoutMs = 25000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isServerAlive()) return true;
    await sleep(500);
  }
  return false;
};

beforeAll(async () => {
  if (await isServerAlive()) {
    serverReady = true;
    return;
  }

  const nodeBin = process.execPath;
  const tsxCli = path.resolve(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
  serverProcess = spawn(nodeBin, [tsxCli, 'server.ts'], {
    cwd: process.cwd(),
    stdio: 'ignore'
  });
  startedByTest = true;

  serverReady = await waitForServer();
}, 30000);

afterAll(() => {
  if (startedByTest && serverProcess && !serverProcess.killed) {
    serverProcess.kill('SIGTERM');
  }
});

describe('POST /api/reservations', () => {
  it('crea la reserva y descuenta 1 crédito del alumno', async () => {
    if (!serverReady) return;
    const db = new Database(DB_PATH);
    const suffix = Date.now().toString(36);
    const userId = `test_student_${suffix}`;
    const classId = `test_class_${suffix}`;
    const packageId = `test_pkg_${suffix}`;
    const subscriptionId = `test_sub_${suffix}`;
    const beneficiaryId = `test_ben_${suffix}`;
    const classTypeId = `test_ctype_${suffix}`;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const classDate = tomorrow.toISOString().split('T')[0];

    try {
      db.prepare(`
        INSERT INTO profiles (id, email, full_name, password_hash, role, credits_remaining, total_attended, email_verified, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'student', 3, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(userId, `${userId}@test.local`, 'Test Student', 'hash');

      db.prepare(`
        INSERT INTO paquetes (id, nombre, capacidad, numero_clases, vigencia_semanas, precio_base, estado, created_at, updated_at)
        VALUES (?, 'PKG TEST', 1, 10, 8, 1000, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(packageId);

      db.prepare(`
        INSERT INTO class_types (id, name, image_url, icon, color_theme, is_active, created_at, updated_at)
        VALUES (?, ?, NULL, 'fa-bolt', 'amber', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(classTypeId, `Tipo Test ${suffix}`);

      db.prepare(`
        INSERT INTO suscripciones_alumno (
          id, alumno_id, paquete_id, fecha_compra, fecha_vencimiento,
          clases_totales, clases_restantes, clases_consumidas, estado, congelado, dias_congelados, created_at, updated_at
        )
        VALUES (
          ?, ?, ?, datetime('now', '-1 day'), datetime('now', '+30 day'),
          10, 3, 7, 'active', 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `).run(subscriptionId, userId, packageId);

      db.prepare(`
        INSERT INTO suscripcion_beneficiarios (
          id, suscripcion_id, alumno_id, es_titular, clases_asignadas, clases_restantes, estado, created_at, updated_at
        )
        VALUES (?, ?, ?, 1, 10, 3, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(beneficiaryId, subscriptionId, userId);

      db.prepare(`
        INSERT INTO classes (id, type, class_type_id, date, start_time, end_time, capacity, status, created_by, created_at, updated_at)
        VALUES (?, 'Entrenamiento Funcional', ?, ?, '07:00', '08:00', 10, 'active', 'coach_test', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(classId, classTypeId, classDate);

      const beforeBeneficiary = db.prepare('SELECT clases_restantes FROM suscripcion_beneficiarios WHERE id = ?').get(beneficiaryId) as { clases_restantes: number };
      expect(beforeBeneficiary.clases_restantes).toBe(3);

      db.close();

      const response = await fetch(`${BASE_URL}/api/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, classId })
      });

      const payload = await response.json();
      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);

      const verifyDb = new Database(DB_PATH);
      const afterBeneficiary = verifyDb.prepare('SELECT clases_restantes FROM suscripcion_beneficiarios WHERE id = ?').get(beneficiaryId) as { clases_restantes: number };
      expect(afterBeneficiary.clases_restantes).toBe(2);

      const createdReservationId = verifyDb
        .prepare('SELECT id FROM reservations WHERE user_id = ? AND class_id = ?')
        .pluck()
        .get(userId, classId) as string | undefined;
      expect(createdReservationId).toBeTruthy();

      verifyDb.prepare('DELETE FROM reservations WHERE user_id = ? AND class_id = ?').run(userId, classId);
      verifyDb.prepare('DELETE FROM suscripcion_beneficiarios WHERE id = ?').run(beneficiaryId);
      verifyDb.prepare('DELETE FROM suscripciones_alumno WHERE id = ?').run(subscriptionId);
      verifyDb.prepare('DELETE FROM paquetes WHERE id = ?').run(packageId);
      verifyDb.prepare('DELETE FROM classes WHERE id = ?').run(classId);
      verifyDb.prepare('DELETE FROM class_types WHERE id = ?').run(classTypeId);
      verifyDb.prepare('DELETE FROM profiles WHERE id = ?').run(userId);
      verifyDb.close();
    } finally {
      if (db.open) {
        db.prepare('DELETE FROM reservations WHERE user_id = ? AND class_id = ?').run(userId, classId);
        db.prepare('DELETE FROM suscripcion_beneficiarios WHERE id = ?').run(beneficiaryId);
        db.prepare('DELETE FROM suscripciones_alumno WHERE id = ?').run(subscriptionId);
        db.prepare('DELETE FROM paquetes WHERE id = ?').run(packageId);
        db.prepare('DELETE FROM classes WHERE id = ?').run(classId);
        db.prepare('DELETE FROM class_types WHERE id = ?').run(classTypeId);
        db.prepare('DELETE FROM profiles WHERE id = ?').run(userId);
        db.close();
      }
    }
  }, 15000);
});
