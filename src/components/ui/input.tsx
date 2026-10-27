import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, type = 'text', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold uppercase tracking-wider text-editorial-charcoal font-heading"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          type={type}
          className={cn(
            'w-full px-3 py-2 text-sm bg-editorial-surface border border-editorial-border rounded text-editorial-charcoal placeholder:text-editorial-muted/60 transition-colors duration-150',
            'focus:outline-none focus:border-editorial-charcoal focus:ring-1 focus:ring-editorial-charcoal/20',
            'disabled:bg-editorial-ivory disabled:text-editorial-muted disabled:cursor-not-allowed',
            error && 'border-editorial-orange focus:border-editorial-orange focus:ring-editorial-orange/20',
            className
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs text-editorial-orange font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-editorial-muted">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, rows = 3, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-xs font-semibold uppercase tracking-wider text-editorial-charcoal font-heading"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          className={cn(
            'w-full px-3 py-2 text-sm bg-editorial-surface border border-editorial-border rounded text-editorial-charcoal placeholder:text-editorial-muted/60 transition-colors duration-150',
            'focus:outline-none focus:border-editorial-charcoal focus:ring-1 focus:ring-editorial-charcoal/20',
            'disabled:bg-editorial-ivory disabled:text-editorial-muted disabled:cursor-not-allowed resize-y',
            error && 'border-editorial-orange focus:border-editorial-orange focus:ring-editorial-orange/20',
            className
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs text-editorial-orange font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-editorial-muted">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
