import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { ApiError } from '../../lib/api-client';

export interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  onRetry,
  title = 'Failed to load data',
}) => {
  let message = 'An unexpected error occurred while communicating with the backend.';
  let code = 'ERROR';
  let requestId: string | undefined;

  if (error instanceof ApiError) {
    message = error.message;
    code = error.code;
    requestId = error.requestId;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className="bg-[#FFF8F5] border border-[#F6CEB4] rounded-md p-6 text-editorial-charcoal">
      <div className="flex items-start gap-4">
        <div className="p-2 rounded bg-editorial-orange/10 text-editorial-orange shrink-0">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-heading font-semibold text-sm text-editorial-charcoal">
              {title}
            </h4>
            <span className="font-mono text-[10px] bg-editorial-orange/10 text-editorial-orange px-1.5 py-0.5 rounded font-bold uppercase">
              {code}
            </span>
          </div>

          <p className="text-xs text-[#7A401A] mt-1.5 leading-relaxed">
            {message}
          </p>

          {requestId && (
            <p className="text-[10px] font-mono text-editorial-muted mt-2">
              Request ID: {requestId}
            </p>
          )}

          {onRetry && (
            <div className="mt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={onRetry}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Retry Request
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
