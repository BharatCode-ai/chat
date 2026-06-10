import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { FolderOpen, SearchX } from 'lucide-react';

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
  if (isFiltered) {
    return (
      <EmptyStateLayout
        icon={SearchX}
        title="No matching files"
        description="Try adjusting your search or filter to find what you are looking for."
      >
        {onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-4 rounded-lg border border-border-medium px-4 py-2 text-xs font-medium text-text-primary transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Clear filters
          </button>
        )}
      </EmptyStateLayout>
    );
  }

  return (
    <EmptyStateLayout
      icon={FolderOpen}
      title="Your library is empty"
      description="Files and artifacts from your conversations will appear here."
    />
  );
}