import { AlertCircle } from 'lucide-react';
import { Button } from '@librechat/client';
import { useLocalize } from '~/hooks';

interface LibraryErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function LibraryErrorState({ message, onRetry }: LibraryErrorStateProps) {
  const localize = useLocalize();
  const displayMessage = message ?? localize('com_ui_library_error_default');

  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border border-border-light px-6 py-12 text-center"
      role="alert"
      aria-live="assertive"
    >
      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
        <AlertCircle className="size-6 text-red-600 dark:text-red-400" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-text-primary">
        {localize('com_ui_library_error_title')}
      </p>
      <p className="mt-1 max-w-sm text-xs text-text-secondary">{displayMessage}</p>
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-4"
          aria-label={localize('com_ui_library_try_again')}
        >
          {localize('com_ui_library_try_again')}
        </Button>
      )}
    </div>
  );
}
