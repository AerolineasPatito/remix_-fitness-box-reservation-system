import React from 'react';
import { Button } from './Button.tsx';

export interface FileInputProps {
  id?: string;
  label?: string;
  hint?: string;
  error?: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  loading?: boolean;
  buttonLabel?: string;
  emptyLabel?: string;
  selectedLabel?: string;
  previewUrl?: string;
  containerClassName?: string;
  onFileSelect: (files: FileList | null) => void | Promise<void>;
}

export const FileInput: React.FC<FileInputProps> = ({
  id,
  label,
  hint,
  error,
  accept = 'image/*',
  multiple = false,
  disabled = false,
  loading = false,
  buttonLabel = 'Seleccionar archivo',
  emptyLabel = 'Sin archivo seleccionado',
  selectedLabel = 'Archivo seleccionado',
  previewUrl,
  containerClassName = '',
  onFileSelect
}) => {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [hasFile, setHasFile] = React.useState(false);

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    setHasFile(Boolean(files && files.length > 0));
    await onFileSelect(files);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={`space-y-2 ${containerClassName}`}>
      {label ? (
        <label htmlFor={id} className="block text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--color-neutral-500)' }}>
          {label}
        </label>
      ) : null}

      <div className="border rounded-xl p-3 space-y-3" style={{ borderColor: error ? 'var(--color-danger)' : 'var(--color-neutral-200)', backgroundColor: 'var(--color-surface)' }}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold" style={{ color: 'var(--color-neutral-600)' }}>
            {hasFile ? selectedLabel : emptyLabel}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            loading={loading}
            onClick={() => inputRef.current?.click()}
          >
            {buttonLabel}
          </Button>
        </div>

        {previewUrl ? (
          <img src={previewUrl} alt="preview" className="w-full h-28 object-cover rounded-lg border" style={{ borderColor: 'var(--color-neutral-200)' }} />
        ) : null}
      </div>

      <input
        ref={inputRef}
        id={id}
        type="file"
        className="sr-only"
        accept={accept}
        multiple={multiple}
        disabled={disabled || loading}
        onChange={handleChange}
      />

      {!error && hint ? (
        <p className="text-xs" style={{ color: 'var(--color-neutral-500)' }}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="text-xs font-semibold" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      ) : null}
    </div>
  );
};

