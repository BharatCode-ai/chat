import type { ComponentType } from 'react';
import {
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Sparkles,
} from 'lucide-react';
import type { LibraryItem, LibraryItemType } from '~/types/library';
import { cn } from '~/utils';
import {
  formatLibraryDate,
  formatLibraryFileSize,
  LIBRARY_TYPE_LABELS,
} from './libraryUtils';

interface LibraryListItemProps {
  item: LibraryItem;
  onClick?: (item: LibraryItem) => void;
}

const TYPE_ICON_MAP: Record<LibraryItemType, ComponentType<{ className?: string }>> = {
  pdf: FileText,
  image: FileImage,
  video: FileVideo,
  document: FileText,
  code: FileCode,
  spreadsheet: FileSpreadsheet,
  audio: FileAudio,
  artifact: Sparkles,
};

const TYPE_COLOR_MAP: Record<LibraryItemType, string> = {
  pdf: 'text-red-500',
  image: 'text-pink-500',
  video: 'text-purple-500',
  document: 'text-blue-500',
  code: 'text-orange-500',
  spreadsheet: 'text-emerald-500',
  audio: 'text-amber-500',
  artifact: 'text-violet-500',
};

const itemRowClassName =
  'flex w-full items-center gap-3 rounded-lg border border-border-light bg-surface-primary px-4 py-3 text-left transition-colors';

export default function LibraryListItem({ item, onClick }: LibraryListItemProps) {
  const Icon = TYPE_ICON_MAP[item.type];
  const iconColor = TYPE_COLOR_MAP[item.type];
  const ariaLabel = `${item.name}, ${LIBRARY_TYPE_LABELS[item.type]}, ${formatLibraryFileSize(item.sizeBytes)}`;

  const content = (
    <>
      <div
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-tertiary',
          iconColor,
        )}
        aria-hidden="true"
      >
        <Icon className="size-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-medium text-text-primary">{item.name}</p>
          <span className="shrink-0 text-xs text-text-secondary">
            {formatLibraryFileSize(item.sizeBytes)}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-secondary">
          <span className="rounded bg-surface-tertiary px-1.5 py-0.5 font-medium">
            {LIBRARY_TYPE_LABELS[item.type]}
          </span>
          <span className="capitalize">{item.kind}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={item.createdAt}>{formatLibraryDate(item.createdAt)}</time>
        </div>
        {item.description && (
          <p className="mt-1 truncate text-xs text-text-secondary">{item.description}</p>
        )}
      </div>
    </>
  );

  if (onClick) {
    return (
      <div role="listitem">
        <button
          type="button"
          onClick={() => onClick(item)}
          className={cn(
            itemRowClassName,
            'cursor-pointer hover:border-border-medium hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
          aria-label={ariaLabel}
        >
          {content}
        </button>
      </div>
    );
  }

  return (
    <div role="listitem" className={itemRowClassName} aria-label={ariaLabel}>
      {content}
    </div>
  );
}