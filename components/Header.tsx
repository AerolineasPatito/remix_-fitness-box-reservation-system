import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Profile } from '../types.ts';
import { Badge, Button, Card } from './ui/index.ts';

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
    <header
      className="sticky top-0 z-50 backdrop-blur-xl border-b"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--color-surface) 90%, transparent)',
        borderColor: 'var(--color-neutral-200)'
      }}
    >
      <div className="container mx-auto px-4 h-24 sm:h-32 lg:h-48 flex items-center justify-between">
        <Link to="/" className="flex items-center group">
          <div className="w-40 sm:w-48 lg:w-56 h-10 sm:h-12 lg:h-[50px] flex items-center justify-center mr-4 overflow-hidden">
            <img
              src="https://res.cloudinary.com/dvf1wagvx/image/upload/v1773890396/Gemini_Generated_Image_3rtis53rtis53rti-Picsart-BackgroundRemover_fdvs9q.png"
              alt="Focus Fitness Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] sm:text-[10px] uppercase tracking-[0.4em] font-black" style={{ color: 'var(--color-primary)' }}>
              Movement Studio
            </span>
          </div>
        </Link>

        <div className="hidden lg:flex items-center space-x-10">
          {user.role === 'student' && (
            <Card variant="surface" padding="sm" className="hidden xl:flex items-center px-6 py-2.5 space-x-8">
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: 'var(--color-neutral-400)' }}>
                  Disponibles
                </span>
                <span className="text-sm font-black uppercase tracking-tighter leading-none mt-1" style={{ color: 'var(--color-primary)' }}>
                  {user.credits_remaining} Clases
                </span>
              </div>
              <div className="w-px h-6" style={{ backgroundColor: 'var(--color-neutral-200)' }}></div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: 'var(--color-neutral-400)' }}>
                  Asistencias
                </span>
                <span className="text-sm font-black uppercase tracking-tighter leading-none mt-1" style={{ color: 'var(--color-neutral-900)' }}>
                  {user.total_attended} Totales
                </span>
              </div>
            </Card>
          )}

          <nav className="hidden md:flex items-center space-x-6 lg:space-x-10">
            {isAdmin && (
              <Link
                to="/admin"
                className={`text-[9px] lg:text-[10px] font-black uppercase tracking-widest transition-colors ${
                  location.pathname === '/admin' ? 'text-brand' : 'text-zinc-400 hover:text-brand'
                }`}
              >
                Panel Administrador
              </Link>
            )}
            {(isCoach || isAdmin) && (
              <Link
                to="/coach-panel"
                className={`text-[9px] lg:text-[10px] font-black uppercase tracking-widest transition-colors ${
                  location.pathname === '/coach-panel' ? 'text-brand' : 'text-zinc-400 hover:text-brand'
                }`}
              >
                Panel Coach
              </Link>
            )}

            <div className="flex items-center space-x-3 lg:space-x-4">
              <div className="hidden sm:flex flex-col items-end gap-1">
                <span className="text-[8px] lg:text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--color-neutral-900)' }}>
                  {user.full_name}
                </span>
                <Badge size="sm" variant="neutral">
                  {user.role}
                </Badge>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={onLogout} title="Cerrar sesión">
                <i className="fas fa-sign-out-alt text-xs"></i>
              </Button>
            </div>
          </nav>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="lg:hidden"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          title="Abrir menú"
        >
          <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'} text-lg`}></i>
        </Button>
      </div>

      {mobileMenuOpen && (
        <div
          className="lg:hidden border-t backdrop-blur-xl"
          style={{
            borderColor: 'var(--color-neutral-200)',
            backgroundColor: 'color-mix(in srgb, var(--color-surface) 95%, transparent)'
          }}
        >
          <div className="container mx-auto px-4 py-6 space-y-6">
            {user.role === 'student' && (
              <Card variant="surface" padding="md" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <span className="text-[8px] font-black uppercase tracking-widest block" style={{ color: 'var(--color-neutral-400)' }}>
                      Disponibles
                    </span>
                    <span className="text-lg font-black uppercase tracking-tighter block mt-1" style={{ color: 'var(--color-primary)' }}>
                      {user.credits_remaining}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-[8px] font-black uppercase tracking-widest block" style={{ color: 'var(--color-neutral-400)' }}>
                      Asistencias
                    </span>
                    <span className="text-lg font-black uppercase tracking-tighter block mt-1" style={{ color: 'var(--color-neutral-900)' }}>
                      {user.total_attended}
                    </span>
                  </div>
                </div>
              </Card>
            )}

            <nav className="space-y-3">
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${
                    location.pathname === '/admin' ? 'bg-brand text-white' : 'text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  Panel Administrador
                </Link>
              )}
              {(isCoach || isAdmin) && (
                <Link
                  to="/coach-panel"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${
                    location.pathname === '/coach-panel' ? 'bg-brand text-white' : 'text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  Panel Coach
                </Link>
              )}

              <div className="border-t pt-4" style={{ borderColor: 'var(--color-neutral-200)' }}>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--color-neutral-900)' }}>
                      {user.full_name}
                    </p>
                    <Badge size="sm" variant="neutral">
                      {user.role}
                    </Badge>
                  </div>
                  <Button type="button" variant="danger" size="sm" onClick={onLogout} title="Cerrar sesión">
                    <i className="fas fa-sign-out-alt text-xs"></i>
                  </Button>
                </div>
              </div>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};

