import React, { useMemo, useState } from 'react';
import { ClassInstance } from '../types.ts';

type CalendarView = 'day' | 'week' | 'month';
type CalendarMode = 'student' | 'coach';

type StatusTag = 'Disponible' | 'Llena' | 'Cancelada' | 'Finalizada' | 'En curso';

interface ClassCalendarProps {
  classes: ClassInstance[];
  availability: Record<string, number>;
  mode: CalendarMode;
  loading?: boolean;
  enrolledClassIds?: Set<string>;
  onBookClass?: (classId: string) => void;
  onOpenReservation?: (classItem: ClassInstance) => void;
  onOpenCoachDetail?: (classItem: ClassInstance) => void;
}

const dayLabel = (date: Date) => date.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' });
const fullDateLabel = (dateStr: string) => new Date(`${dateStr}T00:00:00`).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
const timeRange = (item: ClassInstance) => `${String(item.startTime || '').slice(0, 5)} - ${String(item.endTime || '').slice(0, 5)}`;
const dateKey = (date: Date) => date.toISOString().split('T')[0];

const toDateTime = (dateStr: string, time: string) => new Date(`${dateStr}T${String(time || '00:00').slice(0, 5)}:00`);

const computeClassStatus = (item: ClassInstance, occupied: number): { status: StatusTag; blocked: boolean } => {
  const now = new Date();
  const start = toDateTime(item.date, item.startTime);
  const end = toDateTime(item.date, item.endTime);
  const max = Number(item.max_capacity || item.capacity || 0);
  const normalizedStatus = String(item.status || '').toLowerCase();
  const normalizedRealtime = String(item.real_time_status || '').toLowerCase();

  if (normalizedStatus === 'canceled' || normalizedStatus === 'cancelled' || normalizedRealtime === 'canceled' || normalizedRealtime === 'cancelled') {
    return { status: 'Cancelada', blocked: true };
  }
  if (now >= end || normalizedRealtime === 'finished') {
    return { status: 'Finalizada', blocked: true };
  }
  if (now >= start && now < end || normalizedRealtime === 'in_progress') {
    return { status: 'En curso', blocked: true };
  }
  if (max > 0 && occupied >= max) {
    return { status: 'Llena', blocked: true };
  }
  return { status: 'Disponible', blocked: false };
};

const statusStyles: Record<StatusTag, string> = {
  Disponible: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  Llena: 'bg-amber-50 border-amber-200 text-amber-700',
  Cancelada: 'bg-rose-50 border-rose-200 text-rose-700',
  Finalizada: 'bg-zinc-100 border-zinc-200 text-zinc-500',
  'En curso': 'bg-indigo-50 border-indigo-200 text-indigo-700'
};

