import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const sizeClass: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-xs rounded-md min-h-[44px]',
  md: 'px-4 py-2.5 text-sm rounded-lg min-h-[44px]',
  lg: 'px-5 py-3 text-sm rounded-xl min-h-[44px]'
};

const getVariantStyle = (variant: ButtonVariant, disabled: boolean) => {
  const base = disabled ? { opacity: 0.6, cursor: 'not-allowed' as const } : {};
  if (variant === 'primary') {
    return {
      ...base,
      backgroundColor: 'var(--color-primary)',
      color: 'var(--color-neutral-0)',
      borderColor: 'var(--color-primary)'
    };
  }
  if (variant === 'danger') {
    return {
      ...base,
      backgroundColor: 'var(--color-danger)',
      color: 'var(--color-neutral-0)',
      borderColor: 'var(--color-danger)'
    };
  }
  if (variant === 'ghost') {
    return {
      ...base,
      backgroundColor: 'transparent',
      color: 'var(--color-neutral-700)',
      borderColor: 'var(--color-neutral-300)'
    };
  }
  return {
    ...base,
    backgroundColor: 'var(--color-neutral-100)',
    color: 'var(--color-neutral-700)',
    borderColor: 'var(--color-neutral-300)'
  };
};

export const Button: React.FC<ButtonProps> = ({
  variant,
  size,
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  children,
  ...rest
}) => {
  const resolvedVariant: ButtonVariant = (variant as ButtonVariant) || 'primary';
  const resolvedSize: ButtonSize = (size as ButtonSize) || 'md';
  const isDisabled = Boolean(disabled || loading);
  return (
    <button
      {...rest}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center gap-2 border font-black uppercase tracking-widest transition-all focus:outline-none focus-visible:ring-2 ${sizeClass[resolvedSize]} ${fullWidth ? 'w-full' : ''} ${className}`}
      style={getVariantStyle(resolvedVariant, isDisabled)}
    >
      {loading ? <i className="fas fa-circle-notch fa-spin" aria-hidden="true"></i> : leftIcon}
      <span>{children}</span>
      {!loading && rightIcon}
    </button>
  );
};
