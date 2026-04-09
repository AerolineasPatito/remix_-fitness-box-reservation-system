import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, logger } from '../lib/api.ts';
import { Profile } from '../types.ts';
import { useAppData } from '../contexts/AppDataContext.tsx';
import { CancellationPolicySettings } from '../lib/cancellationPolicy.ts';
import { ReservationCancellationModal } from './ReservationCancellationModal.tsx';
import { useNotifications } from './NotificationSystem.tsx';
import { getFriendlyErrorMessage } from '../lib/errorMessages.ts';
import { Badge, Button, Card, LoadingState } from './ui/index.ts';

type CalendarViewMode = 'day' | 'week' | 'month';

type CalendarClass = {
  id: string;
  type: string;
  date: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  min_capacity: number;
  status: string;
  real_time_status: string;
  class_status: 'available' | 'full' | 'cancelled' | 'finished';
  reservations_count: number;
  remaining_spots: number;
  participants?: Array<{
    reservation_id: string;
    user_id: string;
    full_name: string;
    email?: string;
    whatsapp_phone?: string;
  }>;
  viewer_reservation?: {
    reservation_id: string;
    user_id: string;
    full_name?: string;
    email?: string;
    whatsapp_phone?: string;
  } | null;
};

const normalizeCalendarRows = (rows: any[]): CalendarClass[] => {
  const now = new Date();
  return (Array.isArray(rows) ? rows : []).map((raw) => {
    const participants = Array.isArray(raw?.participants)
      ? raw.participants
      : Array.isArray(raw?.roster)
        ? raw.roster.map((p: any) => ({
            reservation_id: String(p?.reservation_id || ''),
            user_id: String(p?.user_id || p?.id || ''),
            full_name: String(p?.full_name || 'Alumno'),
            email: p?.email || '',
            whatsapp_phone: p?.whatsapp_phone || ''
          }))
        : [];
    const reservationsCount = Number(raw?.reservations_count ?? raw?.reserved_count ?? participants.length ?? 0);
    const maxCapacity = Number(raw?.max_capacity ?? raw?.capacity ?? 0);
    const rawStatus = String(raw?.status || '').toLowerCase();
    const rawRealtimeStatus = String(raw?.real_time_status || '').toLowerCase();
    const endDateTime = new Date(`${String(raw?.date || '')}T${String(raw?.end_time || '00:00').slice(0, 5)}:00`);

    let classStatus: CalendarClass['class_status'] = raw?.class_status || 'available';
    if (
      rawStatus === 'canceled' ||
      rawStatus === 'cancelled' ||
      rawRealtimeStatus === 'canceled' ||
      rawRealtimeStatus === 'cancelled'
    ) {
      classStatus = 'cancelled';
    } else if (Number.isFinite(endDateTime.getTime()) && now.getTime() >= endDateTime.getTime()) {
      classStatus = 'finished';
    } else if (maxCapacity > 0 && reservationsCount >= maxCapacity) {
      classStatus = 'full';
    } else if (!['available', 'full', 'cancelled', 'finished'].includes(String(classStatus))) {
      classStatus = 'available';
    }

    return {
      ...raw,
      date: String(raw?.date || ''),
      start_time: String(raw?.start_time || '00:00'),
      end_time: String(raw?.end_time || '00:00'),
      max_capacity: maxCapacity,
      min_capacity: Number(raw?.min_capacity ?? 1),
      status: String(raw?.status || 'active'),
      real_time_status: String(raw?.real_time_status || ''),
      class_status: classStatus,
      reservations_count: reservationsCount,
      remaining_spots: Math.max(0, Number(raw?.remaining_spots ?? maxCapacity - reservationsCount)),
      participants,
      viewer_reservation: raw?.viewer_reservation || null
    } as CalendarClass;
  });
};

interface HomeCalendarProps {
  user: Profile;
  onRefreshData?: () => Promise<void> | void;
}

const startOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatDate = (date: Date) => date.toISOString().split('T')[0];

