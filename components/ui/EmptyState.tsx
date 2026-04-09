import React from 'react';
import { Button } from './Button.tsx';

export interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  icon,
  actionLabel,
  onAction,
  compact = false,
  className = ''
}) => (
  <div className={`text-center border rounded-2xl ${compact ? 'p-4' : 'p-8'} ${className}`} style={{ borderColor: 'var(--color-neutral-200)', backgroundColor: 'var(--color-surface)' }}>
    <div className="mb-3" style={{ color: 'var(--color-neutral-400)' }}>
      {icon || <i className="fas fa-inbox text-3xl" aria-hidden="true"></i>}
    </div>
    <p className="font-black uppercase tracking-widest" style={{ color: 'var(--color-neutral-700)' }}>
      {title}
    </p>
    {message ? (
      <p className="text-sm mt-2" style={{ color: 'var(--color-neutral-500)' }}>
        {message}
      </p>
    ) : null}
    {actionLabel && onAction ? (
      <div className="mt-4">
        <Button type="button" variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      </div>
    ) : null}
  </div>
);

