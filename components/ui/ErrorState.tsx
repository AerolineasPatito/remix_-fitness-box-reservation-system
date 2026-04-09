import React from 'react';
import { Button } from './Button.tsx';

export interface ErrorStateProps {
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
  retryLabel?: string;
  compact?: boolean;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Ocurrió un error',
  message,
  details,
  onRetry,
  retryLabel = 'Reintentar',
  compact = false,
  className = ''
}) => (
  <div
    className={`border rounded-2xl ${compact ? 'p-4' : 'p-6'} ${className}`}
    style={{ borderColor: 'color-mix(in srgb, var(--color-danger) 40%, transparent)', backgroundColor: 'color-mix(in srgb, var(--color-danger) 8%, var(--color-surface))' }}
  >
    <div className="flex items-start gap-3">
      <i className="fas fa-triangle-exclamation text-lg mt-0.5" style={{ color: 'var(--color-danger)' }}></i>
      <div className="space-y-1 min-w-0">
        <p className="font-black uppercase tracking-widest text-sm" style={{ color: 'var(--color-neutral-900)' }}>
          {title}
        </p>
        <p className="text-sm" style={{ color: 'var(--color-neutral-700)' }}>
          {message}
        </p>
        {details ? (
          <p className="text-xs" style={{ color: 'var(--color-neutral-500)' }}>
            {details}
          </p>
        ) : null}
        {onRetry ? (
          <div className="pt-2">
            <Button type="button" variant="danger" size="sm" onClick={onRetry}>
              {retryLabel}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  </div>
);

