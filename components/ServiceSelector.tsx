
import React from 'react';
import { Link } from 'react-router-dom';
import { ClassType } from '../types';
import { slugifyClassType } from '../lib/routeHelpers.ts';

const SERVICES = [
  {
    type: ClassType.FUNCTIONAL,
    icon: 'fa-bolt',
    desc: 'Entrenamiento dinámico diseñado para mejorar tus movimientos cotidianos y fuerza funcional.',
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=400',
    color: 'text-brand'
  },
  {
    type: ClassType.SCULPT_STRENGTH,
    icon: 'fa-dumbbell',
    desc: 'Enfocado en tonificar y fortalecer cada grupo muscular con precisión y control.',
    image: 'https://images.unsplash.com/photo-1581009146145-b5ef03a94e78?auto=format&fit=crop&q=80&w=400',
    color: 'text-brand'
  },
  {
    type: ClassType.HIIT_CONDITIONING,
    icon: 'fa-heartbeat',
    desc: 'Alta intensidad para maximizar la quema calórica y mejorar tu resistencia cardiovascular.',
    image: 'https://images.unsplash.com/photo-1517963879430-6099bc181741?auto=format&fit=crop&q=80&w=400',
    color: 'text-brand'
  },
  {
    type: ClassType.FULL_BODY,
    icon: 'fa-user-check',
    desc: 'Un entrenamiento integral que involucra todos los sistemas musculares en una sola sesión.',
    image: 'https://images.unsplash.com/photo-1571731956672-f2b94d7dd0cb?auto=format&fit=crop&q=80&w=400',
    color: 'text-brand'
  }
];

export const ServiceSelector: React.FC = () => {
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
          {SERVICES.map((service) => (
            <Link 
              key={service.type} 
              to={`/schedule/${slugifyClassType(service.type)}`}
              className="group bg-white border border-zinc-100 rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden flex flex-col cursor-pointer transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-900/5 hover:-translate-y-2"
            >
              {/* Image Header */}
              <div className="relative h-40 sm:h-48 overflow-hidden">
                <img 
                  src={service.image} 
                  alt={service.type}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/60 to-transparent"></div>
                <div className="absolute bottom-3 sm:bottom-4 left-4 sm:left-6">
                   <i className={`fas ${service.icon} text-white text-lg sm:text-xl`}></i>
                </div>
              </div>

              <div className="p-6 sm:p-8 flex flex-col flex-grow">
                <h3 className="font-bebas text-xl sm:text-2xl text-zinc-900 mb-3 tracking-wide uppercase">
                  {service.type}
                </h3>
                <p className="text-zinc-400 text-[11px] sm:text-xs leading-relaxed mb-6 sm:mb-8 flex-grow">
                  {service.desc}
                </p>
                
                <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-zinc-50">
                  <span className="text-[8px] sm:text-[10px] font-bold text-zinc-300 uppercase tracking-widest">60 MINUTOS</span>
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-zinc-100 flex items-center justify-center text-zinc-400 group-hover:bg-brand group-hover:border-brand group-hover:text-white transition-all">
                    <i className="fas fa-chevron-right text-[8px] sm:text-[10px]"></i>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
