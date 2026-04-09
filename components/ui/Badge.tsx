import React from 'react';

type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'primary';
type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const sizeClass: Record<BadgeSize, string> = {
  sm: 'px-2 py-1 text-[10px]',
  md: 'px-2.5 py-1.5 text-xs'
};

const getVariantStyle = (variant: BadgeVariant) => {
  if (variant === 'primary') return { backgroundColor: 'color-mix(in srgb, var(--color-primary) 16%, transparent)', color: 'var(--color-primary)', borderColor: 'color-mix(in srgb, var(--color-primary) 35%, transparent)' };
  if (variant === 'success') return { backgroundColor: 'color-mix(in srgb, var(--color-success) 16%, transparent)', color: 'var(--color-success)', borderColor: 'color-mix(in srgb, var(--color-success) 35%, transparent)' };
  if (variant === 'warning') return { backgroundColor: 'color-mix(in srgb, var(--color-warning) 16%, transparent)', color: 'var(--color-warning)', borderColor: 'color-mix(in srgb, var(--color-warning) 35%, transparent)' };
  if (variant === 'danger') return { backgroundColor: 'color-mix(in srgb, var(--color-danger) 16%, transparent)', color: 'var(--color-danger)', borderColor: 'color-mix(in srgb, var(--color-danger) 35%, transparent)' };
  if (variant === 'info') return { backgroundColor: 'color-mix(in srgb, var(--color-info) 16%, transparent)', color: 'var(--color-info)', borderColor: 'color-mix(in srgb, var(--color-info) 35%, transparent)' };
  return { backgroundColor: 'var(--color-neutral-100)', color: 'var(--color-neutral-600)', borderColor: 'var(--color-neutral-300)' };
};

export const Badge: React.FC<BadgeProps> = ({
  variant,
  size,
  icon,
  children,
  className = ''
}) => {
  const resolvedVariant: BadgeVariant = (variant as BadgeVariant) || 'neutral';
  const resolvedSize: BadgeSize = (size as BadgeSize) || 'sm';
  return (
    <span
      className={`inline-flex items-center gap-1 border rounded-full font-black uppercase tracking-widest ${sizeClass[resolvedSize]} ${className}`}
      style={getVariantStyle(resolvedVariant)}
    >
      {icon}
      {children}
    </span>
  );
};
