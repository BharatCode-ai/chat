import { LayoutGrid, List } from 'lucide-react';
import type { LibraryViewMode } from '~/types/library';
import { cn } from '~/utils';

interface LibraryViewToggleProps {
  viewMode: LibraryViewMode;
  onViewModeChange: (mode: LibraryViewMode) => void;
  className?: string;
}

export default function LibraryViewToggle({
  viewMode,
  onViewModeChange,
  className,
}: LibraryViewToggleProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg border border-border-light bg-surface-primary p-0.5',
        className,
      )}
      role="radiogroup"
      aria-label="Library view"
    >
      <button
        type="button"
        onClick={() => onViewModeChange('dense')}
        aria-pressed={viewMode === 'dense'}
        aria-label="Dense list view"
        className={cn(
          'inline-flex size-8 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          viewMode === 'dense'
            ? 'bg-amber-50 text-green-800 shadow-sm'
            : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary',
        )}
      >
        <List className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => onViewModeChange('preview')}
        aria-pressed={viewMode === 'preview'}
        aria-label="Preview grid view"
        className={cn(
          'inline-flex size-8 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          viewMode === 'preview'
            ? 'bg-amber-50 text-green-800 shadow-sm'
            : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary',
        )}
      >
        <LayoutGrid className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
