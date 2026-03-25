import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClassCategory } from '../types';
import { slugifyClassType } from '../lib/routeHelpers.ts';
import { api } from '../lib/api.ts';

const fallbackImages = [
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1581009146145-b5ef03a94e78?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1517963879430-6099bc181741?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1571731956672-f2b94d7dd0cb?auto=format&fit=crop&q=80&w=800'
];

export const ServiceSelector: React.FC = () => {
  const [categories, setCategories] = useState<ClassCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCategories = async () => {
      setLoading(true);
      try {
        const rows = await api.getClassTypes();
        setCategories(Array.isArray(rows) ? rows : []);
      } finally {
        setLoading(false);
      }
    };
    loadCategories();
  }, []);

  return (
    <div className="py-12 sm:py-16 md:py-24 bg-white animate-in fade-in duration-1000">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16 space-y-4">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bebas tracking-tighter text-zinc-900 leading-none">
            NUESTRAS <span className="text-brand">CLASES</span>
          </h1>
          <p className="text-zinc-400 font-medium text-sm sm:text-base lg:text-lg leading-relaxed px-4">
            Selecciona el tipo de entrenamiento que buscas hoy.
            Todas nuestras sesiones son semi-personalizadas con coach experto.
          </p>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <i className="fas fa-circle-notch text-3xl text-brand animate-spin"></i>
            <p className="text-zinc-400 text-xs font-black uppercase tracking-[0.3em] mt-4">Cargando categorias</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-zinc-200 rounded-3xl">
            <p className="text-zinc-500 font-bold">No hay tipos de entrenamiento activos.</p>
          </div>
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
