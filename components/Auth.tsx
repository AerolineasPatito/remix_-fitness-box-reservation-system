import React, { useState, useEffect } from 'react';
import { api, logger } from '../lib/api.ts';
import { Profile } from '../types.ts';
import { ForgotPassword } from './ForgotPassword.tsx';
import { getFriendlyErrorMessage } from '../lib/errorMessages.ts';

interface AuthProps {
  onLogin: (session: any) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  useEffect(() => {
    try {
      const feedback = sessionStorage.getItem('focus_auth_feedback');
      if (feedback) {
        setError(feedback);
        sessionStorage.removeItem('focus_auth_feedback');
      }
    } catch {}
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    logger.log(`Intentando ${isLogin ? 'Login' : 'Registro'} para: ${email}`);

    try {
      if (isLogin) {
        const data = await api.login(email, password);
        if (data.error) throw new Error(data.error);
        const sessionPayload = data?.session || (data?.user ? { user: data.user } : null);
        if (!sessionPayload?.user?.id) {
          throw new Error('Respuesta invalida del servidor al iniciar sesion.');
        }
        localStorage.setItem('focus_session', JSON.stringify(sessionPayload));
        onLogin(sessionPayload);
        window.location.replace('/');
      } else {
        const data = await api.register(email, password, fullName, whatsappPhone);
        if (data.error) throw new Error(data.error);
        
        // Si el registro requiere verificación, mostrar pantalla de éxito
        if (data.requiresVerification) {
          setRegistrationSuccess(true);
          return;
        }
        
        // Si no requiere verificacion (flujo antiguo), continuar normalmente
        const sessionPayload = data?.session || (data?.user ? { user: data.user } : null);
        if (sessionPayload?.user?.id) {
          localStorage.setItem('focus_session', JSON.stringify(sessionPayload));
          onLogin(sessionPayload);
          window.location.replace('/');
        }
      }
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err, 'No pudimos iniciar tu sesión. Intenta de nuevo.'));
    } finally {
      setLoading(false);
    }
  };

  const resetAuth = () => {
    setRegistrationSuccess(false);
    setIsLogin(true);
    setEmail('');
    setPassword('');
    setFullName('');
    setWhatsappPhone('');
    setError(null);
  };

  // Pantalla de Éxito de Registro
  if (registrationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-white overflow-hidden relative">
        <div className="w-full max-w-sm sm:max-w-md text-center space-y-8 sm:space-y-12 animate-in fade-in zoom-in duration-700">
          <div className="relative inline-block">
            <div className="w-32 h-32 sm:w-40 sm:h-40 bg-brand rounded-[2.5rem] sm:rounded-[3.5rem] flex items-center justify-center mx-auto shadow-3xl shadow-cyan-600/30 rotate-12">
              <i className="fas fa-paper-plane text-white text-4xl sm:text-5xl"></i>
            </div>
            <div className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 w-10 h-10 sm:w-12 sm:h-12 bg-zinc-900 rounded-full flex items-center justify-center text-white animate-bounce">
              <i className="fas fa-check text-xs sm:text-sm"></i>
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <h2 className="text-5xl sm:text-6xl lg:text-8xl font-bebas text-zinc-900 tracking-tighter leading-[0.8] uppercase italic">
              ¡PERFIL <br/><span className="text-brand">CREADO!</span>
            </h2>
            <div className="space-y-3 sm:space-y-4">
              <p className="text-zinc-500 text-xs sm:text-sm font-bold uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
                Hemos enviado un enlace de verificación a:
              </p>
              <div className="inline-block px-4 py-2 sm:px-6 sm:py-3 bg-zinc-50 rounded-xl sm:rounded-2xl border border-zinc-100">
                <span className="text-zinc-900 font-black text-[10px] sm:text-xs uppercase tracking-tighter break-all">{email}</span>
              </div>
              <p className="text-zinc-400 text-[8px] sm:text-[10px] font-medium uppercase tracking-[0.3em] max-w-xs mx-auto">
                Revisa tu bandeja de entrada (y spam) para activar tu cuenta de atleta.
              </p>
            </div>
          </div>

          <button 
            onClick={resetAuth}
            className="w-full py-6 sm:py-8 bg-zinc-900 hover:bg-brand text-white font-black rounded-[1.8rem] sm:rounded-[2rem] text-[10px] sm:text-[12px] uppercase tracking-[0.4em] transition-all shadow-xl active:scale-95"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  if (showForgotPassword) {
    return <ForgotPassword onBack={() => setShowForgotPassword(false)} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-white overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-brand/5 rounded-full -mr-24 -mt-24 sm:-mr-48 sm:-mt-48 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-brand/5 rounded-full -ml-24 -mb-24 sm:-ml-48 sm:-mb-48 blur-3xl"></div>

      <div className="w-full max-w-sm sm:max-w-md space-y-8 sm:space-y-12 relative z-10">
        <div className="text-center space-y-3 sm:space-y-4">
          <div className="flex justify-center mb-4">
            <div className="w-48 h-20 sm:w-56 sm:h-24 lg:w-64 lg:h-28 flex items-center justify-center p-1 overflow-hidden">
              <img src="https://res.cloudinary.com/dvf1wagvx/image/upload/v1773890396/Gemini_Generated_Image_3rtis53rtis53rti-Picsart-BackgroundRemover_fdvs9q.png" 
                   alt="Focus Fitness Logo" 
                   className="w-full h-full object-contain" />
            </div>
          </div>
          <h2 className="text-5xl sm:text-6xl lg:text-8xl font-bebas text-zinc-900 tracking-tighter uppercase italic leading-[0.8]">
            {isLogin ? 'BIENVENIDO' : 'ÚNETE AL'} <br/>
            <span className="text-brand">{isLogin ? 'ATLETA' : 'EQUIPO'}</span>
          </h2>
          <p className="text-[8px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-[0.5em]">
            {isLogin ? 'Tu movimiento inicia aquí' : 'Eleva tu rendimiento'}
          </p>
        </div>

        <div className="bg-white border-2 border-zinc-100 p-8 sm:p-12 rounded-[3rem] sm:rounded-[4rem] shadow-2xl shadow-zinc-200/50 space-y-6 sm:space-y-8">
          {error && (
            <div className="space-y-3 sm:space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="bg-rose-50 text-rose-500 p-4 sm:p-6 rounded-2xl sm:rounded-3xl text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-center border border-rose-100">
                {error}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
            {!isLogin && (
              <div className="space-y-2 sm:space-y-3">
                <label className="text-[8px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-2">Nombre Completo</label>
                <input 
                  required
                  type="text"
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-[1.2rem] sm:rounded-[1.5rem] px-6 sm:px-8 py-4 sm:py-5 focus:border-brand focus:bg-white transition-all text-sm outline-none font-bold"
                  placeholder="Nombre completo"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                />
              </div>
            )}

            {!isLogin && (
              <div className="space-y-2 sm:space-y-3">
                <label className="text-[8px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-2">WhatsApp</label>
                <input
                  required
                  type="tel"
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-[1.2rem] sm:rounded-[1.5rem] px-6 sm:px-8 py-4 sm:py-5 focus:border-brand focus:bg-white transition-all text-sm outline-none font-bold"
                  placeholder="+5215512345678"
                  value={whatsappPhone}
                  onChange={e => setWhatsappPhone(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2 sm:space-y-3">
              <label className="text-[8px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-2">Correo electrónico o usuario</label>
              <input 
                required
                type="text"
                className="w-full bg-zinc-50 border border-zinc-100 rounded-[1.2rem] sm:rounded-[1.5rem] px-6 sm:px-8 py-4 sm:py-5 focus:border-brand focus:bg-white transition-all text-sm outline-none font-bold"
                placeholder="atleta@focusfitnessmvt.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2 sm:space-y-3">
              <label className="text-[8px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-2">Contraseña segura</label>
              <input 
                required
                type="password"
                className="w-full bg-zinc-50 border border-zinc-100 rounded-[1.2rem] sm:rounded-[1.5rem] px-6 sm:px-8 py-4 sm:py-5 focus:border-brand focus:bg-white transition-all text-sm outline-none font-bold"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-6 sm:py-8 bg-zinc-900 hover:bg-brand text-white font-black rounded-[1.8rem] sm:rounded-[2rem] text-[10px] sm:text-[12px] uppercase tracking-[0.4em] transition-all shadow-xl active:scale-95 flex items-center justify-center space-x-3 sm:space-x-4"
              aria-label={isLogin ? 'Iniciar sesión en Focus Fitness' : 'Crear nueva cuenta en Focus Fitness'}
            >
              {loading ? <i className="fas fa-circle-notch fa-spin" aria-hidden="true"></i> : (
                <>
                  <span>{isLogin ? 'Acceder al Studio' : 'Crear Perfil Atleta'}</span>
                  <i className="fas fa-arrow-right text-[8px] sm:text-[10px]" aria-hidden="true"></i>
                </>
              )}
            </button>
          </form>

          {/* Forgot Password Link - Only show on login */}
          {isLogin && (
            <div className="text-center">
              <button 
                onClick={() => setShowForgotPassword(true)}
                className="text-[8px] sm:text-[10px] font-black text-brand uppercase tracking-widest hover:underline transition-colors"
                aria-label="Recuperar contraseña olvidada"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}
        </div>

        <div className="text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-[8px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-brand transition-colors border-b border-zinc-100 pb-2"
            aria-label={isLogin ? 'Ir a formulario de registro' : 'Ir a formulario de inicio de sesión'}
          >
            {isLogin ? '¿Aún no eres miembro? Regístrate aquí' : '¿Ya eres parte del equipo? Inicia sesión'}
          </button>
        </div>
      </div>
    </div>
  );
};

