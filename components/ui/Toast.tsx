import React from 'react';
import { Button } from './Button.tsx';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export interface ToastProps {
  type: ToastType;
  title: string;
  message: string;
  details?: Record<string, any>;
  suggestions?: string[];
  actions?: ToastAction[];
  onClose: () => void;
}

const typeConfig: Record<ToastType, { icon: string; accent: string; subtle: string }> = {
  success: { icon: 'fa-check-circle', accent: 'var(--color-success)', subtle: 'color-mix(in srgb, var(--color-success) 16%, var(--color-surface))' },
  error: { icon: 'fa-triangle-exclamation', accent: 'var(--color-danger)', subtle: 'color-mix(in srgb, var(--color-danger) 16%, var(--color-surface))' },
  warning: { icon: 'fa-circle-exclamation', accent: 'var(--color-warning)', subtle: 'color-mix(in srgb, var(--color-warning) 16%, var(--color-surface))' },
  info: { icon: 'fa-circle-info', accent: 'var(--color-info)', subtle: 'color-mix(in srgb, var(--color-info) 16%, var(--color-surface))' }
};

export const Toast: React.FC<ToastProps> = ({
  type,
  title,
  message,
  details,
  suggestions,
  actions,
  onClose
}) => {
  const config = typeConfig[type];
  const detailsEntries = Object.entries(details || {});

  return (
    <div className="rounded-2xl border shadow-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-neutral-200)' }}>
      <div className="p-4 border-b" style={{ borderColor: 'var(--color-neutral-200)', backgroundColor: config.subtle }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface)' }}>
              <i className={`fas ${config.icon}`} style={{ color: config.accent }}></i>
            </div>
            <h3 className="font-bold text-sm uppercase tracking-wider truncate" style={{ color: 'var(--color-neutral-900)' }}>
              {title}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="p-1" style={{ color: 'var(--color-neutral-600)' }}>
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-neutral-700)' }}>
          {message}
        </p>

        {detailsEntries.length > 0 ? (
          <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: 'var(--color-surface-muted)' }}>
            <h4 className="font-black text-xs uppercase tracking-wider" style={{ color: 'var(--color-neutral-600)' }}>
              Detalles
            </h4>
            {detailsEntries.map(([key, value]) => (
              <div key={key} className="flex items-center justify-between text-xs gap-3">
                <span style={{ color: 'var(--color-neutral-600)' }}>{key.replace(/_/g, ' ')}:</span>
                <span className="font-bold text-right" style={{ color: 'var(--color-neutral-900)' }}>{String(value)}</span>
              </div>
            ))}
          </div>
        ) : null}

        {Array.isArray(suggestions) && suggestions.length > 0 ? (
          <div className="space-y-2">
            <h4 className="font-black text-xs uppercase tracking-wider" style={{ color: 'var(--color-neutral-600)' }}>
              Sugerencias
            </h4>
            <ul className="space-y-1">
              {suggestions.map((suggestion, idx) => (
                <li key={idx} className="text-xs flex items-start gap-2" style={{ color: 'var(--color-neutral-600)' }}>
                  <i className="fas fa-lightbulb mt-0.5" style={{ color: 'var(--color-warning)' }}></i>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {Array.isArray(actions) && actions.length > 0 ? (
          <div className="flex gap-2 pt-1">
            {actions.map((action, idx) => (
              <Button
                key={idx}
                size="sm"
                variant={action.variant === 'primary' ? 'primary' : 'secondary'}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

