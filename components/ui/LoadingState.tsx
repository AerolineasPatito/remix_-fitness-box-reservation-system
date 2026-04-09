import React from 'react';

type LoadingSize = 'sm' | 'md' | 'lg';

export interface LoadingStateProps {
  title?: string;
  message?: string;
  size?: LoadingSize;
  inline?: boolean;
  className?: string;
}

const iconSize: Record<LoadingSize, string> = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl'
};

export const LoadingState: React.FC<LoadingStateProps> = ({
  title = 'Cargando',
  message,
  size = 'md',
  inline = false,
  className = ''
}) => (
  <div className={`${inline ? 'py-4' : 'py-10'} text-center ${className}`}>
    <i className={`fas fa-circle-notch fa-spin ${iconSize[size]}`} style={{ color: 'var(--color-primary)' }}></i>
    <p className="mt-3 text-sm font-black uppercase tracking-widest" style={{ color: 'var(--color-neutral-600)' }}>
      {title}
    </p>
    {message ? (
      <p className="mt-1 text-xs" style={{ color: 'var(--color-neutral-500)' }}>
        {message}
      </p>
    ) : null}
  </div>
);

