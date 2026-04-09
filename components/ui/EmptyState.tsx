import React from 'react';
import { Button } from './Button.tsx';

export interface EmptyStateProps {
  title: string;
  message?: string;
  description?: string;
  icon?: React.ReactNode | string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  description,
  icon,
  actionLabel,
  onAction,
  compact = false,
  className = ''
}) => {
  const resolvedMessage = message || description;
  const iconNode = typeof icon === 'string'
    ? <i className={`fas ${icon} text-3xl`} aria-hidden="true"></i>
    : (icon || <i className="fas fa-inbox text-3xl" aria-hidden="true"></i>);
  return (
  <div className={`text-center border rounded-2xl ${compact ? 'p-4' : 'p-8'} ${className}`} style={{ borderColor: 'var(--color-neutral-200)', backgroundColor: 'var(--color-surface)' }}>
    <div className="mb-3" style={{ color: 'var(--color-neutral-400)' }}>
      {iconNode}
    </div>
    <p className="font-black uppercase tracking-widest" style={{ color: 'var(--color-neutral-700)' }}>
      {title}
    </p>
    {resolvedMessage ? (
      <p className="text-sm mt-2" style={{ color: 'var(--color-neutral-500)' }}>
        {resolvedMessage}
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
};
