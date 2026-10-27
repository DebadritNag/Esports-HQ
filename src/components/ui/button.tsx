import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'urgent' | 'outline' | 'ghost' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-editorial-green/30 disabled:opacity-50 disabled:cursor-not-allowed select-none';

    const variants = {
      primary:
        'bg-editorial-green text-white hover:bg-editorial-green-hover active:bg-[#15422D] shadow-sm',
      secondary:
        'bg-editorial-surface text-editorial-charcoal border border-editorial-border hover:bg-editorial-ivory active:bg-[#EDE9E0]',
      urgent:
        'bg-editorial-orange text-white hover:bg-editorial-orange-hover active:bg-[#A3521E] shadow-sm',
      outline:
        'border border-editorial-border text-editorial-charcoal hover:border-editorial-charcoal/40 bg-transparent',
      ghost:
        'text-editorial-charcoal hover:bg-editorial-charcoal/5 active:bg-editorial-charcoal/10 bg-transparent',
      dark:
        'bg-editorial-dark text-editorial-ivory hover:bg-[#2B322E] active:bg-[#181C1A]',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 rounded gap-1.5 font-semibold uppercase tracking-wider',
      md: 'text-sm px-4 py-2 rounded-md gap-2',
      lg: 'text-base px-6 py-2.5 rounded-md gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && (
          <span className="inline-flex shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
