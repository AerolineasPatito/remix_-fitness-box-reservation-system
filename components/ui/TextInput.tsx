import React from 'react';

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  inputClassName?: string;
  containerClassName?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const TextInput: React.FC<TextInputProps> = ({
  label,
  hint,
  error,
  inputClassName = '',
  containerClassName = '',
  leftIcon,
  rightIcon,
  id,
  required,
  ...props
}) => {
  const helperId = id ? `${id}-helper` : undefined;
  const errorId = id ? `${id}-error` : undefined;

  return (
    <div className={`space-y-1 ${containerClassName}`}>
      {label && (
        <label htmlFor={id} className="block text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--color-neutral-500)' }}>
          {label} {required ? <span style={{ color: 'var(--color-danger)' }}>*</span> : null}
        </label>
      )}

      <div
        className="flex items-center gap-2 border rounded-xl px-3"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: error ? 'var(--color-danger)' : 'var(--color-neutral-200)'
        }}
      >
        {leftIcon ? <span style={{ color: 'var(--color-neutral-500)' }}>{leftIcon}</span> : null}
        <input
          {...props}
          id={id}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : hint ? helperId : undefined}
          className={`w-full bg-transparent py-3 text-sm outline-none min-h-[44px] ${inputClassName}`}
          style={{ color: 'var(--color-neutral-900)' }}
        />
        {rightIcon ? <span style={{ color: 'var(--color-neutral-500)' }}>{rightIcon}</span> : null}
      </div>

      {!error && hint ? (
        <p id={helperId} className="text-xs" style={{ color: 'var(--color-neutral-500)' }}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs font-semibold" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      ) : null}
    </div>
  );
};

