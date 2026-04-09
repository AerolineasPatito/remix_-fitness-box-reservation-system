import React from 'react';

type CardVariant = 'surface' | 'interactive' | 'stat';
type CardPadding = 'sm' | 'md' | 'lg';

export interface CardProps {
  variant?: CardVariant;
  padding?: CardPadding;
  as?: 'div' | 'section' | 'article';
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

const paddingClass: Record<CardPadding, string> = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6'
};

const variantClass: Record<CardVariant, string> = {
  surface: 'border shadow-sm',
  interactive: 'border shadow-sm hover:shadow-md transition-all cursor-pointer',
  stat: 'border shadow'
};

export const Card: React.FC<CardProps> = ({
  variant = 'surface',
  padding = 'md',
  as = 'div',
  className = '',
  children,
  onClick
}) => {
  const Comp = as;
  return (
    <Comp
      onClick={onClick}
      className={`rounded-2xl ${paddingClass[padding]} ${variantClass[variant]} ${className}`}
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-neutral-200)',
        color: 'var(--color-neutral-900)'
      }}
    >
      {children}
    </Comp>
  );
};

