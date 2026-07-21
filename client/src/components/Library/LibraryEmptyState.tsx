import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { FolderOpen, SearchX } from 'lucide-react';
import { useLocalize } from '~/hooks';

interface LibraryEmptyStateProps {
  /** True when filters/search produced no matches but the library has items. */
  isFiltered?: boolean;
  onClearFilters?: () => void;
}

interface EmptyStateLayoutProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: ReactNode;
}

function EmptyStateLayout({ icon: Icon, title, description, children }: EmptyStateLayoutProps) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border border-border-light bg-transparent px-6 py-12 text-center"
      role="status"
    >
      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-surface-tertiary">
        <Icon className="size-6 text-text-secondary" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-text-primary">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-text-secondary">{description}</p>
      {children}
    </div>
  );
}

export default function LibraryEmptyState({
  isFiltered = false,
  onClearFilters,
}: LibraryEmptyStateProps) {
  const localize = useLocalize();

  if (isFiltered) {
    return (
      <EmptyStateLayout
        icon={SearchX}
        title={localize('com_ui_library_no_matches_title')}
        description={localize('com_ui_library_no_matches_description')}
      >
        {onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-4 rounded-lg border border-border-medium px-4 py-2 text-xs font-medium text-text-primary transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {localize('com_ui_library_clear_filters')}
          </button>
        )}
      </EmptyStateLayout>
    );
  }

  return (
    <EmptyStateLayout
      icon={FolderOpen}
      title={localize('com_ui_library_empty_title')}
      description={localize('com_ui_library_empty_description')}
    />
  );
}
