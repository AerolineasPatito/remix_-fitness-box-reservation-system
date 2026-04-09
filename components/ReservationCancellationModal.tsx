import React from 'react';
import {
  calculateCancellationDeadline,
  formatCancellationDeadline,
  CancellationPolicySettings,
  DEFAULT_APP_TIMEZONE
} from '../lib/cancellationPolicy.ts';
import { Badge, Button, Card, Modal } from './ui/index.ts';

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
    settings,
    DEFAULT_APP_TIMEZONE
  );
  const deadlineLabel = formatCancellationDeadline(deadline, DEFAULT_APP_TIMEZONE);
  const isLate = Date.now() > deadline.getTime();

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="md"
      title={isLate ? 'Cancelación tardía' : 'Confirmar cancelación'}
      footer={
        <div className="mt-2 flex gap-3">
          <Button type="button" variant="secondary" size="md" fullWidth onClick={onClose}>
            Volver
          </Button>
          <Button
            type="button"
            variant={isLate ? 'danger' : 'primary'}
            size="md"
            fullWidth
            disabled={!reservationId}
            loading={isSubmitting}
            onClick={() => onConfirm(reservationId)}
          >
            {isSubmitting ? 'Cancelando...' : 'Confirmar cancelación'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{
              backgroundColor: isLate
                ? 'color-mix(in srgb, var(--color-warning) 18%, var(--color-surface))'
                : 'color-mix(in srgb, var(--color-success) 18%, var(--color-surface))'
            }}
          >
            <i
              className={`fas ${isLate ? 'fa-triangle-exclamation' : 'fa-circle-check'} text-lg`}
              style={{ color: isLate ? 'var(--color-warning)' : 'var(--color-success)' }}
            ></i>
          </div>
          <Badge variant={isLate ? 'warning' : 'success'} size="md">
            {isLate ? 'Fuera de límite' : 'Dentro de límite'}
          </Badge>
        </div>

        <Card variant="surface" padding="md" className="space-y-1 text-sm" >
          <p><span className="font-black" style={{ color: 'var(--color-neutral-900)' }}>Clase:</span> <span style={{ color: 'var(--color-neutral-700)' }}>{reservation.type}</span></p>
          <p><span className="font-black" style={{ color: 'var(--color-neutral-900)' }}>Fecha:</span> <span style={{ color: 'var(--color-neutral-700)' }}>{new Date(`${reservation.date}T00:00:00`).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</span></p>
          <p><span className="font-black" style={{ color: 'var(--color-neutral-900)' }}>Horario:</span> <span style={{ color: 'var(--color-neutral-700)' }}>{String(reservation.start_time).slice(0, 5)}{reservation.end_time ? ` - ${String(reservation.end_time).slice(0, 5)}` : ''}</span></p>
        </Card>

        <p className="text-sm" style={{ color: 'var(--color-neutral-700)' }}>
          {isLate
            ? `Estás cancelando después del límite (${deadlineLabel}). Se libera tu lugar, pero perderás este crédito.`
            : `Puedes cancelar hasta ${deadlineLabel}. Estás dentro del límite y tu crédito será devuelto.`}
        </p>
      </div>
    </Modal>
  );
};

