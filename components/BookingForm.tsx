
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ClassInstance, Profile } from '../types.ts';
import { api } from '../lib/api.ts';

interface BookingFormProps {
  user: Profile;
  instances: ClassInstance[];
  onSuccess: (booking: any) => void;
}

export const BookingForm: React.FC<BookingFormProps> = ({ user, instances, onSuccess }) => {
  const { instanceId } = useParams();
  const navigate = useNavigate();
  const inst = instances.find(i => i.id === instanceId);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!inst) return <div className="text-center py-20 uppercase font-black tracking-widest text-zinc-300">Sesión expirada o no encontrada.</div>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Crear reserva en API local
      const resData = await api.createReservation(user.id, inst.id);

      if (resData.error) {
        throw new Error(resData.error);
      }

      // Los créditos ya se descontaron en el servidor, no necesitamos hacerlo aquí
      const bookingPayload = {
        ...resData,
        tipoClase: inst.type,
        fecha: inst.date,
        horaInicio: inst.startTime,
        horaFin: inst.endTime,
        email: user.email
      };

      onSuccess(bookingPayload);
      navigate('/confirmation');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8 sm:gap-16 lg:gap-20 items-start">
        <div className="lg:col-span-2 space-y-8 sm:space-y-10">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400 hover:text-brand transition-all border border-zinc-100 group"
          >
            <i className="fas fa-arrow-left group-hover:-translate-x-1 transition-transform text-sm sm:text-base"></i>
          </button>
          
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-4xl sm:text-6xl lg:text-7xl font-bebas text-zinc-900 leading-[0.8] tracking-tighter uppercase italic">
              CONFIRMA TU <br/> <span className="text-brand">LUGAR</span>
            </h2>
            <p className="text-zinc-500 text-xs sm:text-sm font-medium leading-relaxed max-w-xs uppercase tracking-widest opacity-60">
              Estás a un paso de tu entrenamiento de <span className="text-zinc-900 font-bold">{inst.type}</span>.
            </p>
          </div>
          
          <div className="p-6 sm:p-8 lg:p-10 bg-zinc-900 rounded-[2rem] sm:rounded-[3rem] space-y-4 sm:space-y-6 text-white shadow-2xl shadow-zinc-400">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 sm:pb-4">
              <span className="text-[8px] sm:text-[10px] text-zinc-500 font-black uppercase tracking-widest">Atleta</span>
              <span className="text-xs sm:text-sm font-bold uppercase">{user.full_name}</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3 sm:pb-4">
              <span className="text-[8px] sm:text-[10px] text-zinc-500 font-black uppercase tracking-widest">Día</span>
              <span className="text-xs sm:text-sm font-bold uppercase">{inst.date}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[8px] sm:text-[10px] text-zinc-500 font-black uppercase tracking-widest">Horario</span>
              <span className="text-xs sm:text-sm font-bold uppercase">{inst.startTime} — {inst.endTime}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 bg-white border-2 border-zinc-100 p-6 sm:p-8 lg:p-12 rounded-[3rem] sm:rounded-[4.5rem] shadow-2xl shadow-zinc-200/40 space-y-8 sm:space-y-10">
          <div className="text-center space-y-3 sm:space-y-4">
             <div className="w-12 h-12 sm:w-16 sm:h-16 bg-zinc-50 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto text-brand">
                <i className="fas fa-id-card text-lg sm:text-2xl"></i>
             </div>
             <h3 className="font-bebas text-3xl sm:text-4xl text-zinc-900 tracking-wide uppercase">Resumen de Registro</h3>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-500 p-4 sm:p-6 rounded-2xl sm:rounded-3xl text-[10px] sm:text-xs font-bold uppercase tracking-widest text-center animate-in fade-in">
              {error}
            </div>
          )}

          <div className="space-y-4 sm:space-y-6">
             <div className="bg-zinc-50 p-4 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border border-zinc-100">
                <p className="text-[8px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 sm:mb-2">Email Registrado</p>
                <p className="text-sm sm:text-lg font-bold text-zinc-900 break-all">{user.email}</p>
             </div>
             
             <div className="flex items-center space-x-3 sm:space-x-4 px-3 sm:px-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-brand/10 text-brand flex items-center justify-center font-bebas text-lg sm:text-xl italic">{user.full_name?.charAt(0)}</div>
                <div className="flex-1">
                   <p className="text-sm sm:text-base font-black text-zinc-900 uppercase tracking-tight italic">{user.full_name}</p>
                   <p className="text-[8px] sm:text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{user.role}</p>
                </div>
             </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
             <div className="bg-amber-50 border border-amber-100 p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-2 sm:space-y-3">
                <div className="flex items-center space-x-3">
                   <i className="fas fa-info-circle text-amber-500 text-sm sm:text-base"></i>
                   <p className="text-[8px] sm:text-[10px] font-black text-amber-800 uppercase tracking-widest">Importante</p>
                </div>
                <p className="text-[8px] sm:text-[10px] text-amber-700 leading-relaxed">
                  Al confirmar, se descontará 1 crédito de tu cuenta. Esta acción es irreversible.
                </p>
             </div>

             <button 
               type="submit" 
               disabled={loading}
               className="w-full py-6 sm:py-8 bg-zinc-900 hover:bg-brand text-white font-black rounded-[1.8rem] sm:rounded-[2.5rem] text-[10px] sm:text-[12px] uppercase tracking-[0.4em] transition-all shadow-2xl active:scale-95 flex items-center justify-center space-x-3 sm:space-x-4"
             >
               {loading ? <i className="fas fa-circle-notch fa-spin text-sm sm:text-base"></i> : (
                 <>
                   <span>Confirmar Reserva</span>
                   <i className="fas fa-check text-xs sm:text-sm"></i>
                 </>
               )}
             </button>
          </form>
        </div>
      </div>
    </div>
  );
};
