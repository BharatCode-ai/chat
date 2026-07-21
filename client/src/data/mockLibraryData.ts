import type { LibraryItem, LibraryListResponse, LibraryStorageInfo } from '~/types/library';

/** Mock library items covering all supported types and both kinds. */
export const mockLibraryItems: LibraryItem[] = [
  {
    id: 'file_financial_report',
    name: 'Q4 Financial Report.pdf',
    type: 'pdf',
    kind: 'file',
    sizeBytes: 2_458_880,
    createdAt: '2026-05-28T14:22:00.000Z',
    description: 'Quarterly financial summary and projections',
    contentType: 'application/pdf',
  },
  {
    id: 'file_product_mockup',
    name: 'product-mockup-v3.png',
    type: 'image',
    kind: 'file',
    sizeBytes: 1_572_864,
    createdAt: '2026-06-01T09:15:00.000Z',
    description: 'Latest product UI mockup',
    contentType: 'image/png',
  },
  {
    id: 'file_onboarding_demo',
    name: 'onboarding-demo.mp4',
    type: 'video',
    kind: 'file',
    sizeBytes: 45_875_200,
    createdAt: '2026-05-15T11:30:00.000Z',
    description: 'Product onboarding walkthrough',
  },
  {
    id: 'file_project_proposal',
    name: 'Project Proposal.docx',
    type: 'document',
    kind: 'file',
    sizeBytes: 524_288,
    createdAt: '2026-04-20T16:45:00.000Z',
    description: 'Client project proposal draft',
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  {
    id: 'artifact_api_client',
    name: 'api-client.ts',
    type: 'code',
    kind: 'artifact',
    sizeBytes: 12_400,
    createdAt: '2026-06-08T08:10:00.000Z',
    description: 'Generated TypeScript API client',
    conversationId: 'conv-abc123',
  },
  {
    id: 'file_sales_data',
    name: 'sales-data-2026.xlsx',
    type: 'spreadsheet',
    kind: 'file',
    sizeBytes: 892_160,
    createdAt: '2026-05-02T13:00:00.000Z',
    description: 'Annual sales data export',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
  {
    id: 'file_meeting_recording',
    name: 'meeting-recording.mp3',
    type: 'audio',
    kind: 'file',
    sizeBytes: 8_388_608,
    createdAt: '2026-03-18T10:20:00.000Z',
    description: 'Team standup recording',
  },
  {
    id: 'artifact_dashboard_component',
    name: 'dashboard-component.tsx',
    type: 'artifact',
    kind: 'artifact',
    sizeBytes: 18_750,
    createdAt: '2026-06-09T17:45:00.000Z',
    description: 'React dashboard component generated in chat',
    conversationId: 'conv-def456',
  },
  {
    id: 'file_architecture_diagram',
    name: 'architecture-diagram.pdf',
    type: 'pdf',
    kind: 'file',
    sizeBytes: 1_048_576,
    createdAt: '2026-02-10T12:00:00.000Z',
    description: 'System architecture overview',
    contentType: 'application/pdf',
  },
  {
    id: 'artifact_python_utils',
    name: 'utils.py',
    type: 'code',
    kind: 'artifact',
    sizeBytes: 6_200,
    createdAt: '2026-06-07T14:30:00.000Z',
    description: 'Python utility functions',
    conversationId: 'conv-ghi789',
  },
  {
    id: 'file_team_photo',
    name: 'team-photo.jpg',
    type: 'image',
    kind: 'file',
    sizeBytes: 3_145_728,
    createdAt: '2026-01-25T18:00:00.000Z',
    description: 'Company team photo',
    contentType: 'image/jpeg',
  },
  {
    id: 'artifact_readme',
    name: 'README.md',
    type: 'document',
    kind: 'artifact',
    sizeBytes: 4_800,
    createdAt: '2026-06-06T11:00:00.000Z',
    description: 'Project documentation generated in chat',
    conversationId: 'conv-jkl012',
    contentType: 'text/markdown',
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
