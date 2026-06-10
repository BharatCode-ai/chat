import { AlertCircle } from 'lucide-react';
import { Button } from '@librechat/client';

interface LibraryErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function LibraryErrorState({
  message = 'Something went wrong while loading your library.',
  onRetry,
}: LibraryErrorStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border border-border-light px-6 py-12 text-center"
      role="alert"
      aria-live="assertive"
    >
      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
        <AlertCircle className="size-6 text-red-600 dark:text-red-400" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-text-primary">Unable to load library</p>
      <p className="mt-1 max-w-sm text-xs text-text-secondary">{message}</p>
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-4"
          aria-label="Retry loading library"
        >
          Try again
        </Button>
      )}
    </div>
  );
}