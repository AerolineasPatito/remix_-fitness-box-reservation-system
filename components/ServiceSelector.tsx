import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ClassCategory } from '../types';
import { slugifyClassType } from '../lib/routeHelpers.ts';
import { Profile } from '../types.ts';
import { HomeCalendar } from './HomeCalendar.tsx';
import { useAppData } from '../contexts/AppDataContext.tsx';
import { Button, Card, EmptyState, LoadingState } from './ui/index.ts';

const fallbackImages = [
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1581009146145-b5ef03a94e78?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1517963879430-6099bc181741?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1571731956672-f2b94d7dd0cb?auto=format&fit=crop&q=80&w=800'
];

interface ServiceSelectorProps {
  user: Profile;
  onRefreshData?: () => Promise<void> | void;
}

export const ServiceSelector: React.FC<ServiceSelectorProps> = ({ user, onRefreshData }) => {
  const location = useLocation();
  const { classTypes, classTypesLoading, highlights, highlightsLoading } = useAppData();
  const showHomeCalendar = location.pathname === '/';
  const categories = (classTypes || []) as ClassCategory[];
  const activeHighlights = Array.isArray(highlights) ? highlights : [];
  const [highlightIndex, setHighlightIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const touchStartXRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (highlightIndex >= activeHighlights.length) {
      setHighlightIndex(0);
    }
  }, [activeHighlights.length, highlightIndex]);

  React.useEffect(() => {
    if (paused || activeHighlights.length <= 1) return;
    const timer = window.setInterval(() => {
      setHighlightIndex((prev) => (prev + 1) % activeHighlights.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [activeHighlights.length, paused]);

  const goToHighlight = (nextIndex: number) => {
    if (!activeHighlights.length) return;
    const total = activeHighlights.length;
    const normalized = ((nextIndex % total) + total) % total;
    setHighlightIndex(normalized);
  };

  const currentHighlight = activeHighlights[highlightIndex] as any;

  const renderHighlightCta = (item: any) => {
    const label = String(item?.cta_label || '').trim() || 'Ver mas';
    const url = String(item?.cta_url || '').trim();
    const buttonClass =
      'inline-flex w-full md:w-auto items-center justify-center px-5 py-3 min-h-[44px] rounded-xl bg-brand text-white text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all';
    if (!url) return <span className={buttonClass}>{label}</span>;
    if (url.startsWith('/')) {
      return (
        <Link to={url} className={buttonClass}>
          {label}
        </Link>
      );
    }
    return (
      <a href={url} target="_blank" rel="noreferrer" className={buttonClass}>
        {label}
      </a>
    );
  };

  return (
    <div className="py-12 sm:py-16 md:py-24 bg-white animate-in fade-in duration-1000">
      <div className="container mx-auto px-4">
        {highlightsLoading ? (
          <Card className="rounded-3xl border border-zinc-200 bg-zinc-50 p-6 mb-8 text-center">
            <LoadingState title="Cargando destacados" icon="fa-star" />
          </Card>
        ) : activeHighlights.length > 0 ? (
          <section className="mb-8 max-w-6xl mx-auto">
            <div className="mb-3 px-1">
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-600">Evento / promocion</p>
            </div>
            <Card className="rounded-3xl border border-zinc-200 bg-white shadow-sm overflow-hidden p-0">
            <div
              className="relative overflow-hidden select-none"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onTouchStart={(e) => {
              setPaused(true);
              touchStartXRef.current = e.touches?.[0]?.clientX ?? null;
            }}
            onTouchEnd={(e) => {
              const startX = touchStartXRef.current;
              const endX = e.changedTouches?.[0]?.clientX ?? null;
              touchStartXRef.current = null;
              if (startX == null || endX == null) {
                setPaused(false);
                return;
              }
              const delta = endX - startX;
              if (Math.abs(delta) >= 40) {
                if (delta < 0) goToHighlight(highlightIndex + 1);
                if (delta > 0) goToHighlight(highlightIndex - 1);
              }
              setPaused(false);
            }}
          >
            <div className="relative min-h-[300px] sm:min-h-[380px] md:min-h-[500px] lg:min-h-[560px]">
              {currentHighlight?.image_url ? (
                <>
                  <img
                    src={String(currentHighlight.image_url)}
                    alt={String(currentHighlight.title || 'Highlight')}
                    className="absolute inset-0 h-full w-full object-cover blur-md scale-110 opacity-40"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/25 via-zinc-900/10 to-zinc-950/30" />
                  <div className="relative z-10 h-full w-full flex items-center justify-center p-3 sm:p-5 md:p-7">
                    <img
                      src={String(currentHighlight.image_url)}
                      alt={String(currentHighlight.title || 'Poster')}
                      className="h-full max-h-[100%] w-auto max-w-full object-contain rounded-2xl border border-white/15 shadow-2xl"
                    />
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-700" />
              )}
            </div>

            <div className="absolute top-1/2 -translate-y-1/2 left-2 sm:left-3 md:left-4 right-2 sm:right-3 md:right-4 flex items-center justify-between z-20 pointer-events-none">
              <Button
                type="button"
                onClick={() => goToHighlight(highlightIndex - 1)}
                variant="ghost"
                size="sm"
                className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 min-h-[44px] rounded-full bg-zinc-900/75 text-white border border-white/25 shadow-lg backdrop-blur-sm pointer-events-auto hover:bg-zinc-900/90 transition-all px-0"
                aria-label="Anterior"
              >
                <i className="fas fa-chevron-left text-sm"></i>
              </Button>
              <Button
                type="button"
                onClick={() => goToHighlight(highlightIndex + 1)}
                variant="ghost"
                size="sm"
                className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 min-h-[44px] rounded-full bg-zinc-900/75 text-white border border-white/25 shadow-lg backdrop-blur-sm pointer-events-auto hover:bg-zinc-900/90 transition-all px-0"
                aria-label="Siguiente"
              >
                <i className="fas fa-chevron-right text-sm"></i>
              </Button>
            </div>

            </div>
            <div className="border-t border-zinc-200 bg-white p-4 sm:p-5 md:p-6">
              <div className="mb-2 sm:mb-3 flex items-center justify-center gap-2">
                {activeHighlights.map((_: any, idx: number) => (
                  <button
                    key={`highlight_dot_${idx}`}
                    type="button"
                    onClick={() => goToHighlight(idx)}
                    className="h-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label={`Ir al slide ${idx + 1}`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${idx === highlightIndex ? 'bg-zinc-900' : 'bg-zinc-300'}`} />
                  </button>
                ))}
              </div>
              <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center gap-3 sm:gap-4 md:gap-6">
                <div className="flex-1 min-w-0 space-y-2">
                  <h2 className="text-xl sm:text-3xl font-bebas uppercase leading-none tracking-tight text-zinc-900 break-words">
                    {String(currentHighlight?.title || '')}
                  </h2>
                  {String(currentHighlight?.subtitle || '').trim() && (
                    <p className="text-sm sm:text-base text-zinc-600 break-words leading-relaxed">
                      {String(currentHighlight?.subtitle || '')}
                    </p>
                  )}
                </div>
                <div className="md:shrink-0 w-full md:w-auto">
                  {renderHighlightCta(currentHighlight)}
                </div>
              </div>
            </div>
            </Card>
          </section>
        ) : null}

        <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16 space-y-4">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bebas tracking-tighter text-zinc-900 leading-none">
            NUESTRAS <span className="text-brand">CLASES</span>
          </h1>
          <p className="text-zinc-400 font-medium text-sm sm:text-base lg:text-lg leading-relaxed px-4">
            Selecciona el tipo de entrenamiento que buscas hoy.
            Todas nuestras sesiones son semi-personalizadas con coach experto.
          </p>
        </div>

        {showHomeCalendar && <HomeCalendar user={user} onRefreshData={onRefreshData} />}

        <div className="mt-12 sm:mt-14">
          <div className="max-w-3xl mx-auto text-center mb-8 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-bebas tracking-tighter text-zinc-900 leading-none">
              TIPOS DE <span className="text-brand">ENTRENAMIENTO</span>
            </h2>
            <p className="text-zinc-400 font-medium text-sm sm:text-base leading-relaxed px-4">
              Tambien puedes navegar por categoria para ir directo a tu disciplina.
            </p>
          </div>
        </div>

        {classTypesLoading ? (
          <LoadingState title="Cargando categorias" icon="fa-dumbbell" />
        ) : categories.length === 0 ? (
          <EmptyState title="No hay tipos de entrenamiento activos." icon="fa-layer-group" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            {categories.map((service, index) => {
              const image = service.image_url || fallbackImages[index % fallbackImages.length];
              const duration = service.duration || 60;
              return (
                <Link
                  key={service.id}
                  to={`/schedule/${slugifyClassType(service.name)}`}
                  className="group bg-white border border-zinc-100 rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden flex flex-col cursor-pointer transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-900/5 hover:-translate-y-2"
                >
                  <div className="relative h-40 sm:h-48 overflow-hidden">
                    <img
                      src={image}
                      alt={service.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/60 to-transparent"></div>
                    <div className="absolute bottom-3 sm:bottom-4 left-4 sm:left-6">
                      <i className={`fas ${service.icon || 'fa-dumbbell'} text-white text-lg sm:text-xl`}></i>
                    </div>
                  </div>

                  <div className="p-6 sm:p-8 flex flex-col flex-grow">
                    <h3 className="font-bebas text-xl sm:text-2xl text-zinc-900 mb-3 tracking-wide uppercase">
                      {service.name}
                    </h3>
                    <p className="text-zinc-400 text-[11px] sm:text-xs leading-relaxed mb-6 sm:mb-8 flex-grow">
                      {service.description || 'Entrenamiento guiado para mejorar rendimiento, tecnica y condicion fisica.'}
                    </p>

                    <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-zinc-50">
                      <span className="text-[8px] sm:text-[10px] font-bold text-zinc-300 uppercase tracking-widest">{duration} MINUTOS</span>
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-zinc-100 flex items-center justify-center text-zinc-400 group-hover:bg-brand group-hover:border-brand group-hover:text-white transition-all">
                        <i className="fas fa-chevron-right text-[8px] sm:text-[10px]"></i>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
