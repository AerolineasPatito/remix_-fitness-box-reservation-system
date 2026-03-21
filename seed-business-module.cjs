const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const db = new Database('fitness_v4.db');
db.pragma('foreign_keys = ON');
const PRESERVED_EMAIL = 'cabreu145@gmail.com';

const now = new Date();
const today = now.toISOString().slice(0, 10);

const id = (prefix) => `${prefix}${Math.random().toString(36).slice(2, 11)}`;
const hash = bcrypt.hashSync('Focus123!', 10);

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};
const toIso = (date) => date.toISOString();
const toDate = (date) => date.toISOString().slice(0, 10);
const toTime = (date) => date.toISOString().slice(11, 19);
const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 7, 0, 0, 0);

const packageSeeds = [
  { nombre: 'FOCUS START', capacidad: 1, numero_clases: 8, vigencia_semanas: 4, precio_base: 1299, detalles: 'Plan inicial.' },
  { nombre: 'FOCUS BASE', capacidad: 1, numero_clases: 20, vigencia_semanas: 6, precio_base: 2499, detalles: 'Plan base.' },
  { nombre: 'FOCUS WORK', capacidad: 1, numero_clases: 30, vigencia_semanas: 8, precio_base: 3499, detalles: 'Plan individual de alto enfoque.' },
  { nombre: 'FOCUS DUO', capacidad: 2, numero_clases: 46, vigencia_semanas: 8, precio_base: 5299, detalles: 'Plan compartido para 2.' },
  { nombre: 'FOCUS CREW', capacidad: 3, numero_clases: 60, vigencia_semanas: 10, precio_base: 6799, detalles: 'Plan compartido para 3.' }
];

const studentsSeed = [
  { key: 'A', full_name: 'Alumno A Activo', email: 'demo.alumno.a@focusfitness.mx' },
  { key: 'B', full_name: 'Alumno B Warning', email: 'demo.alumno.b@focusfitness.mx' },
  { key: 'C', full_name: 'Alumno C Titular DUO', email: 'demo.alumno.c@focusfitness.mx' },
  { key: 'D', full_name: 'Alumno D Beneficiario DUO', email: 'demo.alumno.d@focusfitness.mx' },
  { key: 'E', full_name: 'Alumno E Congelado', email: 'demo.alumno.e@focusfitness.mx' },
  { key: 'F', full_name: 'Alumno F Vencido', email: 'demo.alumno.f@focusfitness.mx' },
  { key: 'G', full_name: 'Alumno G Titular CREW', email: 'demo.alumno.g@focusfitness.mx' },
  { key: 'H', full_name: 'Alumno H Beneficiario CREW', email: 'demo.alumno.h@focusfitness.mx' },
  { key: 'I', full_name: 'Alumno I Beneficiario CREW', email: 'demo.alumno.i@focusfitness.mx' },
  { key: 'J', full_name: 'Alumno J Activo', email: 'demo.alumno.j@focusfitness.mx' },
  { key: 'K', full_name: 'Alumno K Activo', email: 'demo.alumno.k@focusfitness.mx' },
  { key: 'L', full_name: 'Alumno L Por Vencer', email: 'demo.alumno.l@focusfitness.mx' },
  { key: 'M', full_name: 'Alumno M Vencido', email: 'demo.alumno.m@focusfitness.mx' },
  { key: 'N', full_name: 'Alumno N Nuevo', email: 'demo.alumno.n@focusfitness.mx' },
  { key: 'O', full_name: 'Alumno O Nuevo', email: 'demo.alumno.o@focusfitness.mx' }
];

