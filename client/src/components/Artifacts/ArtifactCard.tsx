import {
  AlertCircle,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Pencil,
  Trash2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import cn from '~/utils/cn';

export type ArtifactStatus = 'ready' | 'loading' | 'error' | 'deleted';

export type ArtifactCardProps = {
  id: string;
  name: string;
  type: string;
  size: string;
  createdAt: string;
  status?: ArtifactStatus;
  onOpen?: (id: string) => void;
  onDownload?: (id: string) => void;
  onRename?: (id: string) => void;
  onDelete?: (id: string) => void;
};

const iconButtonClass = cn(
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-secondary',
  'transition-colors hover:bg-surface-hover hover:text-text-primary',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-heavy',
);

const actionButtonClass = cn(
  'inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-md border border-border-light px-3',
  'text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-heavy',
);

const labels = {
  delete: 'Delete',
  deletedDescription: 'This file is no longer available.',
  deletedTitle: 'Artifact deleted',
  errorTitle: 'Artifact failed to load',
  loading: 'Loading artifact',
  open: 'Open',
  rename: 'Rename',
  download: 'Download',
};

function ArtifactShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        'w-full max-w-md rounded-lg border border-border-light bg-surface-primary p-3 text-text-primary shadow-sm',
        'sm:p-4',
        className,
      )}
    >
      {children}
    </article>
  );
}

function ArtifactMeta({
  type,
  size,
  createdAt,
}: {
  type: string;
  size: string;
  createdAt: string;
}) {
  const meta = [type, size, createdAt].filter(Boolean).join(' - ');

  if (!meta) {
    return null;
  }

  return <p className="mt-1 text-xs text-text-secondary">{meta}</p>;
}

function ArtifactHeader({
  name,
  type,
  size,
  createdAt,
  muted = false,
}: Pick<ArtifactCardProps, 'name' | 'type' | 'size' | 'createdAt'> & {
  muted?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-tertiary text-text-secondary',
          muted && 'opacity-70',
        )}
        aria-hidden="true"
      >
        <FileText className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-sm font-medium leading-5 [overflow-wrap:anywhere]',
            muted && 'text-text-secondary line-through',
          )}
          title={name}
        >
          {name}
        </p>
        <ArtifactMeta type={type} size={size} createdAt={createdAt} />
      </div>
    </div>
  );
}

export function ArtifactCard({
  id,
  name,
  type,
  size,
  createdAt,
  status = 'ready',
  onOpen,
  onDownload,
  onRename,
  onDelete,
}: ArtifactCardProps) {
  if (status === 'loading') {
    return (
      <ArtifactShell>
        <div className="flex items-start gap-3" role="status" aria-label={labels.loading}>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-tertiary text-text-secondary">
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-4/5 animate-pulse rounded bg-surface-tertiary" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-surface-tertiary" />
            <div className="flex gap-2 pt-2">
              <div className="h-8 w-20 animate-pulse rounded-md bg-surface-tertiary" />
              <div className="h-8 w-24 animate-pulse rounded-md bg-surface-tertiary" />
            </div>
          </div>
        </div>
      </ArtifactShell>
    );
  }

  if (status === 'error') {
    return (
      <ArtifactShell className="border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100">
        <div className="flex items-start gap-3" role="alert">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-600 dark:text-red-300" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{labels.errorTitle}</p>
            <p className="mt-1 text-sm [overflow-wrap:anywhere]" title={name}>
              {name}
            </p>
            <ArtifactMeta type={type} size={size} createdAt={createdAt} />
          </div>
        </div>
      </ArtifactShell>
    );
  }

  if (status === 'deleted') {
    return (
      <ArtifactShell className="border-dashed opacity-75">
        <ArtifactHeader name={name} type={type} size={size} createdAt={createdAt} muted />
        <div className="mt-3 space-y-1">
          <p className="text-sm font-medium">{labels.deletedTitle}</p>
          <p className="text-sm text-text-secondary">{labels.deletedDescription}</p>
        </div>
      </ArtifactShell>
    );
  }

  return (
    <ArtifactShell>
      <ArtifactHeader name={name} type={type} size={size} createdAt={createdAt} />
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" className={actionButtonClass} onClick={() => onOpen?.(id)}>
          <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
          <span>{labels.open}</span>
        </button>
        <button type="button" className={actionButtonClass} onClick={() => onDownload?.(id)}>
          <Download className="size-4 shrink-0" aria-hidden="true" />
          <span>{labels.download}</span>
        </button>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button
            type="button"
            className={iconButtonClass}
            onClick={() => onRename?.(id)}
            aria-label={`${labels.rename} ${name}`}
            title={labels.rename}
          >
            <Pencil className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={cn(iconButtonClass, 'hover:bg-red-50 hover:text-red-600')}
            onClick={() => onDelete?.(id)}
            aria-label={`${labels.delete} ${name}`}
            title={labels.delete}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </ArtifactShell>
  );
}

export default ArtifactCard;
