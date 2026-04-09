import React from 'react';
import { TextInput, TextInputProps } from './TextInput.tsx';

export interface NumberInputProps extends Omit<TextInputProps, 'type' | 'onChange'> {
  value?: string | number;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  min?: number;
  max?: number;
  step?: number;
  allowDecimal?: boolean;
  allowNegative?: boolean;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  allowDecimal = false,
  allowNegative = false,
  step,
  ...props
}) => {
  const inputMode = allowDecimal ? 'decimal' : 'numeric';
  const pattern = allowDecimal ? '[0-9]*[.]?[0-9]*' : '[0-9]*';
  const resolvedStep = typeof step === 'number' ? step : allowDecimal ? 0.01 : 1;
  const resolvedMin = allowNegative ? props.min : typeof props.min === 'number' ? props.min : 0;

  return (
    <TextInput
      {...props}
      type="number"
      inputMode={inputMode}
      pattern={pattern}
      min={resolvedMin}
      step={resolvedStep}
    />
  );
};

