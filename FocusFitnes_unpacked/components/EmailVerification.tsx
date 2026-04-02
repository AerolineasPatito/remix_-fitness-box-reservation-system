import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export const EmailVerification: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('Token de verificación no proporcionado');
        return;
      }

      try {
        const response = await fetch(`/api/verify-email?token=${token}`);
        const data = await response.json();

        if (data.success) {
          setStatus('success');
          setMessage('¡Tu correo ha sido verificado exitosamente! Ya puedes iniciar sesión.');
        } else {
          setStatus('error');
          setMessage(data.error || 'Error al verificar el correo');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Error de conexión. Por favor intenta nuevamente.');
      }
    };

    verifyEmail();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-white overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-brand/5 rounded-full -mr-24 -mt-24 sm:-mr-48 sm:-mt-48 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-brand/5 rounded-full -ml-24 -mb-24 sm:-ml-48 sm:-mb-48 blur-3xl"></div>

      <div className="w-full max-w-md text-center space-y-8 relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-40 h-14 sm:w-48 sm:h-16 flex items-center justify-center p-1 overflow-hidden">
            <img src="https://res.cloudinary.com/dvf1wagvx/image/upload/v1773890396/Gemini_Generated_Image_3rtis53rtis53rti-Picsart-BackgroundRemover_fdvs9q.png" 
                 alt="Focus Fitness Logo" 
                 className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Icon */}
        <div className="relative inline-block">
          <div className={`w-32 h-32 sm:w-40 sm:h-40 rounded-[2.5rem] sm:rounded-[3.5rem] flex items-center justify-center mx-auto shadow-3xl ${
            status === 'success' 
              ? 'bg-emerald-500 shadow-emerald-600/30' 
              : status === 'error'
              ? 'bg-rose-500 shadow-rose-600/30'
              : 'bg-brand shadow-cyan-600/30'
          }`}>
            {status === 'loading' && <i className="fas fa-circle-notch text-white text-4xl sm:text-5xl animate-spin"></i>}
            {status === 'success' && <i className="fas fa-check text-white text-4xl sm:text-5xl"></i>}
            {status === 'error' && <i className="fas fa-times text-white text-4xl sm:text-5xl"></i>}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 sm:space-y-6">
          <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bebas text-zinc-900 tracking-tighter leading-[0.8] uppercase italic">
            {status === 'loading' && 'VERIFICANDO'}
            {status === 'success' && '¡VERIFICADO!'}
            {status === 'error' && 'ERROR'}
          </h2>
          
          <div className="space-y-3 sm:space-y-4">
            <p className="text-zinc-500 text-xs sm:text-sm font-bold uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
              {status === 'loading' && 'Estamos verificando tu correo electrónico...'}
              {status === 'success' && 'Tu cuenta está lista para usar'}
              {status === 'error' && 'No pudimos verificar tu correo'}
            </p>
            
            <p className="text-zinc-400 text-[8px] sm:text-[10px] font-medium uppercase tracking-[0.3em] max-w-xs mx-auto">
              {message}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          {status === 'success' && (
            <button 
              onClick={() => navigate('/')}
              className="w-full py-6 sm:py-8 bg-zinc-900 hover:bg-brand text-white font-black rounded-[2rem] sm:rounded-[2.5rem] text-[10px] sm:text-[12px] uppercase tracking-[0.4em] transition-all shadow-xl active:scale-95 flex items-center justify-center space-x-3 sm:space-x-4"
            >
              <span>Iniciar Sesión</span>
              <i className="fas fa-arrow-right text-[8px] sm:text-[10px]"></i>
            </button>
          )}
          
          {status === 'error' && (
            <div className="space-y-3">
              <button 
                onClick={() => window.location.reload()}
                className="w-full py-6 sm:py-8 bg-zinc-900 hover:bg-brand text-white font-black rounded-[2rem] sm:rounded-[2.5rem] text-[10px] sm:text-[12px] uppercase tracking-[0.4em] transition-all shadow-xl active:scale-95"
              >
                Reintentar
              </button>
              
              <button 
                onClick={() => navigate('/')}
                className="w-full py-4 sm:py-6 bg-zinc-100 text-zinc-600 font-black rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] uppercase tracking-widest hover:bg-zinc-200 transition-all"
              >
                Volver al Inicio
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