const run = db.transaction(() => {
  db.prepare('DELETE FROM registros_asistencia').run();
  db.prepare('DELETE FROM reservations').run();
  db.prepare('DELETE FROM ajustes_credito').run();
  db.prepare('DELETE FROM transacciones_pago').run();
  db.prepare('DELETE FROM suscripcion_beneficiarios').run();
  db.prepare('DELETE FROM suscripciones_alumno').run();
  db.prepare('DELETE FROM classes').run();
  db.prepare('DELETE FROM paquetes').run();
  db.prepare("DELETE FROM profiles WHERE COALESCE(email, '') <> ?").run(PRESERVED_EMAIL);

  const packageIds = {};
  const packageMetaByName = {};
  const insertPackage = db.prepare(`
    INSERT INTO paquetes (id, nombre, capacidad, numero_clases, vigencia_semanas, detalles, precio_base, estado, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  for (const pkg of packageSeeds) {
    const packageId = id('pkg_demo_');
    packageIds[pkg.nombre] = packageId;
    packageMetaByName[pkg.nombre] = pkg;
    insertPackage.run(packageId, pkg.nombre, pkg.capacidad, pkg.numero_clases, pkg.vigencia_semanas, pkg.detalles, pkg.precio_base);
  }

  const students = {};
  const insertStudent = db.prepare(`
    INSERT INTO profiles (id, email, full_name, password_hash, role, credits_remaining, total_attended, email_verified, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'student', 0, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  for (const student of studentsSeed) {
    const studentId = id('student_demo_');
    students[student.key] = studentId;
    insertStudent.run(studentId, student.email, student.full_name, hash);
  }

  const classTemplates = [
    { type: 'Entrenamiento Funcional', weekday: 1, start: '07:00:00', end: '08:00:00', capacity: 14 },
    { type: 'Sculpt and Strength', weekday: 2, start: '18:00:00', end: '19:00:00', capacity: 12 },
    { type: 'HIIT Conditioning', weekday: 3, start: '07:00:00', end: '08:00:00', capacity: 12 },
    { type: 'Sculpt Lower Body', weekday: 4, start: '18:00:00', end: '19:00:00', capacity: 12 },
    { type: 'Full Body', weekday: 5, start: '08:00:00', end: '09:00:00', capacity: 14 }
  ];

  const insertClass = db.prepare(`
    INSERT INTO classes (id, type, date, start_time, end_time, capacity, status, created_by, real_time_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'active', 'admin-1', 'scheduled', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  const classesByDate = new Map();
  const classIds = [];
  const fromDate = addDays(now, -180);
  const toDateFuture = addDays(now, 7);
  for (let d = startOfDay(fromDate); d <= toDateFuture; d = addDays(d, 1)) {
    const dayOfWeek = d.getDay();
    const template = classTemplates.find((item) => item.weekday === dayOfWeek);
    if (!template) continue;
    const classId = id('cls_demo_');
    const dateStr = toDate(d);
    insertClass.run(classId, template.type, dateStr, template.start, template.end, template.capacity);
    classIds.push(classId);
    if (!classesByDate.has(dateStr)) classesByDate.set(dateStr, []);
    classesByDate.get(dateStr).push({
      id: classId,
      type: template.type,
      date: dateStr,
      start_time: template.start,
      end_time: template.end
    });
  }

  const insertSubscription = db.prepare(`
    INSERT INTO suscripciones_alumno (
      id, alumno_id, paquete_id, fecha_compra, fecha_vencimiento, clases_totales, clases_restantes, clases_consumidas,
      estado, congelado, freeze_iniciado_en, dias_congelados, notas, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  const insertBeneficiary = db.prepare(`
    INSERT INTO suscripcion_beneficiarios (
      id, suscripcion_id, alumno_id, es_titular, clases_asignadas, clases_restantes, estado, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  const insertPayment = db.prepare(`
    INSERT INTO transacciones_pago (
      id, suscripcion_id, alumno_id, paquete_id, monto, moneda, metodo_pago, referencia, fecha_pago, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'MXN', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  const subscriptions = [];
  const addSubscription = ({
    key,
    packageName,
    purchaseDaysAgo,
    expiryOverrideDaysFromNow = null,
    status = 'active',
    freeze = false,
    freezeDaysAgo = 0,
    method = 'transferencia',
    amount = null,
    beneficiaries,
    notes
  }) => {
    const pkg = packageMetaByName[packageName];
    const purchase = addDays(now, -purchaseDaysAgo);
    const expiry = expiryOverrideDaysFromNow == null
      ? addDays(purchase, Number(pkg.vigencia_semanas) * 7)
      : addDays(now, expiryOverrideDaysFromNow);
    const total = Number(pkg.numero_clases);
    const totalRemaining = beneficiaries.reduce((acc, b) => acc + Number(b.remaining), 0);
    const consumed = Math.max(0, total - totalRemaining);
    const subId = id('sub_demo_');

    insertSubscription.run(
      subId,
      students[key],
      packageIds[packageName],
      toIso(purchase),
      toIso(expiry),
      total,
      totalRemaining,
      consumed,
      status,
      freeze ? 1 : 0,
      freeze ? toIso(addDays(now, -freezeDaysAgo)) : null,
      freeze ? freezeDaysAgo : 0,
      notes || `DEMO_${key}_${packageName}`
    );

    beneficiaries.forEach((b) => {
      insertBeneficiary.run(
        id('ben_demo_'),
        subId,
        students[b.key],
        b.titular ? 1 : 0,
        b.assigned,
        b.remaining,
        b.remaining > 0 ? 'active' : (status === 'expired' ? 'expired' : 'depleted')
      );
    });

    insertPayment.run(
      id('pay_demo_'),
      subId,
      students[key],
      packageIds[packageName],
      amount == null ? Number(pkg.precio_base) : amount,
      method,
      `PAY_${key}_${packageName}`,
      toIso(purchase)
    );

    subscriptions.push({
      id: subId,
      key,
      packageName,
      beneficiaries
    });
    return subId;
  };

  addSubscription({
    key: 'A',
    packageName: 'FOCUS WORK',
    purchaseDaysAgo: 12,
    method: 'tarjeta',
    beneficiaries: [{ key: 'A', titular: true, assigned: 30, remaining: 24 }],
    notes: 'ALUMNO_A_SANO'
  });
  addSubscription({
    key: 'B',
    packageName: 'FOCUS START',
    purchaseDaysAgo: 18,
    expiryOverrideDaysFromNow: 3,
    method: 'efectivo',
    beneficiaries: [{ key: 'B', titular: true, assigned: 8, remaining: 2 }],
    notes: 'ALUMNO_B_WARNING'
  });
  const duoSub = addSubscription({
    key: 'C',
    packageName: 'FOCUS DUO',
    purchaseDaysAgo: 22,
    method: 'transferencia',
    beneficiaries: [
      { key: 'C', titular: true, assigned: 23, remaining: 8 },
      { key: 'D', titular: false, assigned: 23, remaining: 0 }
    ],
    notes: 'GRUPO_DUO_1'
  });
  addSubscription({
    key: 'E',
    packageName: 'FOCUS BASE',
    purchaseDaysAgo: 35,
    method: 'efectivo',
    freeze: true,
    freezeDaysAgo: 10,
    beneficiaries: [{ key: 'E', titular: true, assigned: 20, remaining: 12 }],
    notes: 'ALUMNO_E_FREEZE'
  });
  addSubscription({
    key: 'F',
    packageName: 'FOCUS BASE',
    purchaseDaysAgo: 165,
    status: 'expired',
    method: 'tarjeta',
    beneficiaries: [{ key: 'F', titular: true, assigned: 20, remaining: 0 }],
    notes: 'ALUMNO_F_VENCIDO'
  });
  addSubscription({
    key: 'G',
    packageName: 'FOCUS CREW',
    purchaseDaysAgo: 28,
    method: 'transferencia',
    beneficiaries: [
      { key: 'G', titular: true, assigned: 20, remaining: 12 },
      { key: 'H', titular: false, assigned: 20, remaining: 7 },
      { key: 'I', titular: false, assigned: 20, remaining: 2 }
    ],
    notes: 'GRUPO_CREW_1'
  });
  addSubscription({
    key: 'J',
    packageName: 'FOCUS BASE',
    purchaseDaysAgo: 8,
    method: 'tarjeta',
    beneficiaries: [{ key: 'J', titular: true, assigned: 20, remaining: 18 }],
    notes: 'ALUMNO_J_OK'
  });
  addSubscription({
    key: 'K',
    packageName: 'FOCUS WORK',
    purchaseDaysAgo: 40,
    method: 'efectivo',
    beneficiaries: [{ key: 'K', titular: true, assigned: 30, remaining: 14 }],
    notes: 'ALUMNO_K_OK'
  });
  addSubscription({
    key: 'L',
    packageName: 'FOCUS WORK',
    purchaseDaysAgo: 53,
    expiryOverrideDaysFromNow: 2,
    method: 'transferencia',
    beneficiaries: [{ key: 'L', titular: true, assigned: 30, remaining: 11 }],
    notes: 'ALUMNO_L_WARNING_VIGENCIA'
  });
  addSubscription({
    key: 'M',
    packageName: 'FOCUS START',
    purchaseDaysAgo: 90,
    status: 'expired',
    method: 'efectivo',
    beneficiaries: [{ key: 'M', titular: true, assigned: 8, remaining: 0 }],
    notes: 'ALUMNO_M_VENCIDO'
  });
  addSubscription({
    key: 'N',
    packageName: 'FOCUS START',
    purchaseDaysAgo: 5,
    method: 'tarjeta',
    beneficiaries: [{ key: 'N', titular: true, assigned: 8, remaining: 7 }],
    notes: 'ALUMNO_N_NUEVO'
  });
  addSubscription({
    key: 'O',
    packageName: 'FOCUS BASE',
    purchaseDaysAgo: 16,
    method: 'transferencia',
    beneficiaries: [{ key: 'O', titular: true, assigned: 20, remaining: 16 }],
    notes: 'ALUMNO_O_NUEVO'
  });
  addSubscription({
    key: 'A',
    packageName: 'FOCUS START',
    purchaseDaysAgo: 135,
    status: 'expired',
    method: 'efectivo',
    beneficiaries: [{ key: 'A', titular: true, assigned: 8, remaining: 0 }],
    notes: 'VENTA_HISTORICA_NOV'
  });

  const beneficiariesRows = db.prepare(`
    SELECT sb.id, sb.suscripcion_id, sb.alumno_id, sb.clases_asignadas, sb.clases_restantes, p.email
    FROM suscripcion_beneficiarios sb
    JOIN profiles p ON p.id = sb.alumno_id
    WHERE sb.deleted_at IS NULL
  `).all();

  const pastClasses = db.prepare(`
    SELECT id, date, start_time, type
    FROM classes
    WHERE date < ?
    ORDER BY date ASC, start_time ASC
  `).all(today);

  const insertReservation = db.prepare(`
    INSERT INTO reservations (id, user_id, class_id, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertAttendance = db.prepare(`
    INSERT INTO registros_asistencia (
      id, alumno_id, clase_id, suscripcion_id, estado, asistio_en, registrado_por, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'admin-1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  const usedByStudentDate = new Set();
  const attendedByStudent = {};
  let classCursor = 0;
  for (const row of beneficiariesRows) {
    const assigned = Number(row.clases_asignadas || 0);
    const remaining = Number(row.clases_restantes || 0);
    const consumed = Math.max(0, assigned - remaining);
    const studentId = row.alumno_id;
    attendedByStudent[studentId] = attendedByStudent[studentId] || 0;

    for (let i = 0; i < consumed; i += 1) {
      let selectedClass = null;
      let attempts = 0;
      while (!selectedClass && attempts < pastClasses.length) {
        const candidate = pastClasses[classCursor % pastClasses.length];
        classCursor += 3;
        attempts += 1;
        const key = `${studentId}_${candidate.date}`;
        if (usedByStudentDate.has(key)) continue;
        usedByStudentDate.add(key);
        selectedClass = candidate;
      }
      if (!selectedClass) break;

      const eventStatus = i % 5 === 0 ? 'no_show' : 'attended';
      const eventDateTime = `${selectedClass.date}T${selectedClass.start_time}`;

      insertReservation.run(
        id('res_demo_'),
        studentId,
        selectedClass.id,
        eventStatus,
        eventDateTime,
        eventDateTime
      );
      insertAttendance.run(
        id('att_demo_'),
        studentId,
        selectedClass.id,
        row.suscripcion_id,
        eventStatus,
        eventDateTime
      );
      if (eventStatus === 'attended') {
        attendedByStudent[studentId] += 1;
      }
    }
  }

  const futureClasses = db.prepare(`
    SELECT id, date
    FROM classes
    WHERE date >= ?
    ORDER BY date ASC, start_time ASC
    LIMIT 30
  `).all(today);

  const futureReservationTargets = ['A', 'B', 'C', 'D', 'G', 'H', 'J', 'L', 'N'];
  let futureCursor = 0;
  for (const key of futureReservationTargets) {
    const studentId = students[key];
    const cls = futureClasses[futureCursor % futureClasses.length];
    futureCursor += 2;
    if (!cls) continue;
    insertReservation.run(
      id('res_demo_'),
      studentId,
      cls.id,
      'active',
      `${cls.date}T06:00:00`,
      `${cls.date}T06:00:00`
    );
  }

  const insertAdjustment = db.prepare(`
    INSERT INTO ajustes_credito (
      id, alumno_id, suscripcion_id, actor_id, ajuste, motivo, clases_restantes_antes, clases_restantes_despues, created_at, updated_at
    ) VALUES (?, ?, ?, 'admin-1', ?, ?, ?, ?, ?, ?)
  `);

  const studentD = students.D;
  insertAdjustment.run(
    id('adj_demo_'),
    studentD,
    duoSub,
    0,
    'Intento de sobregiro bloqueado: clase 24 no permitida para beneficiario DUO.',
    0,
    0,
    toIso(addDays(now, -1)),
    toIso(addDays(now, -1))
  );

  const studentB = students.B;
  insertAdjustment.run(
    id('adj_demo_'),
    studentB,
    null,
    1,
    'Credito manual por compensacion de servicio.',
    2,
    3,
    toIso(addDays(now, -4)),
    toIso(addDays(now, -4))
  );

  const updateTotals = db.prepare(`
    UPDATE profiles
    SET total_attended = ?,
        credits_remaining = (
          SELECT COALESCE(SUM(sb.clases_restantes), 0)
          FROM suscripcion_beneficiarios sb
          JOIN suscripciones_alumno s ON s.id = sb.suscripcion_id
          WHERE sb.alumno_id = profiles.id
            AND sb.deleted_at IS NULL
            AND sb.estado = 'active'
            AND s.deleted_at IS NULL
            AND s.estado = 'active'
            AND s.congelado = 0
            AND datetime(s.fecha_vencimiento) >= datetime('now')
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  for (const studentId of Object.values(students)) {
    updateTotals.run(attendedByStudent[studentId] || 0, studentId);
  }
});

run();

const summary = {
  preservedUser: db.prepare("SELECT id, email, full_name, role FROM profiles WHERE email = ?").get(PRESERVED_EMAIL) || null,
  students: db.prepare("SELECT COUNT(*) as count FROM profiles WHERE role = 'student'").get().count,
  packages: db.prepare("SELECT COUNT(*) as count FROM paquetes").get().count,
  classes: db.prepare("SELECT COUNT(*) as count FROM classes").get().count,
  reservations: db.prepare("SELECT COUNT(*) as count FROM reservations").get().count,
  attendance: db.prepare("SELECT COUNT(*) as count FROM registros_asistencia").get().count,
  subscriptions: db.prepare("SELECT COUNT(*) as count FROM suscripciones_alumno").get().count,
  beneficiaries: db.prepare("SELECT COUNT(*) as count FROM suscripcion_beneficiarios").get().count,
  paymentsByMonth: db.prepare(`
    SELECT strftime('%Y-%m', fecha_pago) as periodo, COUNT(*) as ventas, ROUND(SUM(monto), 2) as ingresos
    FROM transacciones_pago
    GROUP BY strftime('%Y-%m', fecha_pago)
    ORDER BY periodo
  `).all(),
  warningStudents: db.prepare(`
    SELECT p.full_name, p.email, sb.clases_restantes, s.fecha_vencimiento
    FROM profiles p
    JOIN suscripcion_beneficiarios sb ON sb.alumno_id = p.id
    JOIN suscripciones_alumno s ON s.id = sb.suscripcion_id
    WHERE p.role = 'student'
      AND sb.estado = 'active'
      AND s.estado = 'active'
      AND (
        sb.clases_restantes <= 2
        OR julianday(s.fecha_vencimiento) - julianday('now') < 7
      )
    ORDER BY p.full_name
  `).all()
  ,
  classTypes: db.prepare(`
    SELECT type, COUNT(*) as total
    FROM classes
    GROUP BY type
    ORDER BY type
  `).all()
};

console.log(JSON.stringify(summary, null, 2));
