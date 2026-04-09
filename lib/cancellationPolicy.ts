export interface CancellationPolicySettings {
  cancellation_limit_hours: number;
  cancellation_cutoff_morning?: string;
  cancellation_deadline_evening?: string;
}

export const DEFAULT_APP_TIMEZONE = 'America/Mexico_City';

const normalizeTime = (value: string | undefined, fallback: string) => {
  const source = String(value || '').trim();
  if (!/^\d{2}:\d{2}$/.test(source)) return fallback;
  const [h, m] = source.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) return fallback;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const buildIntlParts = (date: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const raw = formatter.formatToParts(date);
  const parts: Record<string, string> = {};
  for (const item of raw) {
    if (item.type !== 'literal') parts[item.type] = item.value;
  }
  return {
    year: Number(parts.year || 0),
    month: Number(parts.month || 1),
    day: Number(parts.day || 1),
    hour: Number(parts.hour || 0),
    minute: Number(parts.minute || 0),
    second: Number(parts.second || 0)
  };
};

const getTimeZoneOffsetMs = (date: Date, timeZone: string) => {
  const local = buildIntlParts(date, timeZone);
  const asUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
  return asUtc - date.getTime();
};

const buildDateInTimeZone = (dateIso: string, hhmm: string, timeZone: string) => {
  const [year, month, day] = String(dateIso || '').split('-').map(Number);
  const [hour, minute] = String(hhmm || '00:00').split(':').map(Number);
  const utcGuess = Date.UTC(year, (month || 1) - 1, day || 1, hour || 0, minute || 0, 0);
  const initial = new Date(utcGuess);
  const offset1 = getTimeZoneOffsetMs(initial, timeZone);
  const resolved1 = new Date(utcGuess - offset1);
  const offset2 = getTimeZoneOffsetMs(resolved1, timeZone);
  return new Date(utcGuess - offset2);
};

const addDaysIso = (dateIso: string, days: number) => {
  const [year, month, day] = String(dateIso || '').split('-').map(Number);
  const seed = new Date(Date.UTC(year, (month || 1) - 1, day || 1));
  seed.setUTCDate(seed.getUTCDate() + days);
  const yy = seed.getUTCFullYear();
  const mm = String(seed.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(seed.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

const getMinutesInDayForTimeZone = (date: Date, timeZone: string) => {
  const local = buildIntlParts(date, timeZone);
  return local.hour * 60 + local.minute;
};

export const calculateCancellationDeadline = (
  classDate: string,
  classStartTime: string,
  settings: CancellationPolicySettings,
  timeZone = DEFAULT_APP_TIMEZONE
) => {
  const start = buildDateInTimeZone(classDate, String(classStartTime || '00:00').slice(0, 5), timeZone);
  const limitHours = Number(settings?.cancellation_limit_hours || 8);
  const normal = new Date(start.getTime() - limitHours * 60 * 60 * 1000);

  const cutoffMorning = normalizeTime(settings?.cancellation_cutoff_morning, '08:00');
  const deadlineEvening = normalizeTime(settings?.cancellation_deadline_evening, '22:00');
  const [cutoffH, cutoffM] = cutoffMorning.split(':').map(Number);
  const normalMinutes = getMinutesInDayForTimeZone(normal, timeZone);
  const cutoffMinutes = cutoffH * 60 + cutoffM;

  if (normalMinutes < cutoffMinutes) {
    const previousDateIso = addDaysIso(classDate, -1);
    return buildDateInTimeZone(previousDateIso, deadlineEvening, timeZone);
  }

  return normal;
};

export const formatCancellationDeadline = (deadline: Date, timeZone = DEFAULT_APP_TIMEZONE) =>
  deadline.toLocaleString('es-MX', {
    timeZone,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
