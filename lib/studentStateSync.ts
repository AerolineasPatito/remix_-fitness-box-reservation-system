const STUDENT_STATE_EVENT = 'focus:student-state-changed';
const STUDENT_STATE_STORAGE_KEY = 'focus_student_state_changed';

type StudentStatePayload = {
  studentId: string;
  ts: number;
};

type StudentStateHandler = (payload: StudentStatePayload) => void;

const parsePayload = (raw: any): StudentStatePayload | null => {
  if (!raw || typeof raw !== 'object') return null;
  const studentId = String((raw as any).studentId || '').trim();
  const ts = Number((raw as any).ts || Date.now());
  if (!studentId) return null;
  return { studentId, ts };
};

export const emitStudentStateChanged = (studentId: string) => {
  const normalized = String(studentId || '').trim();
  if (!normalized) return;
  const payload: StudentStatePayload = { studentId: normalized, ts: Date.now() };

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STUDENT_STATE_EVENT, { detail: payload }));
  }

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STUDENT_STATE_STORAGE_KEY, JSON.stringify(payload));
    }
  } catch {
    // ignore storage write errors
  }
};

export const subscribeStudentStateChanged = (handler: StudentStateHandler) => {
  if (typeof window === 'undefined') return () => {};

  const onEvent = (event: Event) => {
    const customEvent = event as CustomEvent<StudentStatePayload>;
    const payload = parsePayload(customEvent?.detail);
    if (payload) handler(payload);
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key !== STUDENT_STATE_STORAGE_KEY || !event.newValue) return;
    try {
      const payload = parsePayload(JSON.parse(event.newValue));
      if (payload) handler(payload);
    } catch {
      // ignore parse errors
    }
  };

  window.addEventListener(STUDENT_STATE_EVENT, onEvent as EventListener);
  window.addEventListener('storage', onStorage);

  return () => {
    window.removeEventListener(STUDENT_STATE_EVENT, onEvent as EventListener);
    window.removeEventListener('storage', onStorage);
  };
};

