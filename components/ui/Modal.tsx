import React from 'react';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ModalProps {
  open: boolean;
  title?: string;
  subtitle?: string;
  size?: ModalSize;
  closeOnOverlay?: boolean;
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const sizeClass: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl'
};

export const Modal: React.FC<ModalProps> = ({
  open,
  title,
  subtitle,
  size = 'md',
  closeOnOverlay = true,
  onClose,
  footer,
  children,
  className = ''
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(24, 24, 27, 0.82)' }}
        onClick={() => {
          if (closeOnOverlay) onClose();
        }}
      />
      <div className={`relative w-full ${sizeClass[size]} rounded-3xl border shadow-2xl ${className}`} style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-neutral-200)' }}>
        {(title || subtitle) && (
          <div className="px-6 pt-6 pb-3">
            {title ? <h3 className="text-2xl font-bebas uppercase tracking-wide italic" style={{ color: 'var(--color-neutral-900)' }}>{title}</h3> : null}
            {subtitle ? <p className="text-sm mt-1" style={{ color: 'var(--color-neutral-500)' }}>{subtitle}</p> : null}
          </div>
        )}
        <div className="px-6 pb-6">{children}</div>
        {footer ? <div className="px-6 pb-6">{footer}</div> : null}
      </div>
    </div>
  );
};

