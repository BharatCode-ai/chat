import { FileIcon, Sparkles } from '@librechat/client';
import type { LibraryItem } from '~/types/library';
import { cn } from '~/utils';
import { formatLibraryDate, formatLibraryFileSize, LIBRARY_TYPE_LABELS } from './libraryUtils';
import { getLibraryFileType, TYPE_COLOR_MAP } from './libraryTypeMeta';
import LibraryItemActions from './LibraryItemActions';

interface LibraryListItemProps {
  item: LibraryItem;
  onClick?: (item: LibraryItem) => void;
  onDownload?: (item: LibraryItem) => void;
  onShare?: (item: LibraryItem) => void;
  onMore?: (item: LibraryItem) => void;
}

const itemRowClassName =
  'flex w-full items-center gap-3 rounded-lg border border-border-light bg-surface-primary px-4 py-3 text-left transition-colors';

export default function LibraryListItem({
  item,
  onClick,
  onDownload,
  onShare,
  onMore,
}: LibraryListItemProps) {
  const fileType = getLibraryFileType(item.type);
  const isArtifact = item.type === 'artifact';
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
        {isArtifact ? <Sparkles className="size-5" /> : <FileIcon fileType={fileType} />}
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

  return (
    <div
      role="listitem"
      className={cn(
        itemRowClassName,
        onClick &&
          'cursor-pointer hover:border-border-medium hover:bg-surface-hover focus-within:outline-none focus-within:ring-2 focus-within:ring-ring',
      )}
      aria-label={ariaLabel}
    >
      {onClick ? (
        <button
          type="button"
          onClick={() => onClick(item)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none"
        >
          {content}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{content}</div>
      )}
      <LibraryItemActions
        onOpen={onClick ? () => onClick(item) : undefined}
        onDownload={onDownload ? () => onDownload(item) : undefined}
        onShare={onShare ? () => onShare(item) : undefined}
        onMore={onMore ? () => onMore(item) : undefined}
        className="hidden shrink-0 sm:flex"
      />
    </div>
  );
}
