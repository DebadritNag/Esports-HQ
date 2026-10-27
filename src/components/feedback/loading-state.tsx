import React from 'react';
import { cn } from '../../lib/utils';

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        'animate-pulse bg-[#E8E5DD] rounded',
        className
      )}
    />
  );
};

export const TournamentRowSkeleton: React.FC = () => {
  return (
    <div className="bg-editorial-surface border border-editorial-border p-4 rounded-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3 w-full sm:w-1/2">
        <Skeleton className="w-12 h-12 rounded shrink-0" />
        <div className="flex flex-col gap-2 w-full">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
};

export const LoadingState: React.FC<{ message?: string; rows?: number }> = ({
  message = 'Loading data...',
  rows = 3,
}) => {
  return (
    <div className="flex flex-col gap-3 py-4 w-full">
      <div className="flex items-center gap-2 text-xs font-mono text-editorial-muted mb-1">
        <div className="w-2 h-2 rounded-full bg-editorial-green animate-ping" />
        <span>{message}</span>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <TournamentRowSkeleton key={i} />
      ))}
    </div>
  );
};
