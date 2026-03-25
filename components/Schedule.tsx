
import React, { useState, useRef, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ClassInstance, AvailabilityState } from '../types.ts';
import { ClassStatusBadge } from './ClassStatusBadge.tsx';
import { resolveClassTypeFromSlug } from '../lib/routeHelpers.ts';

interface ScheduleProps {
  instances: ClassInstance[];
  availability: AvailabilityState;
}

export const Schedule: React.FC<ScheduleProps> = ({ instances, availability }) => {
  const { serviceType } = useParams<{ serviceType: string }>();
  const navigate = useNavigate();
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const decodedService = resolveClassTypeFromSlug(serviceType || '');

  // GENERACIÓN DINÁMICA DE FECHAS (Rolling Window de 30 días)
  // Esta lógica asegura que el "Día 1" sea siempre HOY, sin importar el año o mes.
  const dates = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0); // Limpiar horas para comparaciones exactas
      d.setDate(d.getDate() + i);
      
      return {
        dateStr: d.toISOString().split('T')[0],
        dayNum: d.getDate(),
        dayName: d.toLocaleString('es-ES', { weekday: 'short' }).toUpperCase(),
        month: d.toLocaleString('es-ES', { month: 'short' }).toUpperCase(),
        year: d.getFullYear(),
        fullMonth: d.toLocaleString('es-ES', { month: 'long' }).toUpperCase()
      };
    });
  }, []); // Solo se calcula al montar el componente

  const activeDate = dates[selectedDayIdx];
  
  // Filtrar clases del coach para el día seleccionado
  const activeClasses = instances.filter(inst => 
    inst.type === decodedService && inst.date === activeDate.dateStr
  );

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - 300 : scrollLeft + 300;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  const goToToday = () => {
    setSelectedDayIdx(0);
    scrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* Header Seccion */}
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

      {/* Date Carousel Rodante */}
      <div className="relative group">
        {/* Indicador de Mes Actual Flotante */}
        <div className="flex items-center justify-between mb-4 px-2">
          <span className="text-[11px] font-black text-zinc-900 uppercase tracking-[0.4em]">
            {activeDate.fullMonth} <span className="text-zinc-300 ml-2">{activeDate.year}</span>
          </span>
          <div className="flex space-x-2">
            <button 
              onClick={() => scroll('left')}
              className="w-8 h-8 rounded-full border border-zinc-100 flex items-center justify-center text-zinc-400 hover:bg-zinc-50 transition-all"
            >
              <i className="fas fa-chevron-left text-[10px]"></i>
            </button>
            <button 
              onClick={() => scroll('right')}
              className="w-8 h-8 rounded-full border border-zinc-100 flex items-center justify-center text-zinc-400 hover:bg-zinc-50 transition-all"
            >
              <i className="fas fa-chevron-right text-[10px]"></i>
            </button>
          </div>
        </div>

        <div 
          ref={scrollRef}
          className="flex items-center space-x-4 overflow-x-auto hide-scrollbar pb-8 pt-2 px-2"
        >
          {dates.map((d, idx) => {
            const hasClasses = instances.some(i => i.date === d.dateStr && i.type === decodedService);
            const isSelected = selectedDayIdx === idx;
            // Mostrar el nombre del mes si es el primer día de ese mes en el carrusel o si el mes cambió respecto al anterior
            const showMonthDivider = idx > 0 && dates[idx].month !== dates[idx-1].month;

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
                    isSelected 
                    ? 'bg-zinc-900 text-white shadow-2xl shadow-zinc-400 -translate-y-2' 
                    : 'bg-white border border-zinc-100 text-zinc-400 hover:border-zinc-300 hover:text-zinc-600'
                  }`}
                >
                  <span className={`text-[8px] font-black uppercase tracking-widest mb-1 opacity-60 ${isSelected ? 'text-brand' : ''}`}>{d.month}</span>
                  <span className="text-3xl font-bebas leading-none">{d.dayNum}</span>
                  <span className="text-[9px] font-bold uppercase mt-1.5">{d.dayName}</span>
                  
                  {hasClasses && (
                    <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full transition-colors ${isSelected ? 'bg-brand shadow-sm shadow-cyan-400' : 'bg-zinc-200'}`}></div>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Slots List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">
            Sesiones para el {activeDate.dayNum} de {activeDate.fullMonth}
          </h3>
          <div className="h-px bg-zinc-100 flex-grow ml-6"></div>
        </div>

        {activeClasses.sort((a,b) => a.startTime.localeCompare(b.startTime)).map(inst => {
          const occupied = availability[inst.id] || 0;
          const isFull = occupied >= inst.capacity;
          
          // Check real-time status
          const now = new Date();
          const classStart = new Date(`${inst.date}T${inst.startTime}`);
          const classEnd = new Date(`${inst.date}T${inst.endTime}`);
          const isInProgress = now >= classStart && now < classEnd;
          const isFinished = now >= classEnd;
          const canReserve = !isFull && !isInProgress && !isFinished;

          return (
            <div 
              key={inst.id}
              className={`bg-white border rounded-[2.5rem] p-8 flex flex-col sm:flex-row items-center justify-between gap-8 transition-all duration-500 ${
                isFull || isFinished
                ? 'border-zinc-100 opacity-60' 
                : isInProgress
                ? 'border-amber-200 bg-amber-50/30'
                : 'border-zinc-100 hover:border-brand/30 hover:shadow-2xl hover:shadow-cyan-900/5'
              }`}
            >
              {inst.imageUrl && (
                <img
                  src={inst.imageUrl}
                  alt={inst.type}
                  className="w-full sm:w-40 h-28 object-cover rounded-2xl border border-zinc-100"
                />
              )}
              <div className="flex items-center space-x-10 w-full sm:w-auto">
                <div className="relative">
                  <div className={`text-center rounded-2xl p-4 min-w-[100px] border ${
                    isInProgress 
                      ? 'bg-amber-100 border-amber-200' 
                      : isFinished 
                      ? 'bg-zinc-100 border-zinc-200'
                      : 'bg-zinc-50 border-zinc-100/50'
                  }`}>
                    <span className={`block text-4xl font-bebas leading-none mb-1 ${
                      isInProgress ? 'text-amber-700' : isFinished ? 'text-zinc-500' : 'text-zinc-900'
                    }`}>{inst.startTime}</span>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${
                      isInProgress ? 'text-amber-600' : isFinished ? 'text-zinc-400' : 'text-brand'
                    }`}>
                      {isInProgress ? 'EN CURSO' : isFinished ? 'TERMINADA' : 'Inicia'}
                    </span>
                  </div>
                  {canReserve && (
                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full border-4 border-white"></div>
                  )}
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-black text-zinc-900 uppercase tracking-tight">Duración: 60 MIN</p>
                  <div className="flex items-center text-zinc-400">
                    <i className="fas fa-map-marker-alt text-[10px] mr-2"></i>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Focus Main Studio</span>
                  </div>
                  
                  {/* Real-time status badge */}
                  <div className="mt-3">
                    <ClassStatusBadge 
                      classDate={inst.date}
                      startTime={inst.startTime}
                      endTime={inst.endTime}
                      compact={true}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between w-full sm:w-auto sm:space-x-12 border-t sm:border-t-0 border-zinc-50 pt-6 sm:pt-0">
                <div className="text-left sm:text-right">
                  <div className="flex items-center sm:justify-end space-x-2 mb-1">
                    <span className={`text-xl font-bebas ${isFull ? 'text-red-500' : isFinished ? 'text-zinc-400' : 'text-zinc-900'}`}>
                      {inst.capacity - occupied}
                    </span>
                    <span className="text-[10px] font-black text-zinc-300 uppercase">/ {inst.capacity}</span>
                  </div>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Cupos Disponibles</span>
                </div>

                {canReserve ? (
                  <Link 
                    to={`/book/${inst.id}`}
                    className="px-10 py-5 bg-zinc-900 text-white rounded-2xl font-bold text-[10px] tracking-widest uppercase hover:bg-brand transition-all shadow-xl shadow-zinc-200 active:scale-95 group flex items-center"
                  >
                    <span>Apartar Lugar</span>
                    <i className="fas fa-arrow-right ml-3 text-[8px] group-hover:translate-x-1 transition-transform"></i>
                  </Link>
                ) : isFinished ? (
                  <div className="px-10 py-5 bg-zinc-100 text-zinc-400 rounded-2xl font-bold text-[10px] tracking-widest uppercase border border-zinc-200 cursor-not-allowed italic">
                    Clase Terminada
                  </div>
                ) : isInProgress ? (
                  <div className="px-10 py-5 bg-amber-100 text-amber-700 rounded-2xl font-bold text-[10px] tracking-widest uppercase border border-amber-200 cursor-not-allowed">
                    En Curso
                  </div>
                ) : (
                  <div className="px-10 py-5 bg-zinc-50 text-zinc-300 rounded-2xl font-bold text-[10px] tracking-widest uppercase border border-zinc-100 cursor-not-allowed italic">
                    Sesión Agotada
                  </div>
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

      {/* Política de Cancelación */}
      <div className="bg-zinc-900 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10 space-y-2">
          <h5 className="text-brand font-bebas text-2xl tracking-wide uppercase">Política de Respeto</h5>
          <p className="text-zinc-400 text-xs font-medium max-w-md">Recuerda cancelar con al menos <span className="text-white font-bold underline decoration-brand underline-offset-4">2 horas de anticipación</span> para permitir que otro atleta ocupe el lugar.</p>
        </div>
        <div className="relative z-10 w-16 h-16 rounded-2xl border border-zinc-800 flex items-center justify-center text-zinc-700">
           <i className="fas fa-clock text-xl"></i>
        </div>
      </div>
    </div>
  );
};
