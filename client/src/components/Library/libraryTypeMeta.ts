import {
  AudioPaths,
  CodePaths,
  FilePaths,
  SheetPaths,
  TextPaths,
  VideoPaths,
} from '@librechat/client';
import type { LocalizeFunction } from '~/common';
import type { LibraryItemType } from '~/types/library';
import type { TranslationKeys } from '~/hooks/useLocalize';

export interface LibraryFileType {
  fill: string;
  paths: React.FC;
  title: string;
}

type LibraryFileTypeConfig = Omit<LibraryFileType, 'title'> & { titleKey: TranslationKeys };

export const TYPE_FILE_TYPE_MAP: Record<
  Exclude<LibraryItemType, 'artifact'>,
  LibraryFileTypeConfig
> = {
  pdf: { paths: TextPaths, fill: '#EF4444', titleKey: 'com_ui_library_pdf' },
  image: { paths: FilePaths, fill: '#EC4899', titleKey: 'com_ui_library_image' },
  video: { paths: VideoPaths, fill: '#A855F7', titleKey: 'com_ui_library_video' },
  document: { paths: TextPaths, fill: '#3B82F6', titleKey: 'com_ui_library_document' },
  code: { paths: CodePaths, fill: '#F97316', titleKey: 'com_ui_code' },
  spreadsheet: {
    paths: SheetPaths,
    fill: '#10B981',
    titleKey: 'com_ui_library_spreadsheet',
  },
  audio: { paths: AudioPaths, fill: '#F59E0B', titleKey: 'com_ui_library_audio' },
};

export const TYPE_COLOR_MAP: Record<LibraryItemType, string> = {
  pdf: 'text-red-500',
  image: 'text-pink-500',
  video: 'text-purple-500',
  document: 'text-blue-500',
  code: 'text-orange-500',
  spreadsheet: 'text-emerald-500',
  audio: 'text-amber-500',
  artifact: 'text-violet-500',
};

export function getLibraryFileType(
  type: LibraryItemType,
  localize: LocalizeFunction,
): LibraryFileType | null {
  if (type === 'artifact') {
    return null;
  }

  const { titleKey, ...fileType } = TYPE_FILE_TYPE_MAP[type];
  return { ...fileType, title: localize(titleKey) };
}
