import React from 'react';
import { calculateCancellationDeadline, formatCancellationDeadline, CancellationPolicySettings } from '../lib/cancellationPolicy.ts';

type ReservationLike = {
  id?: string;
  reservation_id?: string;
  type: string;
  date: string;
  start_time: string;
  end_time?: string;
};

interface ReservationCancellationModalProps {
  isOpen: boolean;
  reservation: ReservationLike | null;
  settings: CancellationPolicySettings;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: (reservationId: string) => Promise<void> | void;
}

export const ReservationCancellationModal: React.FC<ReservationCancellationModalProps> = ({
  isOpen,
  reservation,
  settings,
  isSubmitting = false,
  onClose,
  onConfirm
}) => {
  if (!isOpen || !reservation) return null;

  const reservationId = String(reservation.reservation_id || reservation.id || '');
  const deadline = calculateCancellationDeadline(
    reservation.date,
    String(reservation.start_time || '').slice(0, 5),
    settings
  );
  const deadlineLabel = formatCancellationDeadline(deadline);
  const isLate = Date.now() > deadline.getTime();

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/80"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-zinc-100">
        <div className={`w-14 h-14 rounded-2xl mb-5 flex items-center justify-center ${isLate ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
          <i className={`fas ${isLate ? 'fa-triangle-exclamation' : 'fa-circle-check'} text-xl`}></i>
        </div>

        <h4 className="text-3xl font-bebas tracking-tight uppercase italic text-zinc-900">
          {isLate ? 'Cancelación tardía' : 'Confirmar cancelación'}
        </h4>

        <div className="mt-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 text-sm text-zinc-600 space-y-1">
          <p><span className="font-black text-zinc-900">Clase:</span> {reservation.type}</p>
          <p><span className="font-black text-zinc-900">Fecha:</span> {new Date(`${reservation.date}T00:00:00`).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          <p><span className="font-black text-zinc-900">Horario:</span> {String(reservation.start_time).slice(0, 5)}{reservation.end_time ? ` - ${String(reservation.end_time).slice(0, 5)}` : ''}</p>
        </div>

        <p className="mt-4 text-sm text-zinc-600">
          {isLate
            ? `Estás cancelando después del límite (${deadlineLabel}). Se libera tu lugar, pero perderás este crédito.`
            : `Puedes cancelar hasta ${deadlineLabel}. Estás dentro del límite y tu crédito será devuelto.`}
        </p>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-zinc-100 text-zinc-700 text-[10px] font-black uppercase tracking-widest"
          >
            Volver
          </button>
          <button
            type="button"
            disabled={!reservationId || isSubmitting}
            onClick={() => onConfirm(reservationId)}
            className="flex-1 py-3 rounded-xl bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-brand transition-all disabled:opacity-60"
          >
            {isSubmitting ? 'Cancelando...' : 'Confirmar cancelación'}
          </button>
        </div>
      </div>
    </div>
  );
};

