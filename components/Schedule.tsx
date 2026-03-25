import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ClassInstance, AvailabilityState, Profile } from '../types.ts';
import { ClassStatusBadge } from './ClassStatusBadge.tsx';
import { resolveClassTypeFromSlug, slugifyClassType } from '../lib/routeHelpers.ts';
import { api } from '../lib/api.ts';

interface ScheduleProps {
  instances: ClassInstance[];
  availability: AvailabilityState;
  user?: Profile | null;
  onUserProfileUpdate?: (profile: Profile) => void;
}

type ClassTypeRow = {
  id: string;
  name: string;
  image_url?: string | null;
  icon?: string | null;
  color_theme?: string | null;
};

type DashboardData = {
  profile?: Profile;
  activeSubscription?: any;
  beneficiaries?: Array<{ alumno_id: string; es_titular: number; full_name: string }>;
  upcomingReservations?: Array<{
    id: string;
    status: string;
    class_id: string;
    type: string;
    date: string;
    start_time: string;
    end_time: string;
    image_url?: string | null;
    icon?: string | null;
    color_theme?: string | null;
  }>;
};

export const Schedule: React.FC<ScheduleProps> = ({ instances, availability, user, onUserProfileUpdate }) => {
  const { serviceType } = useParams<{ serviceType: string }>();
  const navigate = useNavigate();
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [classTypesByName, setClassTypesByName] = useState<Record<string, ClassTypeRow>>({});
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [publicSettings, setPublicSettings] = useState<{ cancellation_limit_hours: number }>({ cancellation_limit_hours: 8 });
  const [cancelingReservationId, setCancelingReservationId] = useState<string | null>(null);
  const [cancelPreview, setCancelPreview] = useState<{ reservationId: string; isLate: boolean; limitHours: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedSlug = (serviceType || '').toLowerCase();
  const decodedService = useMemo(() => {
    const fromClassTypes = Object.keys(classTypesByName).find((name) => slugifyClassType(name) === selectedSlug);
    if (fromClassTypes) return fromClassTypes;
    const fromInstances = instances.find((inst) => slugifyClassType(inst.type) === selectedSlug)?.type;
    if (fromInstances) return fromInstances;
    return resolveClassTypeFromSlug(serviceType || '');
  }, [classTypesByName, instances, selectedSlug, serviceType]);
  const isStudent = user?.role === 'student';
  const colorThemeClass = (theme?: string | null) => {
    const value = (theme || '').toLowerCase();
    if (value.includes('amber') || value.includes('yellow')) return 'bg-amber-100 text-amber-700';
    if (value.includes('emerald') || value.includes('green')) return 'bg-emerald-100 text-emerald-700';
    if (value.includes('rose') || value.includes('red')) return 'bg-rose-100 text-rose-700';
    if (value.includes('indigo') || value.includes('blue')) return 'bg-indigo-100 text-indigo-700';
    return 'bg-zinc-100 text-zinc-700';
  };

  const reloadStudentDashboard = async () => {
    if (!user?.id || user.role !== 'student') return;
    try {
      const data = await api.getStudentDashboard(user.id);
      setDashboard(data);
    } catch {
      setDashboard(null);
    }
  };

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [types, settings] = await Promise.all([api.getClassTypes(), api.getPublicSettings()]);
        const map: Record<string, ClassTypeRow> = {};
        (Array.isArray(types) ? types : []).forEach((t: ClassTypeRow) => {
          map[t.name] = t;
        });
        setClassTypesByName(map);
        if (settings?.cancellation_limit_hours) {
          setPublicSettings({ cancellation_limit_hours: Number(settings.cancellation_limit_hours) || 8 });
        }
      } catch {}
    };
    loadMeta();
  }, []);

  useEffect(() => {
    reloadStudentDashboard();
  }, [user?.id, user?.role]);

  const dates = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + i);

      return {
        dateStr: d.toISOString().split('T')[0],
        dayNum: d.getDate(),
        dayName: d.toLocaleString('es-MX', { weekday: 'short' }).toUpperCase(),
        month: d.toLocaleString('es-MX', { month: 'short' }).toUpperCase(),
        year: d.getFullYear(),
        fullMonth: d.toLocaleString('es-MX', { month: 'long' }).toUpperCase()
      };
    });
  }, []);

  const activeDate = dates[selectedDayIdx];
  const activeClasses = instances.filter((inst) => slugifyClassType(inst.type) === selectedSlug && inst.date === activeDate.dateStr);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - 300 : scrollLeft + 300;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  const goToToday = () => {
    setSelectedDayIdx(0);
    scrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
  };

  const previewCancellation = (reservation: any) => {
    const start = new Date(`${reservation.date}T${String(reservation.start_time).slice(0, 5)}:00`);
    const now = new Date();
    const diffHours = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
    const isLate = diffHours < publicSettings.cancellation_limit_hours;
    setCancelPreview({
      reservationId: reservation.id,
      isLate,
      limitHours: publicSettings.cancellation_limit_hours
    });
  };

  const confirmCancellation = async () => {
    if (!cancelPreview?.reservationId) return;
    setCancelingReservationId(cancelPreview.reservationId);
    try {
      await api.cancelReservation(cancelPreview.reservationId);
      if (user?.id) {
        const updatedProfile = await api.getProfile(user.id);
        if (updatedProfile && !updatedProfile.error) {
          onUserProfileUpdate?.(updatedProfile);
        }
      }
      await reloadStudentDashboard();
      setCancelPreview(null);
    } finally {
      setCancelingReservationId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {cancelPreview && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-zinc-900/80"
            onClick={() => setCancelPreview(null)}
          />
          <div className="relative z-10 w-full max-w-xl bg-white rounded-3xl p-8 shadow-2xl">
            <div className={`w-14 h-14 rounded-2xl mb-5 flex items-center justify-center ${cancelPreview.isLate ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
              <i className={`fas ${cancelPreview.isLate ? 'fa-triangle-exclamation' : 'fa-circle-check'} text-xl`}></i>
            </div>
            <h4 className="text-3xl font-bebas tracking-tight uppercase italic text-zinc-900">
              {cancelPreview.isLate ? 'Cancelación tardía' : 'Cancelación sin penalización'}
            </h4>
            <p className="mt-3 text-sm text-zinc-600">
              {cancelPreview.isLate
                ? `Estás cancelando con menos de ${cancelPreview.limitHours} horas de anticipación. Se libera tu lugar, pero pierdes el crédito.`
                : `Estás dentro del límite de ${cancelPreview.limitHours} horas o más. Tu crédito será devuelto.`}
            </p>
            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => setCancelPreview(null)}
                className="flex-1 py-3 rounded-xl bg-zinc-100 text-zinc-700 text-[10px] font-black uppercase tracking-widest"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={cancelingReservationId === cancelPreview.reservationId}
                onClick={confirmCancellation}
                className="flex-1 py-3 rounded-xl bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-brand transition-all disabled:opacity-60"
              >
                {cancelingReservationId === cancelPreview.reservationId ? 'Cancelando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-100 pb-10">
        <div className="flex items-center space-x-8">
          <button
            onClick={() => navigate('/')}
            className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400 hover:text-brand hover:bg-white border border-transparent hover:border-zinc-100 transition-all shadow-sm group"
          >
            <i className="fas fa-chevron-left group-hover:-translate-x-1 transition-transform"></i>
          </button>
          <div>
            <nav className="flex items-center space-x-2 mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
              <Link to="/" className="hover:text-brand transition-colors">Clases</Link>
              <span>/</span>
              <span className="text-brand">Horarios</span>
            </nav>
            <h2 className="text-6xl font-bebas text-zinc-900 leading-none tracking-tight">{decodedService}</h2>
          </div>
        </div>

        <button
          onClick={goToToday}
          className="flex items-center space-x-3 bg-zinc-900 px-6 py-3 rounded-2xl group hover:bg-brand transition-all shadow-xl shadow-zinc-200"
        >
          <div className="w-2 h-2 bg-brand group-hover:bg-white rounded-full animate-pulse"></div>
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Regresar a Hoy</span>
        </button>
      </div>

      {isStudent && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-3xl p-6 text-white shadow-xl">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-300">Mi Paquete</p>
            {dashboard?.activeSubscription ? (
              <>
                <h3 className="mt-3 text-3xl font-bebas tracking-wide uppercase italic">{dashboard.activeSubscription.package_name || 'Paquete activo'}</h3>
                <div className="mt-4 flex flex-wrap items-center gap-6">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-400">Créditos</p>
                    <p className="text-3xl font-bebas">{dashboard.activeSubscription.clases_restantes} / {dashboard.activeSubscription.clases_totales}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-400">Vence</p>
                    <p className="text-lg font-bold">
                      {new Date(dashboard.activeSubscription.fecha_vencimiento).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-zinc-300">No tienes un paquete activo en este momento.</p>
            )}
          </div>

          <div className="bg-white border border-zinc-100 rounded-3xl p-6">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400">Beneficiarios</p>
            {(dashboard?.beneficiaries?.length || 0) > 1 ? (
              <div className="mt-4 space-y-2">
                {dashboard?.beneficiaries?.filter((b) => !b.es_titular).map((b) => (
                  <div key={b.alumno_id} className="px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-100 text-sm font-semibold text-zinc-800">
                    {b.full_name}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-zinc-400">No compartes paquete actualmente.</p>
            )}
          </div>
        </div>
      )}

      {isStudent && (
        <div className="bg-white border border-zinc-100 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bebas tracking-wide uppercase italic text-zinc-900">Proximas Reservas</h3>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
              {(dashboard?.upcomingReservations || []).length} reservadas
            </span>
          </div>
          {(dashboard?.upcomingReservations || []).length > 0 ? (
            <div className="space-y-3">
              {dashboard?.upcomingReservations?.map((r) => {
                const meta = classTypesByName[r.type];
                const image = r.image_url || meta?.image_url || '';
                const colorClass = colorThemeClass(meta?.color_theme || r.color_theme || '');
                const icon = meta?.icon || r.icon || 'fa-dumbbell';
                return (
                  <div key={r.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 rounded-2xl border border-zinc-100 bg-zinc-50/60">
                    <div className="flex items-center gap-3">
                      {image ? (
                        <img src={image} alt={r.type} className="w-16 h-16 rounded-xl object-cover border border-zinc-100" />
                      ) : (
                        <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${colorClass}`}>
                          <i className={`fas ${icon}`}></i>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-black uppercase tracking-tight text-zinc-900">{r.type}</p>
                        <p className="text-[11px] text-zinc-500 font-semibold">
                          {new Date(`${r.date}T00:00:00`).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })} | {String(r.start_time).slice(0, 5)} - {String(r.end_time).slice(0, 5)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => previewCancellation(r)}
                      className="px-5 py-3 rounded-xl bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all"
                    >
                      Cancelar Reserva
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center rounded-2xl border border-dashed border-zinc-200">
                  <p className="text-sm text-zinc-400">No tienes clases reservadas para los próximos días.</p>
            </div>
          )}
        </div>
      )}

      <div className="relative group">
        <div className="flex items-center justify-between mb-4 px-2">
          <span className="text-[11px] font-black text-zinc-900 uppercase tracking-[0.4em]">
            {activeDate.fullMonth} <span className="text-zinc-300 ml-2">{activeDate.year}</span>
          </span>
          <div className="flex space-x-2">
            <button onClick={() => scroll('left')} className="w-8 h-8 rounded-full border border-zinc-100 flex items-center justify-center text-zinc-400 hover:bg-zinc-50 transition-all">
              <i className="fas fa-chevron-left text-[10px]"></i>
            </button>
            <button onClick={() => scroll('right')} className="w-8 h-8 rounded-full border border-zinc-100 flex items-center justify-center text-zinc-400 hover:bg-zinc-50 transition-all">
              <i className="fas fa-chevron-right text-[10px]"></i>
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex items-center space-x-4 overflow-x-auto hide-scrollbar pb-8 pt-2 px-2">
          {dates.map((d, idx) => {
            const hasClasses = instances.some((i) => i.date === d.dateStr && slugifyClassType(i.type) === selectedSlug);
            const isSelected = selectedDayIdx === idx;
            const showMonthDivider = idx > 0 && dates[idx].month !== dates[idx - 1].month;

            return (
              <React.Fragment key={d.dateStr}>
                {showMonthDivider && (
                  <div className="flex-shrink-0 flex items-center h-20 px-4">
                    <div className="h-8 w-px bg-zinc-100"></div>
                  </div>
                )}
                <button
                  onClick={() => setSelectedDayIdx(idx)}
                  className={`flex-shrink-0 w-20 py-6 rounded-[2rem] flex flex-col items-center transition-all duration-500 relative ${
                    isSelected ? 'bg-zinc-900 text-white shadow-2xl shadow-zinc-400 -translate-y-2' : 'bg-white border border-zinc-100 text-zinc-400 hover:border-zinc-300 hover:text-zinc-600'
                  }`}
                >
                  <span className={`text-[8px] font-black uppercase tracking-widest mb-1 opacity-60 ${isSelected ? 'text-brand' : ''}`}>{d.month}</span>
                  <span className="text-3xl font-bebas leading-none">{d.dayNum}</span>
                  <span className="text-[9px] font-bold uppercase mt-1.5">{d.dayName}</span>
                  {hasClasses && <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full transition-colors ${isSelected ? 'bg-brand shadow-sm shadow-cyan-400' : 'bg-zinc-200'}`}></div>}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Sesiones para el {activeDate.dayNum} de {activeDate.fullMonth}</h3>
          <div className="h-px bg-zinc-100 flex-grow ml-6"></div>
        </div>

        {activeClasses.sort((a, b) => a.startTime.localeCompare(b.startTime)).map((inst) => {
          const occupied = availability[inst.id] || 0;
          const isFull = occupied >= inst.capacity;
          const now = new Date();
          const classStart = new Date(`${inst.date}T${inst.startTime}`);
          const classEnd = new Date(`${inst.date}T${inst.endTime}`);
          const isInProgress = now >= classStart && now < classEnd;
          const isFinished = now >= classEnd;
          const canReserve = !isFull && !isInProgress && !isFinished;
          const meta = classTypesByName[inst.type];
          const cardImage = meta?.image_url || inst.imageUrl || '';
          const icon = meta?.icon || 'fa-dumbbell';

          return (
            <div
              key={inst.id}
              className={`bg-white border rounded-[2.5rem] p-8 flex flex-col sm:flex-row items-center justify-between gap-8 transition-all duration-500 ${
                isFull || isFinished ? 'border-zinc-100 opacity-60' : isInProgress ? 'border-amber-200 bg-amber-50/30' : 'border-zinc-100 hover:border-brand/30 hover:shadow-2xl hover:shadow-cyan-900/5'
              }`}
            >
              {cardImage ? (
                <img src={cardImage} alt={inst.type} className="w-full sm:w-40 h-28 object-cover rounded-2xl border border-zinc-100" />
              ) : (
                <div className="w-full sm:w-40 h-28 rounded-2xl border border-zinc-100 bg-zinc-50 flex items-center justify-center text-zinc-300">
                  <i className={`fas ${icon} text-2xl`}></i>
                </div>
              )}

              <div className="flex items-center space-x-10 w-full sm:w-auto">
                <div className="relative">
                  <div className={`text-center rounded-2xl p-4 min-w-[100px] border ${isInProgress ? 'bg-amber-100 border-amber-200' : isFinished ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-50 border-zinc-100/50'}`}>
                    <span className={`block text-4xl font-bebas leading-none mb-1 ${isInProgress ? 'text-amber-700' : isFinished ? 'text-zinc-500' : 'text-zinc-900'}`}>{inst.startTime}</span>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${isInProgress ? 'text-amber-600' : isFinished ? 'text-zinc-400' : 'text-brand'}`}>
                      {isInProgress ? 'EN CURSO' : isFinished ? 'TERMINADA' : 'Inicia'}
                    </span>
                  </div>
                  {canReserve && <div className="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full border-4 border-white"></div>}
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-black text-zinc-900 uppercase tracking-tight">Duración: 60 MIN</p>
                  <div className="flex items-center text-zinc-400">
                    <i className="fas fa-map-marker-alt text-[10px] mr-2"></i>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Focus Main Studio</span>
                  </div>
                  <div className="mt-3">
                    <ClassStatusBadge classDate={inst.date} startTime={inst.startTime} endTime={inst.endTime} compact={true} />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between w-full sm:w-auto sm:space-x-12 border-t sm:border-t-0 border-zinc-50 pt-6 sm:pt-0">
                <div className="text-left sm:text-right">
                  <div className="flex items-center sm:justify-end space-x-2 mb-1">
                    <span className={`text-xl font-bebas ${isFull ? 'text-red-500' : isFinished ? 'text-zinc-400' : 'text-zinc-900'}`}>{inst.capacity - occupied}</span>
                    <span className="text-[10px] font-black text-zinc-300 uppercase">/ {inst.capacity}</span>
                  </div>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Cupos Disponibles</span>
                </div>

                {canReserve ? (
                  <Link to={`/book/${inst.id}`} className="px-10 py-5 bg-zinc-900 text-white rounded-2xl font-bold text-[10px] tracking-widest uppercase hover:bg-brand transition-all shadow-xl shadow-zinc-200 active:scale-95 group flex items-center">
                    <span>Apartar Lugar</span>
                    <i className="fas fa-arrow-right ml-3 text-[8px] group-hover:translate-x-1 transition-transform"></i>
                  </Link>
                ) : isFinished ? (
                  <div className="px-10 py-5 bg-zinc-100 text-zinc-400 rounded-2xl font-bold text-[10px] tracking-widest uppercase border border-zinc-200 cursor-not-allowed italic">Clase Terminada</div>
                ) : isInProgress ? (
                  <div className="px-10 py-5 bg-amber-100 text-amber-700 rounded-2xl font-bold text-[10px] tracking-widest uppercase border border-amber-200 cursor-not-allowed">En Curso</div>
                ) : (
                  <div className="px-10 py-5 bg-zinc-50 text-zinc-300 rounded-2xl font-bold text-[10px] tracking-widest uppercase border border-zinc-100 cursor-not-allowed italic">Sesión Agotada</div>
                )}
              </div>
            </div>
          );
        })}

        {activeClasses.length === 0 && (
          <div className="py-24 text-center bg-zinc-50/50 rounded-[4rem] border border-dashed border-zinc-200 group hover:border-brand/30 transition-colors">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm group-hover:scale-110 transition-transform duration-500">
              <i className="fas fa-calendar-day text-zinc-100 text-4xl"></i>
            </div>
            <h4 className="text-xl font-bebas text-zinc-400 mb-2 tracking-wide uppercase">Día sin sesiones</h4>
            <p className="text-zinc-400 font-bold uppercase text-[9px] tracking-widest max-w-xs mx-auto leading-relaxed">
              No hay horarios para el <span className="text-zinc-900">{activeDate.dayNum} de {activeDate.fullMonth}</span>. Por favor intenta otra fecha arriba.
            </p>
          </div>
        )}
      </div>

      <div className="bg-zinc-900 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10 space-y-2">
          <h5 className="text-brand font-bebas text-2xl tracking-wide uppercase">Política de Respeto</h5>
          <p className="text-zinc-400 text-xs font-medium max-w-md">
            Recuerda cancelar con al menos <span className="text-white font-bold underline decoration-brand underline-offset-4">{publicSettings.cancellation_limit_hours} horas de anticipación</span> para evitar penalización de crédito.
          </p>
        </div>
        <div className="relative z-10 w-16 h-16 rounded-2xl border border-zinc-800 flex items-center justify-center text-zinc-700">
          <i className="fas fa-clock text-xl"></i>
        </div>
      </div>
    </div>
  );
};
