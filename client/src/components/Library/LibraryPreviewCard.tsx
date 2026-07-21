import { FileIcon, Sparkles } from '@librechat/client';
import type { LibraryItem } from '~/types/library';
import { cn } from '~/utils';
import { formatLibraryDate, formatLibraryFileSize, LIBRARY_TYPE_LABELS } from './libraryUtils';
import { getLibraryFileType, TYPE_COLOR_MAP } from './libraryTypeMeta';
import LibraryItemActions from './LibraryItemActions';

interface LibraryPreviewCardProps {
  item: LibraryItem;
  onClick?: (item: LibraryItem) => void;
  onDownload?: (item: LibraryItem) => void;
  onShare?: (item: LibraryItem) => void;
  onMore?: (item: LibraryItem) => void;
}

function isPresentation(item: LibraryItem): boolean {
  return (
    item.name.toLowerCase().endsWith('.pptx') ||
    item.contentType?.includes('presentation') === true
  );
}

function isWordOrMarkdown(item: LibraryItem): boolean {
  const lower = item.name.toLowerCase();
  return (
    lower.endsWith('.docx') ||
    lower.endsWith('.md') ||
    item.contentType?.includes('wordprocessing') === true
  );
}

function DeckPreview() {
  return (
    <div className="relative flex items-center justify-center">
      <div className="absolute left-2 top-1 h-20 w-14 rounded-md border border-border-light bg-surface-primary shadow-sm" />
      <div className="absolute left-0 top-2 h-20 w-14 rounded-md border border-border-light bg-surface-primary shadow-sm" />
      <div className="relative z-10 h-20 w-28 overflow-hidden rounded-md border border-border-light bg-surface-primary shadow-md">
        <div className="h-3 w-full bg-amber-400" />
        <div className="space-y-1.5 p-2">
          <div className="h-2 w-3/4 rounded bg-surface-tertiary" />
          <div className="h-2 w-1/2 rounded bg-surface-tertiary" />
          <div className="h-2 w-2/3 rounded bg-surface-tertiary" />
        </div>
      </div>
    </div>
  );
}

function DocumentPreview() {
  return (
    <div className="relative h-24 w-20 overflow-hidden rounded-md border border-border-light bg-surface-primary shadow-sm">
      <div className="absolute right-0 top-0 h-5 w-5 bg-blue-500" style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />
      <div className="space-y-1.5 p-3 pt-4">
        <div className="h-1.5 w-full rounded bg-surface-tertiary" />
        <div className="h-1.5 w-5/6 rounded bg-surface-tertiary" />
        <div className="h-1.5 w-4/5 rounded bg-surface-tertiary" />
        <div className="h-1.5 w-3/4 rounded bg-surface-tertiary" />
        <div className="h-1.5 w-5/6 rounded bg-surface-tertiary" />
      </div>
    </div>
  );
}

function SpreadsheetPreview() {
  return (
    <div className="w-32 overflow-hidden rounded-md border border-border-light bg-surface-primary shadow-sm">
      <div className="grid grid-cols-4 border-b border-border-light bg-emerald-700">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-4 border-r border-border-light/30 last:border-r-0" />
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, row) => (
        <div key={row} className="grid grid-cols-4 border-b border-border-light last:border-b-0">
          {Array.from({ length: 4 }).map((_, col) => (
            <div
              key={col}
              className={cn(
                'h-5 border-r border-border-light last:border-r-0',
                col === 0 && row % 2 === 0 && 'bg-surface-tertiary/50',
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function CodePreview() {
  const bars = [
    'w-3/4 bg-emerald-600',
    'w-1/2 bg-blue-500',
    'w-5/6 bg-amber-500',
    'w-2/3 bg-emerald-600',
    'w-3/4 bg-blue-500',
  ];
  return (
    <div className="w-36 space-y-1.5 rounded-md border border-border-light bg-surface-primary p-2.5 shadow-sm">
      {bars.map((bar, i) => (
        <div key={i} className={cn('h-1.5 rounded', bar)} />
      ))}
    </div>
  );
}

function PreviewArea({ item }: { item: LibraryItem }) {
  if (item.type === 'pdf' || isWordOrMarkdown(item)) {
    return <DocumentPreview />;
  }
  if (item.type === 'spreadsheet') {
    return <SpreadsheetPreview />;
  }
  if (item.type === 'code' || item.contentType?.includes('html')) {
    return <CodePreview />;
  }
  if (isPresentation(item)) {
    return <DeckPreview />;
  }

  const fileType = getLibraryFileType(item.type);
  const iconColor = TYPE_COLOR_MAP[item.type];
  const isArtifact = item.type === 'artifact';

  return (
    <div className={cn('flex items-center justify-center', iconColor)} aria-hidden="true">
      {isArtifact ? <Sparkles className="size-12" /> : <FileIcon fileType={fileType} className="size-12" />}
    </div>
  );
}

export default function LibraryPreviewCard({
  item,
  onClick,
  onDownload,
  onShare,
  onMore,
}: LibraryPreviewCardProps) {
  const fileType = getLibraryFileType(item.type);
  const isArtifact = item.type === 'artifact';
  const iconColor = TYPE_COLOR_MAP[item.type];
  const ariaLabel = `${item.name}, ${LIBRARY_TYPE_LABELS[item.type]}, ${formatLibraryFileSize(item.sizeBytes)}`;

  const sourceLabel = item.conversationId ? `Chat ${item.conversationId}` : item.kind;

  return (
    <div
      role="listitem"
      className={cn(
        'flex flex-col overflow-hidden rounded-lg border border-border-light bg-surface-primary transition-colors',
        onClick && 'cursor-pointer hover:border-border-medium hover:bg-surface-hover',
      )}
      aria-label={ariaLabel}
    >
      {onClick ? (
        <button
          type="button"
          onClick={() => onClick(item)}
          className="flex h-32 items-center justify-center bg-amber-50/80 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Open ${item.name}`}
        >
          <PreviewArea item={item} />
        </button>
      ) : (
        <div className="flex h-32 items-center justify-center bg-amber-50/80 p-4">
          <PreviewArea item={item} />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start gap-2">
          <div className={cn('mt-0.5 shrink-0', iconColor)} aria-hidden="true">
            {isArtifact ? <Sparkles className="size-4" /> : <FileIcon fileType={fileType} className="size-4" />}
          </div>
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary" title={item.name}>
            {item.name}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-secondary">
          <span className="rounded bg-surface-tertiary px-1.5 py-0.5 font-medium text-text-primary">
            {LIBRARY_TYPE_LABELS[item.type]}
          </span>
          <span className="capitalize">{sourceLabel}</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-secondary">
          <time dateTime={item.createdAt}>{formatLibraryDate(item.createdAt)}</time>
          <span aria-hidden="true">·</span>
          <span>{formatLibraryFileSize(item.sizeBytes)}</span>
        </div>

        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="text-xs text-text-secondary">Quick actions</span>
          <LibraryItemActions
            onOpen={onClick ? () => onClick(item) : undefined}
            onDownload={onDownload ? () => onDownload(item) : undefined}
            onShare={onShare ? () => onShare(item) : undefined}
            onMore={onMore ? () => onMore(item) : undefined}
          />
        </div>
      </div>
    </div>
  );
}
