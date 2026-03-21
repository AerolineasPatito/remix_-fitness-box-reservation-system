import React, { useState } from 'react';

interface ForgotPasswordProps {
  onBack?: () => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack }) => {
  console.log('ForgotPassword component rendering...');
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  console.log('ForgotPassword state:', { email, loading, success, error });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || 'Error al procesar la solicitud');
      }
    } catch (error) {
      setError('Error de conexión. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white p-4 sm:p-6">
        <div className="max-w-md mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-emerald-500 shadow-xl shadow-emerald-600/30 flex items-center justify-center mx-auto">
              <i className="fas fa-envelope text-white text-2xl sm:text-3xl"></i>
            </div>
            
            <h2 className="text-4xl sm:text-5xl lg:text-7xl font-bebas text-zinc-900 tracking-tighter uppercase italic leading-none">
              ¡EMAIL <span className="text-emerald-500">ENVIADO!</span>
            </h2>
            <p className="text-zinc-500 text-xs sm:text-sm font-medium leading-relaxed max-w-xs mx-auto uppercase tracking-widest">
              Hemos enviado instrucciones para restablecer tu contraseña a {email}
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-emerald-50 border border-emerald-100 p-6 sm:p-8 rounded-2xl sm:rounded-3xl space-y-4">
            <div className="flex items-center space-x-3">
              <i className="fas fa-info-circle text-emerald-500 text-lg"></i>
              <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Siguientes Pasos:</p>
            </div>
            <ul className="space-y-2 text-[10px] text-emerald-700 leading-relaxed">
              <li>• Revisa tu bandeja de entrada</li>
              <li>• Busca el email de Focus Fitness</li>
              <li>• Haz clic en el enlace de restablecimiento</li>
              <li>• Crea tu nueva contraseña</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button 
              onClick={onBack || (() => window.location.href = '/')}
              className="w-full py-6 sm:py-8 bg-zinc-900 hover:bg-brand text-white font-black rounded-[2rem] sm:rounded-[2.5rem] text-[10px] sm:text-[12px] uppercase tracking-[0.4em] transition-all shadow-xl active:scale-95 flex items-center justify-center space-x-3 sm:space-x-4"
            >
              <span>Volver al Inicio</span>
              <i className="fas fa-home text-[8px] sm:text-[10px]"></i>
            </button>
            
            <button 
              onClick={() => setSuccess(false)}
              className="w-full py-4 sm:py-6 bg-zinc-100 text-zinc-600 font-black rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] uppercase tracking-widest hover:bg-zinc-200 transition-all"
            >
              Enviar a otro correo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6">
      <div className="max-w-md mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <button 
            onClick={onBack || (() => window.location.href = '/')}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400 hover:text-brand transition-all border border-zinc-100 group mx-auto"
          >
            <i className="fas fa-arrow-left group-hover:-translate-x-1 transition-transform text-sm sm:text-base"></i>
          </button>
          
          <h2 className="text-4xl sm:text-5xl lg:text-7xl font-bebas text-zinc-900 tracking-tighter uppercase italic leading-none">
            ¿OLVIDASTE TU <span className="text-brand">CONTRASEÑA?</span>
          </h2>
          <p className="text-zinc-500 text-xs sm:text-sm font-medium leading-relaxed max-w-xs mx-auto uppercase tracking-widest">
            No te preocupes, te enviaremos un enlace para que la restablezcas
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
                Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-100 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-sm sm:text-base font-bold text-zinc-900 outline-none focus:border-brand transition-all"
                placeholder="tu@email.com"
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
                <span>Enviar Enlace de Restablecimiento</span>
                <i className="fas fa-paper-plane text-xs sm:text-sm"></i>
              </>
            )}
          </button>
        </form>

        {/* Help Text */}
        <div className="text-center space-y-2">
          <p className="text-[8px] sm:text-[10px] text-zinc-400 font-medium uppercase tracking-widest">
            ¿Recordaste tu contraseña?
          </p>
          <button 
            onClick={onBack || (() => window.location.href = '/')}
            className="text-brand text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:underline"
          >
            Volver al Inicio de Sesión
          </button>
        </div>
      </div>
    </div>
  );
};
