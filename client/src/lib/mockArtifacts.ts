import type { ArtifactStatus } from '~/components/Artifacts/ArtifactCard';

export type MockArtifact = {
  id: string;
  name: string;
  type: string;
  size: string;
  createdAt: string;
  status: ArtifactStatus;
};

export const mockArtifacts: MockArtifact[] = [
  {
    id: 'artifact-1',
    name: 'final-report-semester-2-design-thinking-ai-damage-spotter.pdf',
    type: 'PDF',
    size: '2.4 MB',
    createdAt: '5 minutes ago',
    status: 'ready',
  },
  {
    id: 'artifact-2',
    name: 'very-long-file-name-that-should-not-break-mobile-layout-or-overflow-the-card-final-version.docx',
    type: 'DOC',
    size: '846 KB',
    createdAt: 'Today',
    status: 'ready',
  },
  {
    id: 'artifact-3',
    name: 'loading-file.pdf',
    type: 'PDF',
    size: '',
    createdAt: '',
    status: 'loading',
  },
  {
    id: 'artifact-4',
    name: 'failed-upload.png',
    type: 'IMG',
    size: '1.1 MB',
    createdAt: 'Yesterday',
    status: 'error',
  },
  {
    id: 'artifact-5',
    name: 'deleted-artifact.zip',
    type: 'ZIP',
    size: '4.8 MB',
    createdAt: '2 days ago',
    status: 'deleted',
  },
];
