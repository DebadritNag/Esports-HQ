import React from 'react';
import { Button } from '../ui/button';
import { Inbox } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'bg-editorial-surface border border-editorial-border rounded-md p-8 text-center flex flex-col items-center justify-center gap-3',
        className
      )}
    >
      <div className="w-12 h-12 rounded bg-editorial-ivory border border-editorial-border flex items-center justify-center text-editorial-muted">
        {icon || <Inbox className="w-6 h-6 stroke-[1.5]" />}
      </div>
      <div className="max-w-md">
        <h4 className="font-heading font-semibold text-base text-editorial-charcoal">
          {title}
        </h4>
        <p className="text-xs text-editorial-muted mt-1 leading-relaxed">
          {description}
        </p>
      </div>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
