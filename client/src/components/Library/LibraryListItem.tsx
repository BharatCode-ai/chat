import { FileIcon, Sparkles } from '@librechat/client';
import {
  AudioPaths,
  CodePaths,
  FilePaths,
  SheetPaths,
  TextPaths,
  VideoPaths,
} from '@librechat/client';
import type { LibraryItem, LibraryItemType } from '~/types/library';
import { cn } from '~/utils';
import { formatLibraryDate, formatLibraryFileSize, LIBRARY_TYPE_LABELS } from './libraryUtils';

interface LibraryListItemProps {
  item: LibraryItem;
  onClick?: (item: LibraryItem) => void;
}

interface LibraryFileType {
  fill: string;
  paths: React.FC;
  title: string;
}

const TYPE_FILE_TYPE_MAP: Record<Exclude<LibraryItemType, 'artifact'>, LibraryFileType> = {
  pdf: { paths: TextPaths, fill: '#EF4444', title: 'PDF' },
  image: { paths: FilePaths, fill: '#EC4899', title: 'Image' },
  video: { paths: VideoPaths, fill: '#A855F7', title: 'Video' },
  document: { paths: TextPaths, fill: '#3B82F6', title: 'Document' },
  code: { paths: CodePaths, fill: '#F97316', title: 'Code' },
  spreadsheet: { paths: SheetPaths, fill: '#10B981', title: 'Spreadsheet' },
  audio: { paths: AudioPaths, fill: '#F59E0B', title: 'Audio' },
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
  const fileType = TYPE_FILE_TYPE_MAP[item.type];
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