export const ClassCalendar: React.FC<ClassCalendarProps> = ({
  classes,
  availability,
  mode,
  loading,
  enrolledClassIds,
  onBookClass,
  onOpenReservation,
  onOpenCoachDetail
}) => {
  const [view, setView] = useState<CalendarView>('week');
  const [anchorDate, setAnchorDate] = useState(new Date());

  const normalizedClasses = useMemo(() => {
    return [...classes].sort((a, b) => {
      const aTs = toDateTime(a.date, a.startTime).getTime();
      const bTs = toDateTime(b.date, b.startTime).getTime();
      return aTs - bTs;
    });
  }, [classes]);

  const visibleDates = useMemo(() => {
    const start = new Date(anchorDate);
    start.setHours(0, 0, 0, 0);

    if (view === 'day') {
      return [new Date(start)];
    }

    if (view === 'week') {
      const day = start.getDay();
      const diffToSunday = day;
      start.setDate(start.getDate() - diffToSunday);
      return Array.from({ length: 7 }, (_, idx) => {
        const next = new Date(start);
        next.setDate(start.getDate() + idx);
        return next;
      });
    }

    const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
    const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    const startOffset = monthStart.getDay();
    const firstGridDay = new Date(monthStart);
    firstGridDay.setDate(monthStart.getDate() - startOffset);
    const totalDays = 42;
    return Array.from({ length: totalDays }, (_, idx) => {
      const next = new Date(firstGridDay);
      next.setDate(firstGridDay.getDate() + idx);
      return next;
    }).filter((d) => d <= monthEnd || d.getMonth() === monthStart.getMonth() || d.getDay() !== 0);
  }, [anchorDate, view]);

  const classesByDate = useMemo(() => {
    const map: Record<string, ClassInstance[]> = {};
    normalizedClasses.forEach((cls) => {
      if (!map[cls.date]) map[cls.date] = [];
      map[cls.date].push(cls);
    });
    return map;
  }, [normalizedClasses]);

  const title = useMemo(() => {
    if (view === 'day') return anchorDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
    if (view === 'week') {
      const first = visibleDates[0];
      const last = visibleDates[visibleDates.length - 1];
      return `${first.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} - ${last.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    }
    return anchorDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  }, [anchorDate, view, visibleDates]);

  const move = (direction: 'prev' | 'next') => {
    const delta = direction === 'prev' ? -1 : 1;
    const next = new Date(anchorDate);
    if (view === 'day') next.setDate(anchorDate.getDate() + delta);
    if (view === 'week') next.setDate(anchorDate.getDate() + (7 * delta));
    if (view === 'month') next.setMonth(anchorDate.getMonth() + delta);
    setAnchorDate(next);
  };

  const handleClassClick = (classItem: ClassInstance, blocked: boolean, isEnrolled: boolean) => {
    if (mode === 'student') {
      if (isEnrolled) {
        onOpenReservation?.(classItem);
        return;
      }
      if (!blocked) {
        onBookClass?.(classItem.id);
      }
      return;
    }
    onOpenCoachDetail?.(classItem);
  };

  const isMonthView = view === 'month';

  return (
    <div className="bg-white border border-zinc-100 rounded-3xl p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => move('prev')} className="w-9 h-9 rounded-xl border border-zinc-200 text-zinc-500 hover:bg-zinc-50">
            <i className="fas fa-chevron-left text-xs"></i>
          </button>
          <button type="button" onClick={() => setAnchorDate(new Date())} className="px-3 py-2 rounded-xl border border-zinc-200 text-[10px] font-black uppercase tracking-widest text-zinc-700 hover:bg-zinc-50">
            Hoy
          </button>
          <button type="button" onClick={() => move('next')} className="w-9 h-9 rounded-xl border border-zinc-200 text-zinc-500 hover:bg-zinc-50">
            <i className="fas fa-chevron-right text-xs"></i>
          </button>
        </div>
        <h4 className="text-lg sm:text-xl font-bebas tracking-wide uppercase italic text-zinc-900">{title}</h4>
        <div className="grid grid-cols-3 rounded-xl bg-zinc-100 p-1 text-[10px] font-black uppercase tracking-widest">
          {(['day', 'week', 'month'] as CalendarView[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setView(option)}
              className={`px-3 py-2 rounded-lg transition-all ${view === option ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              {option === 'day' ? 'Día' : option === 'week' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-10 text-center text-zinc-400">
          <i className="fas fa-circle-notch fa-spin text-2xl"></i>
          <p className="mt-3 text-[10px] font-black uppercase tracking-widest">Cargando calendario</p>
        </div>
      ) : (
        <div className={`${isMonthView ? 'grid grid-cols-7 gap-2' : view === 'week' ? 'grid grid-cols-1 md:grid-cols-7 gap-3' : 'grid grid-cols-1 gap-3'}`}>
          {visibleDates.map((date) => {
            const key = dateKey(date);
            const dayClasses = classesByDate[key] || [];
            const isCurrentMonth = date.getMonth() === anchorDate.getMonth();

            return (
              <div
                key={key}
                className={`rounded-2xl border p-2 sm:p-3 min-h-[120px] ${isMonthView ? 'space-y-2' : 'space-y-3'} ${
                  isMonthView
                    ? isCurrentMonth ? 'border-zinc-200 bg-white' : 'border-zinc-100 bg-zinc-50/60'
                    : 'border-zinc-200 bg-zinc-50/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${isCurrentMonth ? 'text-zinc-700' : 'text-zinc-400'}`}>
                    {dayLabel(date)}
                  </p>
                  <span className="text-[10px] font-bold text-zinc-400">{dayClasses.length}</span>
                </div>

                <div className="space-y-2">
                  {dayClasses.slice(0, isMonthView ? 3 : dayClasses.length).map((classItem) => {
                    const occupied = Number(availability[classItem.id] || classItem.enrolled_count || 0);
                    const max = Number(classItem.max_capacity || classItem.capacity || 0);
                    const min = Number(classItem.min_capacity || 1);
                    const isEnrolled = Boolean(enrolledClassIds?.has(classItem.id));
                    const { status, blocked } = computeClassStatus(classItem, occupied);
                    const rowClickable = mode === 'coach' || isEnrolled || (!blocked && status === 'Disponible');

                    return (
                      <button
                        key={classItem.id}
                        type="button"
                        onClick={() => handleClassClick(classItem, blocked, isEnrolled)}
                        disabled={!rowClickable}
                        className={`w-full text-left rounded-xl border p-2 transition-all ${
                          isEnrolled
                            ? 'border-brand bg-cyan-50'
                            : statusStyles[status]
                        } ${status === 'Finalizada' || status === 'Cancelada' ? 'opacity-60' : ''} ${
                          rowClickable ? 'hover:shadow-sm cursor-pointer' : 'cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-black uppercase tracking-tight text-zinc-900 line-clamp-1">{classItem.type}</p>
                          <span className="text-[9px] font-black uppercase tracking-widest">{status}</span>
                        </div>
                        <p className="text-[10px] font-semibold text-zinc-600 mt-1">{timeRange(classItem)}</p>
                        <p className="text-[10px] text-zinc-500 mt-1">Cupo: {occupied}/{max}</p>
                        {mode === 'coach' ? (
                          <>
                            <p className="text-[10px] text-zinc-500">Mín. {min}</p>
                            {(classItem.enrolled_students || []).length > 0 ? (
                              <p className="text-[10px] text-zinc-600 line-clamp-2 mt-1">
                                {(classItem.enrolled_students || []).join(', ')}
                              </p>
                            ) : (
                              <p className="text-[10px] text-zinc-400 mt-1">Sin inscritos aún.</p>
                            )}
                            {occupied < min && status === 'Disponible' && (
                              <p className="text-[10px] font-black text-amber-600 mt-1 uppercase tracking-wider">Mínimo no alcanzado</p>
                            )}
                          </>
                        ) : (
                          <>
                            {isEnrolled && (
                              <p className="text-[10px] font-black text-brand mt-1 uppercase tracking-wider">Inscrito</p>
                            )}
                            <p className="text-[10px] text-zinc-500 mt-1">{fullDateLabel(classItem.date)}</p>
                          </>
                        )}
                      </button>
                    );
                  })}
                  {isMonthView && dayClasses.length > 3 && (
                    <p className="text-[10px] text-zinc-500 font-semibold">+{dayClasses.length - 3} clases más</p>
                  )}
                  {dayClasses.length === 0 && !isMonthView && (
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Sin clases</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
