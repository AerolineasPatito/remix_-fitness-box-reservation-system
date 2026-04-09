import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectInputProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  containerClassName?: string;
}

export const SelectInput: React.FC<SelectInputProps> = ({
  label,
  hint,
  error,
  options,
  containerClassName = '',
  id,
  required,
  ...props
}) => {
  const helperId = id ? `${id}-helper` : undefined;
  const errorId = id ? `${id}-error` : undefined;

  return (
    <div className={`space-y-1 ${containerClassName}`}>
      {label ? (
        <label htmlFor={id} className="block text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--color-neutral-500)' }}>
          {label} {required ? <span style={{ color: 'var(--color-danger)' }}>*</span> : null}
        </label>
      ) : null}

      <select
        {...props}
        id={id}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : hint ? helperId : undefined}
        className="w-full border rounded-xl px-3 py-3 text-sm min-h-[44px] outline-none"
        style={{
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-neutral-900)',
          borderColor: error ? 'var(--color-danger)' : 'var(--color-neutral-200)'
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>

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

