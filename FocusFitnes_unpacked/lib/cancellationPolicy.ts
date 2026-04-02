export interface CancellationPolicySettings {
  cancellation_limit_hours: number;
  cancellation_cutoff_morning?: string;
  cancellation_deadline_evening?: string;
}

const normalizeTime = (value: string | undefined, fallback: string) => {
  const source = String(value || '').trim();
  if (!/^\d{2}:\d{2}$/.test(source)) return fallback;
  const [h, m] = source.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) return fallback;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const calculateCancellationDeadline = (
  classDate: string,
  classStartTime: string,
  settings: CancellationPolicySettings
) => {
  const start = new Date(`${classDate}T${String(classStartTime || '00:00').slice(0, 5)}:00`);
  const limitHours = Number(settings?.cancellation_limit_hours || 8);
  const normal = new Date(start.getTime() - limitHours * 60 * 60 * 1000);

  const cutoffMorning = normalizeTime(settings?.cancellation_cutoff_morning, '08:00');
  const deadlineEvening = normalizeTime(settings?.cancellation_deadline_evening, '22:00');
  const [cutoffH, cutoffM] = cutoffMorning.split(':').map(Number);
  const normalMinutes = normal.getHours() * 60 + normal.getMinutes();
  const cutoffMinutes = cutoffH * 60 + cutoffM;

  if (normalMinutes < cutoffMinutes) {
    const previousDay = new Date(start);
    previousDay.setDate(previousDay.getDate() - 1);
    const [eveningH, eveningM] = deadlineEvening.split(':').map(Number);
    previousDay.setHours(eveningH, eveningM, 0, 0);
    return previousDay;
  }

  return normal;
};

export const formatCancellationDeadline = (deadline: Date) =>
  deadline.toLocaleString('es-MX', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });

