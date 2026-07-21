import { Download, ExternalLink, MoreVertical, Share2 } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

interface LibraryItemActionsProps {
  onOpen?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onMore?: () => void;
  className?: string;
}

export default function LibraryItemActions({
  onOpen,
  onDownload,
  onShare,
  onMore,
  className,
}: LibraryItemActionsProps) {
  const localize = useLocalize();

  if (!onOpen && !onDownload && !onShare && !onMore) {
    return null;
  }

  return (
    <div
      className={cn('flex items-center gap-0.5', className)}
      onClick={(event) => event.stopPropagation()}
      role="group"
      aria-label={localize('com_ui_library_quick_actions')}
    >
      {onOpen && (
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex size-7 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={localize('com_ui_library_open')}
        >
          <ExternalLink className="size-4" aria-hidden="true" />
        </button>
      )}
      {onDownload && (
        <button
          type="button"
          onClick={onDownload}
          className="inline-flex size-7 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={localize('com_ui_download')}
        >
          <Download className="size-4" aria-hidden="true" />
        </button>
      )}
      {onShare && (
        <button
          type="button"
          onClick={onShare}
          className="inline-flex size-7 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={localize('com_ui_share')}
        >
          <Share2 className="size-4" aria-hidden="true" />
        </button>
      )}
      {onMore && (
        <button
          type="button"
          onClick={onMore}
          className="inline-flex size-7 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={localize('com_ui_library_more_options')}
        >
          <MoreVertical className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
