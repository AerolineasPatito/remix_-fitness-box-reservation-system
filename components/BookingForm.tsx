import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ClassInstance, Profile } from '../types.ts';
import { api } from '../lib/api.ts';
import {
  calculateCancellationDeadline,
  formatCancellationDeadline,
  CancellationPolicySettings,
  DEFAULT_APP_TIMEZONE
} from '../lib/cancellationPolicy.ts';
import { useAppData } from '../contexts/AppDataContext.tsx';
import { getFriendlyErrorMessage } from '../lib/errorMessages.ts';

interface BookingFormProps {
  user: Profile;
  instances: ClassInstance[];
  onSuccess: (booking: any) => Promise<void> | void;
}

const buildPolicyLines = (hours: number) => [
  'Política de Cancelación y Reservación',
  '',
  'Para garantizar una experiencia justa para todos nuestros alumnos,',
  'te pedimos tomar en cuenta lo siguiente:',
  '',
  `• Cancelación con tiempo: Puedes cancelar tu clase con al menos ${hours} horas de anticipación sin penalización. Tu crédito será devuelto automáticamente.`,
  '• Cancelación tardía: Si cancelas fuera de ese límite, el crédito de la clase no será reembolsado.',
  '• Puntualidad: Te recomendamos llegar con anticipación. La clase inicia en el horario establecido.',
  '• Capacidad: Las clases tienen un cupo limitado. Tu lugar queda confirmado únicamente al completar la reservación.',
  '• Cancelación por parte del negocio: En caso de que una clase sea cancelada por el coach o por no alcanzar el mínimo de participantes, recibirás una notificación por correo y tu crédito será devuelto en su totalidad.'
];

const buildPolicyLinesV2 = (hours: number, minParticipants: number) => [
  'Política de Cancelación y Reservación',
  '',
  'Para garantizar una experiencia justa para todos nuestros alumnos,',
  'te pedimos tomar en cuenta lo siguiente:',
  '',
  `• Cancelación con tiempo: Puedes cancelar tu clase con al menos ${hours} horas de anticipación sin penalización. Tu crédito será devuelto automáticamente.`,
  '• Cancelación tardía: Si cancelas fuera de ese límite, el crédito de la clase no será reembolsado.',
  '• Puntualidad: Te recomendamos llegar con anticipación. La clase inicia en el horario establecido.',
  '• Capacidad: Las clases tienen un cupo limitado. Tu lugar queda confirmado únicamente al completar la reservación.',
  `• Cancelación por parte del negocio: Si una clase se cancela por no alcanzar el mínimo requerido de ${minParticipants} participante${minParticipants === 1 ? '' : 's'}, recibirás una notificación por correo y tu crédito será devuelto en su totalidad.`
];

const buildEventPolicyLines = (minParticipants: number) => [
  'Política de Evento Gratuito',
  '',
  'Este evento no consume créditos y tu lugar se confirma al completar la reservación.',
  '',
  '• Reserva: Puedes reservar aunque tengas 0 créditos.',
  '• Créditos: No se descuenta ningún crédito al reservar ni al asistir.',
  `• Mínimo requerido: Si no se alcanza el mínimo de ${minParticipants} participante${minParticipants === 1 ? '' : 's'}, el negocio podrá cancelar la clase.`,
  '• Cancelación: Si cancelas tu reserva, no aplica reembolso de créditos porque no hubo cobro.'
];

