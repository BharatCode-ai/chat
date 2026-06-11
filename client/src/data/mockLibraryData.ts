import type { LibraryItem, LibraryListResponse, LibraryStorageInfo } from '~/types/library';

/** Mock library items covering all supported types and both kinds. */
export const mockLibraryItems: LibraryItem[] = [
  {
    id: 'lib-001',
    name: 'Q4 Financial Report.pdf',
    type: 'pdf',
    kind: 'file',
    sizeBytes: 2_458_880,
    createdAt: '2026-05-28T14:22:00.000Z',
    description: 'Quarterly financial summary and projections',
    mimeType: 'application/pdf',
  },
  {
    id: 'lib-002',
    name: 'product-mockup-v3.png',
    type: 'image',
    kind: 'file',
    sizeBytes: 1_572_864,
    createdAt: '2026-06-01T09:15:00.000Z',
    description: 'Latest product UI mockup',
    mimeType: 'image/png',
  },
  {
    id: 'lib-003',
    name: 'onboarding-demo.mp4',
    type: 'video',
    kind: 'file',
    sizeBytes: 45_875_200,
    createdAt: '2026-05-15T11:30:00.000Z',
    description: 'Product onboarding walkthrough',
    mimeType: 'video/mp4',
  },
  {
    id: 'lib-004',
    name: 'Project Proposal.docx',
    type: 'document',
    kind: 'file',
    sizeBytes: 524_288,
    createdAt: '2026-04-20T16:45:00.000Z',
    description: 'Client project proposal draft',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  {
    id: 'lib-005',
    name: 'api-client.ts',
    type: 'code',
    kind: 'artifact',
    sizeBytes: 12_400,
    createdAt: '2026-06-08T08:10:00.000Z',
    description: 'Generated TypeScript API client',
    conversationId: 'conv-abc123',
    mimeType: 'text/typescript',
  },
  {
    id: 'lib-006',
    name: 'sales-data-2026.xlsx',
    type: 'spreadsheet',
    kind: 'file',
    sizeBytes: 892_160,
    createdAt: '2026-05-02T13:00:00.000Z',
    description: 'Annual sales data export',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
  {
    id: 'lib-007',
    name: 'meeting-recording.mp3',
    type: 'audio',
    kind: 'file',
    sizeBytes: 8_388_608,
    createdAt: '2026-03-18T10:20:00.000Z',
    description: 'Team standup recording',
    mimeType: 'audio/mpeg',
  },
  {
    id: 'lib-008',
    name: 'dashboard-component.tsx',
    type: 'artifact',
    kind: 'artifact',
    sizeBytes: 18_750,
    createdAt: '2026-06-09T17:45:00.000Z',
    description: 'React dashboard component generated in chat',
    conversationId: 'conv-def456',
    mimeType: 'text/typescript',
  },
  {
    id: 'lib-009',
    name: 'architecture-diagram.pdf',
    type: 'pdf',
    kind: 'file',
    sizeBytes: 1_048_576,
    createdAt: '2026-02-10T12:00:00.000Z',
    description: 'System architecture overview',
    mimeType: 'application/pdf',
  },
  {
    id: 'lib-010',
    name: 'utils.py',
    type: 'code',
    kind: 'artifact',
    sizeBytes: 6_200,
    createdAt: '2026-06-07T14:30:00.000Z',
    description: 'Python utility functions',
    conversationId: 'conv-ghi789',
    mimeType: 'text/x-python',
  },
  {
    id: 'lib-011',
    name: 'team-photo.jpg',
    type: 'image',
    kind: 'file',
    sizeBytes: 3_145_728,
    createdAt: '2026-01-25T18:00:00.000Z',
    description: 'Company team photo',
    mimeType: 'image/jpeg',
  },
  {
    id: 'lib-012',
    name: 'README.md',
    type: 'document',
    kind: 'artifact',
    sizeBytes: 4_800,
    createdAt: '2026-06-06T11:00:00.000Z',
    description: 'Project documentation generated in chat',
    conversationId: 'conv-jkl012',
    mimeType: 'text/markdown',
  },
];

/** Mock storage quota — 64.2 MB used of 1 GB. */
export const mockLibraryStorage: LibraryStorageInfo = {
  usedBytes: 67_289_344,
  totalBytes: 1_073_741_824,
};

/** Full mock API response shape. */
export const mockLibraryResponse: LibraryListResponse = {
  items: mockLibraryItems,
  storage: mockLibraryStorage,
};

/** Empty library response for testing empty state. */
export const mockEmptyLibraryResponse: LibraryListResponse = {
  items: [],
  storage: { usedBytes: 0, totalBytes: 1_073_741_824 },
};