const getStatusLabel = (classRow: CalendarClass) => {
  if (classRow.class_status === 'cancelled') return 'Cancelada';
  if (classRow.class_status === 'finished') return 'Finalizada';
  if (classRow.class_status === 'full') return 'Llena';
  return 'Disponible';
};

const getStatusPillVariant = (classRow: CalendarClass) => {
  if (classRow.class_status === 'cancelled') return 'danger' as const;
  if (classRow.class_status === 'finished') return 'neutral' as const;
  if (classRow.class_status === 'full') return 'warning' as const;
  return 'success' as const;
};

export const HomeCalendar: React.FC<HomeCalendarProps> = ({ user, onRefreshData }) => {
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const { classes, availability, systemSettings, refreshClasses, refreshAvailability } = useAppData();
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [currentDate, setCurrentDate] = useState(() => startOfDay(new Date()));
  const [calendarRows, setCalendarRows] = useState<CalendarClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<CalendarClass | null>(null);
  const [cancelingReservationId, setCancelingReservationId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [publicSettings, setPublicSettings] = useState<CancellationPolicySettings>({
    cancellation_limit_hours: 8,
    cancellation_cutoff_morning: '08:00',
    cancellation_deadline_evening: '22:00'
  });

  const isCoachView = user.role === 'coach' || user.role === 'admin';
  const isStudentView = user.role === 'student';

  useEffect(() => {
    setPublicSettings({
      cancellation_limit_hours: Number(systemSettings?.cancellation_limit_hours || 8),
      cancellation_cutoff_morning: String(systemSettings?.cancellation_cutoff_morning || '08:00'),
      cancellation_deadline_evening: String(systemSettings?.cancellation_deadline_evening || '22:00')
    });
  }, [systemSettings]);

  const range = useMemo(() => {
    const base = startOfDay(currentDate);
    if (viewMode === 'day') {
      return { start: base, end: base };
    }
    if (viewMode === 'week') {
      const start = new Date(base);
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start, end };
    }
    const start = new Date(base.getFullYear(), base.getMonth(), 1);
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    return { start, end };
  }, [currentDate, viewMode]);

  const dayBuckets = useMemo(() => {
    const map = new Map<string, CalendarClass[]>();
    calendarRows.forEach((row) => {
      const list = map.get(row.date) || [];
      list.push(row);
      map.set(row.date, list);
    });
    return map;
  }, [calendarRows]);

  const loadCalendar = async () => {
    setLoading(true);
    try {
      const rows = await api.getCalendarClasses({
        startDate: formatDate(range.start),
        endDate: formatDate(range.end),
        viewerId: user.id
      });
      setCalendarRows(normalizeCalendarRows(rows || []));
    } catch (error: any) {
      logger.error('Error loading home calendar', error);
      setCalendarRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendar();
  }, [viewMode, range.start.getTime(), range.end.getTime(), user.id]);

  useEffect(() => {
    if (!user?.id) return;
    loadCalendar();
  }, [classes, availability, user?.id]);

  const visibleDays = useMemo(() => {
    const days: Date[] = [];
    const cursor = new Date(range.start);
    while (cursor <= range.end) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }, [range.start.getTime(), range.end.getTime()]);

  const goPrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'day') next.setDate(next.getDate() - 1);
    if (viewMode === 'week') next.setDate(next.getDate() - 7);
    if (viewMode === 'month') next.setMonth(next.getMonth() - 1);
    setCurrentDate(startOfDay(next));
  };

  const goNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'day') next.setDate(next.getDate() + 1);
    if (viewMode === 'week') next.setDate(next.getDate() + 7);
    if (viewMode === 'month') next.setMonth(next.getMonth() + 1);
    setCurrentDate(startOfDay(next));
  };

  const isClassDisabledForStudent = (classRow: CalendarClass) => {
    if (classRow.viewer_reservation) return false;
    return classRow.class_status !== 'available';
  };

  const handleClassClick = (classRow: CalendarClass) => {
    if (isCoachView) {
      setSelectedClass(classRow);
      return;
    }
    if (!isStudentView) return;
    if (classRow.viewer_reservation) {
      setSelectedClass(classRow);
      return;
    }
    if (isClassDisabledForStudent(classRow)) return;
    navigate(`/book/${classRow.id}`);
  };

  const handleConfirmCancellation = async (reservationId: string) => {
    if (!reservationId) return;
    setCancelingReservationId(reservationId);
    try {
      await api.cancelReservation(reservationId);
      await Promise.all([refreshClasses(), refreshAvailability()]);
      await loadCalendar();
      await Promise.resolve(onRefreshData?.());
      setCancelTarget(null);
      setSelectedClass(null);
    } catch (error: any) {
      logger.error('Error canceling reservation from calendar', error);
      addNotification({
        type: 'error',
        title: 'No pudimos cancelar tu reserva',
        message: getFriendlyErrorMessage(error, 'Intenta de nuevo en unos segundos.'),
        duration: 4500
      });
    } finally {
      setCancelingReservationId(null);
    }
  };

  const renderClassCard = (classRow: CalendarClass) => {
    const participants = Array.isArray(classRow.participants) ? classRow.participants : [];
    const isEnrolled = Boolean(classRow.viewer_reservation);
    const isDisabled = isStudentView ? isClassDisabledForStudent(classRow) : false;
    const needsMinAlert = isCoachView && classRow.class_status === 'available' && classRow.reservations_count < classRow.min_capacity;
    return (
      <button
        key={classRow.id}
        type="button"
        disabled={isDisabled}
        onClick={() => handleClassClick(classRow)}
        className={`w-full text-left rounded-2xl border p-3 transition-all ${
          classRow.class_status === 'cancelled' || classRow.class_status === 'finished'
            ? 'opacity-60 bg-zinc-50 border-zinc-200'
            : isEnrolled
              ? 'border-brand bg-cyan-50/60 shadow-sm'
              : 'border-zinc-200 bg-white hover:border-zinc-400'
        } ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-black uppercase tracking-wide text-zinc-900">{classRow.type}</p>
          <Badge variant={getStatusPillVariant(classRow)} className="text-[10px] font-black">
            {getStatusLabel(classRow)}
          </Badge>
        </div>
        <p className="mt-2 text-[11px] font-semibold text-zinc-600">
          {String(classRow.start_time).slice(0, 5)} - {String(classRow.end_time).slice(0, 5)}
        </p>

        {isStudentView && (
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="text-[10px] font-black text-zinc-500 uppercase">Cupo: {classRow.reservations_count}/{classRow.max_capacity}</span>
            {isEnrolled && <span className="text-[10px] font-black text-brand uppercase">Inscrito</span>}
          </div>
        )}

        {isCoachView && (
          <div className="mt-2 space-y-1">
            <p className="text-[10px] font-black text-zinc-500 uppercase">Cupo: {classRow.reservations_count}/{classRow.max_capacity}</p>
            <p className="text-[10px] font-black text-zinc-500 uppercase">Mín. {classRow.min_capacity}</p>
            {needsMinAlert && (
              <p className="text-[10px] font-black text-amber-600 uppercase">Mínimo no alcanzado</p>
            )}
            <div className="text-[10px] text-zinc-500">
              {participants.length > 0
                ? participants.map((p) => p.full_name).join(', ')
                : 'Sin inscritos'}
            </div>
          </div>
        )}
      </button>
    );
  };

  return (
    <Card className="mt-10 sm:mt-12 rounded-3xl border border-zinc-100 bg-white p-4 sm:p-6 shadow-xl overflow-x-hidden [&_button]:min-h-[44px]">
      <ReservationCancellationModal
        isOpen={Boolean(cancelTarget)}
        reservation={cancelTarget}
        settings={publicSettings}
        isSubmitting={cancelingReservationId === (cancelTarget?.id || cancelTarget?.reservation_id || '')}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleConfirmCancellation}
      />

      {selectedClass && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-zinc-900/70" onClick={() => setSelectedClass(null)} />
          <div className="relative z-10 w-full max-w-2xl rounded-3xl bg-white p-6 border border-zinc-100 shadow-2xl">
            <h4 className="text-3xl font-bebas tracking-wide uppercase italic text-zinc-900">{selectedClass.type}</h4>
            <p className="mt-2 text-sm text-zinc-600">
              {new Date(`${selectedClass.date}T00:00:00`).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })} · {String(selectedClass.start_time).slice(0, 5)} - {String(selectedClass.end_time).slice(0, 5)}
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-3">Cupo: <strong>{selectedClass.reservations_count}/{selectedClass.max_capacity}</strong></div>
              <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-3">Mínimo requerido: <strong>{selectedClass.min_capacity}</strong></div>
            </div>
            {isCoachView && (
              <div className="mt-4 rounded-xl border border-zinc-100 p-3">
                <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Alumnos inscritos</p>
                <p className="mt-2 text-sm text-zinc-700">
                  {(selectedClass.participants || []).length > 0
                    ? (selectedClass.participants || []).map((p) => p.full_name).join(', ')
                    : 'Sin inscritos'}
                </p>
              </div>
            )}
            <div className="mt-6 flex gap-3">
              <Button
                type="button"
                onClick={() => setSelectedClass(null)}
                variant="secondary"
                fullWidth
                className="text-[10px]"
              >
                Cerrar
              </Button>
              {isStudentView && selectedClass.viewer_reservation && (
                <Button
                  type="button"
                  onClick={() => {
                    setSelectedClass(null);
                    setCancelTarget({
                      id: selectedClass.viewer_reservation?.reservation_id,
                      reservation_id: selectedClass.viewer_reservation?.reservation_id,
                      type: selectedClass.type,
                      date: selectedClass.date,
                      start_time: selectedClass.start_time,
                      end_time: selectedClass.end_time
                    });
                  }}
                  disabled={cancelingReservationId === selectedClass.viewer_reservation.reservation_id}
                  variant="danger"
                  fullWidth
                  className="text-[10px] disabled:opacity-60"
                >
                  {cancelingReservationId === selectedClass.viewer_reservation.reservation_id ? 'Cancelando...' : 'Cancelar reserva'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Calendario de clases</p>
          <h3 className="text-3xl sm:text-4xl font-bebas text-zinc-900 uppercase italic tracking-tight">Vista tipo agenda</h3>
        </div>
        <div className="flex items-center gap-2">
          {(['day', 'week', 'month'] as CalendarViewMode[]).map((mode) => (
            <Button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              size="sm"
              variant={viewMode === mode ? 'primary' : 'ghost'}
              className={viewMode === mode ? '' : 'border-transparent text-zinc-600'}
            >
              {mode === 'day' ? 'Día' : mode === 'week' ? 'Semana' : 'Mes'}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Button type="button" onClick={goPrev} variant="secondary" size="sm" className="w-10 h-10 rounded-xl px-0">
          <i className="fas fa-chevron-left"></i>
        </Button>
        <p className="text-sm font-black uppercase tracking-widest text-zinc-600">
          {range.start.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
          {' - '}
          {range.end.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
        <Button type="button" onClick={goNext} variant="secondary" size="sm" className="w-10 h-10 rounded-xl px-0">
          <i className="fas fa-chevron-right"></i>
        </Button>
      </div>

      {loading ? (
        <LoadingState title="Cargando calendario" icon="fa-calendar-day" />
      ) : (
        <div className={`mt-5 ${viewMode === 'month' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3' : 'grid grid-cols-1 lg:grid-cols-2 gap-3'}`}>
          {visibleDays.map((day) => {
            const key = formatDate(day);
            const dayItems = dayBuckets.get(key) || [];
            return (
              <div key={key} className="rounded-2xl border border-zinc-100 bg-zinc-50/60 p-3 space-y-2 min-h-[140px]">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    {day.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' })}
                  </p>
                  <span className="text-[10px] font-black text-zinc-400">{dayItems.length}</span>
                </div>
                <div className="space-y-2">
                  {dayItems.length > 0 ? dayItems.map(renderClassCard) : (
                    <p className="text-[11px] text-zinc-400">Sin clases programadas.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
