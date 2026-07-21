import { Progress } from '@librechat/client';
import type { LibraryStorageInfo } from '~/types/library';
import { useLocalize } from '~/hooks';
import { formatLibraryFileSize, getStorageUsagePercent } from './libraryUtils';

interface LibraryStorageBarProps {
  storage: LibraryStorageInfo;
}

export default function LibraryStorageBar({ storage }: LibraryStorageBarProps) {
  const localize = useLocalize();
  const percent = getStorageUsagePercent(storage.usedBytes, storage.totalBytes);
  const used = formatLibraryFileSize(storage.usedBytes);
  const total = formatLibraryFileSize(storage.totalBytes);

  return (
    <div className="bg-surface-tertiary/50 rounded-lg border border-border-light px-4 py-3">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-medium text-text-primary">{localize('com_ui_library_storage')}</span>
        <span className="text-text-secondary">
          {localize('com_ui_library_storage_usage', { used, total })}
        </span>
      </div>
      <Progress
        value={percent}
        className="h-2 bg-surface-secondary"
        aria-label={localize('com_ui_library_storage_percent', { percent })}
      />
      <p className="mt-1.5 text-right text-xs text-text-secondary">{percent}%</p>
    </div>
  );
}
