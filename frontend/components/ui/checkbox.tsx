'use client';

import * as React from 'react';
import { Check as CheckIcon } from 'lucide-react';

export interface CheckboxProps {
  id?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ id, checked = false, onCheckedChange, disabled = false, className = '', ...props }, ref) => {
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        data-state={checked ? 'checked' : 'unchecked'}
        disabled={disabled}
        ref={ref}
        className={`
          peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background 
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring 
          focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50
          data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground
          flex items-center justify-center
          ${className}
        `}
        onClick={() => !disabled && onCheckedChange?.(!checked)}
        {...props}
      >
        {checked && <CheckIcon className="h-3 w-3" />}
      </button>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
