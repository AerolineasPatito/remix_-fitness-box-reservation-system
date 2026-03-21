
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Profile } from '../types.ts';

interface HeaderProps {
  user: Profile;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  const location = useLocation();
  const isAdmin = user.role === 'admin';
  const isCoach = user.role === 'coach';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-zinc-100">
      <div className="container mx-auto px-4 h-24 sm:h-32 lg:h-48 flex items-center justify-between">
        <Link to="/" className="flex items-center group">
          <div className="w-40 sm:w-48 lg:w-56 h-10 sm:h-12 lg:h-[50px] flex items-center justify-center mr-4 overflow-hidden">
            <img src="https://res.cloudinary.com/dvf1wagvx/image/upload/v1773890396/Gemini_Generated_Image_3rtis53rtis53rti-Picsart-BackgroundRemover_fdvs9q.png" 
                 alt="Focus Fitness Logo" 
                 className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] sm:text-[10px] uppercase tracking-[0.4em] text-brand font-black">Movement Studio</span>
          </div>
        </Link>
        
        {/* Desktop View */}
        <div className="hidden lg:flex items-center space-x-10">
          {/* Status del Alumno */}
          {user.role === 'student' && (
            <div className="hidden xl:flex items-center bg-zinc-50 border border-zinc-100 px-6 py-2.5 rounded-2xl space-x-8">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Disponibles</span>
                <span className="text-sm font-black text-brand uppercase tracking-tighter leading-none mt-1">
                  {user.credits_remaining} Clases
                </span>
              </div>
              <div className="w-px h-6 bg-zinc-200"></div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Asistencias</span>
                <span className="text-sm font-black text-zinc-900 uppercase tracking-tighter leading-none mt-1">
                  {user.total_attended} Totales
                </span>
              </div>
            </div>
          )}

          <nav className="hidden md:flex items-center space-x-6 lg:space-x-10">
            {isAdmin && (
              <Link to="/admin" className={`text-[9px] lg:text-[10px] font-black uppercase tracking-widest transition-colors ${location.pathname === '/admin' ? 'text-brand' : 'text-zinc-400 hover:text-brand'}`}>
                Panel Administrador
              </Link>
            )}
            {(isCoach || isAdmin) && (
              <Link to="/coach-panel" className={`text-[9px] lg:text-[10px] font-black uppercase tracking-widest transition-colors ${location.pathname === '/coach-panel' ? 'text-brand' : 'text-zinc-400 hover:text-brand'}`}>
                Panel Coach
              </Link>
            )}
            
            <div className="flex items-center space-x-3 lg:space-x-4">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[8px] lg:text-[9px] font-black text-zinc-900 uppercase tracking-widest">{user.full_name}</span>
                <span className="text-[7px] lg:text-[8px] font-bold text-zinc-400 uppercase">{user.role}</span>
              </div>
              <button 
                onClick={onLogout}
                className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
                title="Cerrar Sesión"
              >
                <i className="fas fa-sign-out-alt text-xs"></i>
              </button>
            </div>
          </nav>
        </div>

        {/* Mobile Menu Button */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-600 hover:text-brand transition-all"
        >
          <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'} text-lg`}></i>
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-zinc-100 bg-white/95 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-6 space-y-6">
            {/* Mobile Status */}
            {user.role === 'student' && (
              <div className="bg-zinc-50 border border-zinc-100 p-4 rounded-2xl space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block">Disponibles</span>
                    <span className="text-lg font-black text-brand uppercase tracking-tighter block mt-1">
                      {user.credits_remaining}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block">Asistencias</span>
                    <span className="text-lg font-black text-zinc-900 uppercase tracking-tighter block mt-1">
                      {user.total_attended}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Mobile Navigation */}
            <nav className="space-y-3">
              {isAdmin && (
                <Link 
                  to="/admin" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${location.pathname === '/admin' ? 'bg-brand text-white' : 'text-zinc-600 hover:bg-zinc-50'}`}
                >
                  Panel Administrador
                </Link>
              )}
              {(isCoach || isAdmin) && (
                <Link 
                  to="/coach-panel" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${location.pathname === '/coach-panel' ? 'bg-brand text-white' : 'text-zinc-600 hover:bg-zinc-50'}`}
                >
                  Panel Coach
                </Link>
              )}
              
              <div className="border-t border-zinc-100 pt-4">
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-[9px] font-black text-zinc-900 uppercase tracking-widest">{user.full_name}</p>
                    <p className="text-[8px] font-bold text-zinc-400 uppercase">{user.role}</p>
                  </div>
                  <button 
                    onClick={onLogout}
                    className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 hover:bg-rose-100 transition-all"
                  >
                    <i className="fas fa-sign-out-alt text-xs"></i>
                  </button>
                </div>
              </div>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};
