import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export const PasswordReset: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'success'>('loading');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Password strength calculator
  const calculatePasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 6) strength += 25;
    if (pwd.length >= 10) strength += 25;
    if (/[A-Z]/.test(pwd)) strength += 25;
    if (/[0-9]/.test(pwd)) strength += 25;
    return strength;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordStrength(calculatePasswordStrength(newPassword));
    
    // Clear error when user starts typing
    if (error && newPassword.length >= 6) {
      setError('');
    }
  };

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('invalid');
      setError('Token de restablecimiento no proporcionado');
      return;
    }

    // For simplicity, we'll assume the token is valid for now
    // In production, you might want to validate the token first
    setStatus('valid');
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    
    try {
      const token = searchParams.get('token');
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
      } else {
        setError(data.error || 'Error al restablecer la contraseña');
      }
    } catch (error) {
      setError('Error de conexión. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-white overflow-hidden relative">
        {/* Background Decor */}
        <div className="absolute top-0 right-0 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-brand/5 rounded-full -mr-24 -mt-24 sm:-mr-48 sm:-mt-48 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-brand/5 rounded-full -ml-24 -mb-24 sm:-ml-48 sm:-mb-48 blur-3xl"></div>

        <div className="text-center space-y-8 relative z-10">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-40 h-14 sm:w-48 sm:h-16 flex items-center justify-center p-1 overflow-hidden">
              <img src="https://res.cloudinary.com/dvf1wagvx/image/upload/v1773890396/Gemini_Generated_Image_3rtis53rtis53rti-Picsart-BackgroundRemover_fdvs9q.png" 
                   alt="Focus Fitness Logo" 
                   className="w-full h-full object-contain" />
            </div>
          </div>

          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-[2.5rem] sm:rounded-[3.5rem] bg-brand shadow-3xl shadow-cyan-600/30 flex items-center justify-center mx-auto">
            <i className="fas fa-circle-notch text-white text-4xl sm:text-5xl animate-spin"></i>
          </div>
          <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bebas text-zinc-900 tracking-tighter leading-[0.8] uppercase italic">
            VALIDANDO
          </h2>
          <p className="text-zinc-500 text-xs sm:text-sm font-bold uppercase tracking-widest">
            Verificando tu enlace de restablecimiento...
          </p>
        </div>
      </div>
    );
  }

  if (status === 'invalid') {
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

          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-[2.5rem] sm:rounded-[3.5rem] bg-rose-500 shadow-3xl shadow-rose-600/30 flex items-center justify-center mx-auto">
            <i className="fas fa-times text-white text-4xl sm:text-5xl"></i>
          </div>
          <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bebas text-zinc-900 tracking-tighter leading-[0.8] uppercase italic">
            ENLACE INVÁLIDO
          </h2>
          <p className="text-zinc-400 text-[8px] sm:text-[10px] font-medium uppercase tracking-[0.3em]">
            {error}
          </p>
          <button 
            onClick={() => navigate('/')}
            className="w-full py-6 sm:py-8 bg-zinc-900 hover:bg-brand text-white font-black rounded-[2rem] sm:rounded-[2.5rem] text-[10px] sm:text-[12px] uppercase tracking-[0.4em] transition-all shadow-xl active:scale-95"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  if (status === 'success') {
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

          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-[2.5rem] sm:rounded-[3.5rem] bg-emerald-500 shadow-3xl shadow-emerald-600/30 flex items-center justify-center mx-auto">
            <i className="fas fa-check text-white text-4xl sm:text-5xl"></i>
          </div>
          <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bebas text-zinc-900 tracking-tighter leading-[0.8] uppercase italic">
            ¡LISTO!
          </h2>
          <p className="text-zinc-500 text-xs sm:text-sm font-bold uppercase tracking-widest">
            Tu contraseña ha sido actualizada exitosamente
          </p>
          <button 
            onClick={() => navigate('/')}
            className="w-full py-6 sm:py-8 bg-zinc-900 hover:bg-brand text-white font-black rounded-[2rem] sm:rounded-[2.5rem] text-[10px] sm:text-[12px] uppercase tracking-[0.4em] transition-all shadow-xl active:scale-95 flex items-center justify-center space-x-3 sm:space-x-4"
          >
            <span>Iniciar Sesión</span>
            <i className="fas fa-arrow-right text-[8px] sm:text-[10px]"></i>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6 overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-brand/5 rounded-full -mr-24 -mt-24 sm:-mr-48 sm:-mt-48 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-brand/5 rounded-full -ml-24 -mb-24 sm:-ml-48 sm:-mb-48 blur-3xl"></div>

      <div className="max-w-md mx-auto space-y-8 relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-40 h-14 sm:w-48 sm:h-16 flex items-center justify-center p-1 overflow-hidden">
            <img src="https://res.cloudinary.com/dvf1wagvx/image/upload/v1773890396/Gemini_Generated_Image_3rtis53rtis53rti-Picsart-BackgroundRemover_fdvs9q.png" 
                 alt="Focus Fitness Logo" 
                 className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Header */}
        <div className="text-center space-y-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400 hover:text-brand transition-all border border-zinc-100 group mx-auto"
            aria-label="Volver a página anterior"
          >
            <i className="fas fa-arrow-left group-hover:-translate-x-1 transition-transform text-sm sm:text-base" aria-hidden="true"></i>
          </button>
          
          <h2 className="text-4xl sm:text-5xl lg:text-7xl font-bebas text-zinc-900 tracking-tighter uppercase italic leading-none">
            NUEVA <span className="text-brand">CONTRASEÑA</span>
          </h2>
          <p className="text-zinc-500 text-xs sm:text-sm font-medium leading-relaxed max-w-xs mx-auto uppercase tracking-widest">
            Crea una nueva contraseña segura para tu cuenta
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-500 p-4 sm:p-6 rounded-2xl sm:rounded-3xl text-[10px] sm:text-xs font-bold uppercase tracking-widest text-center animate-in fade-in">
              {error}
            </div>
          )}

          <div className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-[8px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                Nueva Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={handlePasswordChange}
                className="w-full bg-zinc-50 border border-zinc-100 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-sm sm:text-base font-bold text-zinc-900 outline-none focus:border-brand transition-all"
                placeholder="Mínimo 6 caracteres"
                required
                aria-describedby="password-strength"
              />
              
              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2" id="password-strength">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-zinc-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          passwordStrength <= 25 ? 'bg-rose-500' :
                          passwordStrength <= 50 ? 'bg-amber-500' :
                          passwordStrength <= 75 ? 'bg-yellow-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${passwordStrength}%` }}
                      ></div>
                    </div>
                    <span className={`text-[8px] font-bold uppercase ${
                      passwordStrength <= 25 ? 'text-rose-500' :
                      passwordStrength <= 50 ? 'text-amber-500' :
                      passwordStrength <= 75 ? 'text-yellow-500' : 'text-emerald-500'
                    }`}>
                      {passwordStrength <= 25 ? 'Débil' :
                       passwordStrength <= 50 ? 'Regular' :
                       passwordStrength <= 75 ? 'Buena' : 'Fuerte'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[8px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                Confirmar Contraseña
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-100 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-sm sm:text-base font-bold text-zinc-900 outline-none focus:border-brand transition-all"
                placeholder="Repite tu nueva contraseña"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-6 sm:py-8 bg-zinc-900 hover:bg-brand text-white font-black rounded-[2rem] sm:rounded-[2.5rem] text-[10px] sm:text-[12px] uppercase tracking-[0.4em] transition-all shadow-2xl active:scale-95 flex items-center justify-center space-x-3 sm:space-x-4"
          >
            {loading ? (
              <i className="fas fa-circle-notch fa-spin text-sm sm:text-base"></i>
            ) : (
              <>
                <span>Actualizar Contraseña</span>
                <i className="fas fa-lock text-xs sm:text-sm"></i>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
