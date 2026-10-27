import React from 'react';
import { cn } from '../../lib/utils';
import {
  EVENT_STATUS_LABELS,
  CONFIRMATION_STATUS_LABELS,
} from '../../lib/constants';
import type { EventStatus, ConfirmationStatus } from '../../types/api';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'green' | 'orange' | 'dark' | 'muted';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}) => {
  const base =
    'inline-flex items-center font-medium uppercase tracking-wider rounded border transition-colors';

  const sizes = {
    sm: 'text-[10px] px-1.5 py-0.5 leading-none',
    md: 'text-xs px-2 py-0.5 leading-tight',
  };

  const variants = {
    default: 'bg-editorial-ivory text-editorial-charcoal border-editorial-border',
    outline: 'bg-transparent text-editorial-charcoal border-editorial-border',
    green: 'bg-editorial-green-light text-editorial-green border-[#BFE0D2]',
    orange: 'bg-editorial-orange-light text-editorial-orange border-[#F6CEB4]',
    dark: 'bg-editorial-dark text-editorial-ivory border-editorial-dark',
    muted: 'bg-[#EEEEEC] text-editorial-muted border-editorial-border',
  };

  return (
    <span className={cn(base, sizes[size], variants[variant], className)} {...props}>
      {children}
    </span>
  );
};

export const EventStatusBadge: React.FC<{ status: EventStatus; className?: string }> = ({
  status,
  className,
}) => {
  const meta = EVENT_STATUS_LABELS[status] || {
    label: status,
    color: '#777A75',
    bg: '#EEEEEC',
    border: '#E4E1D9',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center text-[10px] sm:text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded border',
        className
      )}
      style={{
        color: meta.color,
        backgroundColor: meta.bg,
        borderColor: meta.border,
      }}
    >
      {meta.label}
    </span>
  );
};

export const ConfirmationBadge: React.FC<{
  status: ConfirmationStatus;
  className?: string;
}> = ({ status, className }) => {
  const meta = CONFIRMATION_STATUS_LABELS[status] || {
    label: status,
    color: '#777A75',
    bg: '#EEEEEC',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-editorial-border/60',
        className
      )}
      style={{
        color: meta.color,
        backgroundColor: meta.bg,
      }}
    >
      {meta.label}
    </span>
  );
};