export const BookingForm: React.FC<BookingFormProps> = ({ user, instances, onSuccess }) => {
  const { instanceId } = useParams();
  const navigate = useNavigate();
  const inst = instances.find((i) => i.id === instanceId);

  const { systemSettings, refreshSettings } = useAppData();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [policySettings, setPolicySettings] = useState<CancellationPolicySettings>({
    cancellation_limit_hours: 8,
    cancellation_cutoff_morning: '08:00',
    cancellation_deadline_evening: '22:00'
  });
  const [policyAccepted, setPolicyAccepted] = useState(Boolean(user.policy_accepted_at));
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [isMandatoryPolicyFlow, setIsMandatoryPolicyFlow] = useState(false);

  useEffect(() => {
    setPolicyAccepted(Boolean(user.policy_accepted_at));
  }, [user.policy_accepted_at]);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  useEffect(() => {
    setPolicySettings({
      cancellation_limit_hours: Number(systemSettings?.cancellation_limit_hours || 8),
      cancellation_cutoff_morning: String(systemSettings?.cancellation_cutoff_morning || '08:00'),
      cancellation_deadline_evening: String(systemSettings?.cancellation_deadline_evening || '22:00')
    });
  }, [systemSettings]);

  const cancellationDeadlineLabel = useMemo(() => {
    if (!inst) return '';
    const deadline = calculateCancellationDeadline(inst.date, inst.startTime, policySettings, DEFAULT_APP_TIMEZONE);
    return formatCancellationDeadline(deadline, DEFAULT_APP_TIMEZONE);
  }, [inst, policySettings]);

  const classMinParticipants = Math.max(1, Number(inst?.min_capacity || 1));
  const isEventClass = Number(inst?.is_event || 0) === 1;
  const policyText = useMemo(
    () =>
      isEventClass
        ? buildEventPolicyLines(classMinParticipants)
        : buildPolicyLinesV2(policySettings.cancellation_limit_hours, classMinParticipants),
    [isEventClass, policySettings.cancellation_limit_hours, classMinParticipants]
  );

  if (!inst) return <div className="text-center py-20 uppercase font-black tracking-widest text-zinc-300">Sesión expirada o no encontrada.</div>;

  const runReservation = async () => {
    const resData = await api.createReservation(user.id, inst.id);
    const resolvedTicketId = String(
      resData?.reservationId ||
        resData?.reservation_id ||
        resData?.ticketId ||
        resData?.ticket_id ||
        resData?.reservation?.id ||
        resData?.id ||
        ''
    ).trim();

    const bookingPayload = {
      ...resData,
      id: resolvedTicketId || String(resData?.id || '').trim(),
      ticketId: resolvedTicketId,
      reservationId: resolvedTicketId || String(resData?.reservationId || '').trim(),
      tipoClase: inst.type,
      fecha: inst.date,
      horaInicio: inst.startTime,
      horaFin: inst.endTime,
      email: user.email,
      reservation: {
        ...(resData?.reservation || {}),
        id: String(resData?.reservation?.id || resolvedTicketId).trim()
      }
    };

    await Promise.resolve(onSuccess(bookingPayload));
    navigate('/confirmation');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!policyAccepted) {
      setIsMandatoryPolicyFlow(true);
      setShowPolicyModal(true);
      return;
    }

    setLoading(true);
    try {
      await runReservation();
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err, 'No pudimos completar tu reserva. Intenta de nuevo.'));
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptPolicyAndContinue = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await api.acceptCancellationPolicy(user.id);
      setPolicyAccepted(true);
      setShowPolicyModal(false);
      setIsMandatoryPolicyFlow(false);
      await runReservation();
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err, 'No pudimos registrar tu aceptación de la política.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6 overflow-x-hidden [&_button]:min-h-[44px] [&_input]:min-h-[44px]">
      {showPolicyModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-zinc-900/70"
            onClick={() => {
              if (isMandatoryPolicyFlow) return;
              setShowPolicyModal(false);
            }}
          />
          <div className="relative z-10 w-full max-w-2xl rounded-3xl bg-white border border-zinc-100 shadow-2xl p-6 sm:p-8">
            <h3 className="text-3xl font-bebas tracking-wide uppercase italic text-zinc-900">
              Política de Cancelación y Reservación
            </h3>
            <p className="mt-3 text-sm font-semibold text-zinc-700">
              Puedes cancelar esta clase hasta el <span className="text-zinc-900">{cancellationDeadlineLabel}</span>.
            </p>
            <div className="mt-5 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 sm:p-5 max-h-[50vh] overflow-y-auto">
              {policyText.map((line, idx) => (
                <p key={idx} className={`text-sm leading-relaxed ${line.startsWith('•') ? 'text-zinc-700' : 'text-zinc-600'} ${line === '' ? 'h-3' : ''}`}>
                  {line}
                </p>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              {isMandatoryPolicyFlow ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPolicyModal(false);
                      setIsMandatoryPolicyFlow(false);
                    }}
                    className="flex-1 py-3 rounded-xl bg-zinc-100 text-zinc-700 text-[10px] font-black uppercase tracking-widest"
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleAcceptPolicyAndContinue}
                    className="flex-1 py-3 rounded-xl bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-brand transition-all disabled:opacity-60"
                  >
                    {loading ? 'Procesando...' : 'Acepto'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowPolicyModal(false)}
                  className="w-full py-3 rounded-xl bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-brand transition-all"
                >
                  Entendido
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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
              CONFIRMA TU <br /> <span className="text-brand">LUGAR</span>
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
            <div className={`${isEventClass ? 'bg-cyan-50 border-cyan-100' : 'bg-amber-50 border-amber-100'} border p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-2 sm:space-y-3`}>
              <div className="flex items-center space-x-3">
                <i className={`fas fa-info-circle text-sm sm:text-base ${isEventClass ? 'text-cyan-600' : 'text-amber-500'}`}></i>
                <p className={`text-[8px] sm:text-[10px] font-black uppercase tracking-widest ${isEventClass ? 'text-cyan-800' : 'text-amber-800'}`}>Importante</p>
              </div>
              {isEventClass ? (
                <p className="text-[8px] sm:text-[10px] text-cyan-700 leading-relaxed">
                  Evento gratuito, no consume créditos.
                </p>
              ) : (
                <p className="text-[8px] sm:text-[10px] text-amber-700 leading-relaxed">
                  Al confirmar, se descontará 1 crédito de tu cuenta. Esta acción es irreversible.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-6 sm:py-8 bg-zinc-900 hover:bg-brand text-white font-black rounded-[1.8rem] sm:rounded-[2.5rem] text-[10px] sm:text-[12px] uppercase tracking-[0.4em] transition-all shadow-2xl active:scale-95 flex items-center justify-center space-x-3 sm:space-x-4 disabled:opacity-60"
            >
              {loading ? <i className="fas fa-circle-notch fa-spin text-sm sm:text-base"></i> : (
                <>
                  <span>Confirmar Reserva</span>
                  <i className="fas fa-check text-xs sm:text-sm"></i>
                </>
              )}
            </button>

            {policyAccepted ? (
              <p className="text-center text-xs text-zinc-500">
                {isEventClass ? (
                  <>Este evento no consume créditos. </>
                ) : (
                  <>
                    Puedes cancelar hasta el <span className="font-black text-zinc-900">{cancellationDeadlineLabel}</span>.{' '}
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsMandatoryPolicyFlow(false);
                    setShowPolicyModal(true);
                  }}
                  className="text-zinc-900 font-bold underline underline-offset-2 hover:text-brand transition-colors"
                >
                  Ver política completa
                </button>
              </p>
            ) : (
              <p className="text-center text-xs text-zinc-500">
                Antes de tu primera reserva te pediremos aceptar la política de cancelación.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
