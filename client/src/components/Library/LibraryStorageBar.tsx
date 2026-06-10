import { Progress } from '@librechat/client';
import type { LibraryStorageInfo } from '~/types/library';
import {
  formatLibraryFileSize,
  getStorageUsagePercent,
} from './libraryUtils';

interface LibraryStorageBarProps {
  storage: LibraryStorageInfo;
}

export default function LibraryStorageBar({ storage }: LibraryStorageBarProps) {
  const percent = getStorageUsagePercent(storage.usedBytes, storage.totalBytes);

  return (
    <div className="rounded-lg border border-border-light bg-surface-tertiary/50 px-4 py-3">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-medium text-text-primary">Storage</span>
        <span className="text-text-secondary">
          {formatLibraryFileSize(storage.usedBytes)} of {formatLibraryFileSize(storage.totalBytes)}{' '}
          used
        </span>
      </div>
      <Progress
        value={percent}
        className="h-2 bg-surface-secondary"
        aria-label={`Storage ${percent}% used`}
      />
      <p className="mt-1.5 text-right text-xs text-text-secondary">{percent}%</p>
    </div>
  );
}