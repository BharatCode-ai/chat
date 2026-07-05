import {
  AudioPaths,
  CodePaths,
  FilePaths,
  SheetPaths,
  TextPaths,
  VideoPaths,
} from '@librechat/client';
import type { LibraryItemType } from '~/types/library';

export interface LibraryFileType {
  fill: string;
  paths: React.FC;
  title: string;
}

export const TYPE_FILE_TYPE_MAP: Record<Exclude<LibraryItemType, 'artifact'>, LibraryFileType> = {
  pdf: { paths: TextPaths, fill: '#EF4444', title: 'PDF' },
  image: { paths: FilePaths, fill: '#EC4899', title: 'Image' },
  video: { paths: VideoPaths, fill: '#A855F7', title: 'Video' },
  document: { paths: TextPaths, fill: '#3B82F6', title: 'Document' },
  code: { paths: CodePaths, fill: '#F97316', title: 'Code' },
  spreadsheet: { paths: SheetPaths, fill: '#10B981', title: 'Spreadsheet' },
  audio: { paths: AudioPaths, fill: '#F59E0B', title: 'Audio' },
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
): LibraryFileType | null {
  return type === 'artifact' ? null : TYPE_FILE_TYPE_MAP[type];
}
