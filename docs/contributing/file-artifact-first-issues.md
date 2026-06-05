# File and Artifact Platform: First Contributor Issues

Use these issue scopes for the first public contributor work on RFC 0001. Each
task must run locally without BharatCode production credentials and must use
mocks or local-only adapters for production services.

## Contributor-Owned Issues

### 1. Storage Driver Interfaces

Scope:

- Define `StorageDriver` and related result/error types.
- Cover write, read, metadata, delete, and copy/version operations.
- Add unit tests for expected driver behavior using an in-memory fake.

Out of scope:

- GCS, signed URLs, IAM, quotas, and production object paths.
- Supabase or BharatCode identity integration.

Acceptance criteria:

- Interfaces are small and mockable.
- Tests describe success and common error cases.
- No production credential or cloud SDK is required.

### 2. Local Disk Storage Driver

Scope:

- Implement `LocalDiskStorageDriver` behind the `StorageDriver` interface.
- Store files under `.bharatcode/storage`.
- Prevent path traversal and unsafe object names.

Out of scope:

- GCS parity behavior.
- Production retention and cleanup jobs.

Acceptance criteria:

- Unit tests cover write/read/delete/version paths.
- Path traversal attempts fail.
- Generated local files are ignored by git.

### 3. File and Artifact Metadata Schemas

Scope:

- Add schema/type tests for `files`, `file_versions`, `artifacts`,
  `artifact_versions`, `artifact_files`, `file_attachments`, and
  `derived_assets`.
- Include ownership, MIME, size, lifecycle, version, and visibility fields.

Out of scope:

- Database migrations against production data.
- Supabase ownership enforcement.

Acceptance criteria:

- Tests validate required fields and default privacy.
- Model shape leaves room for future projects and sharing.
- No production database connection is required.

### 4. MIME Detection and Validation

Scope:

- Add MIME detection helpers and tests for PDF, DOCX, PPTX, XLSX, CSV,
  Markdown, HTML, plain text, and common image types.
- Reject unsupported or ambiguous inputs with stable errors.

Out of scope:

- OCR, embedding, preview generation, and malware scanning.

Acceptance criteria:

- Tests use small local fixtures.
- Extension-only spoofing is rejected where content sniffing is available.
- Error messages are suitable for API responses.

### 5. Processor Registry Skeleton

Scope:

- Add a `ProcessorRegistry` interface and no-op processor implementations.
- Route supported MIME types to named processor capabilities.
- Include tests for registration and dispatch behavior.

Out of scope:

- Real PDF parsing, Office conversion, OCR, embeddings, and sandbox execution.

Acceptance criteria:

- Registry is dependency-injected and easy to test.
- Unsupported MIME types produce deterministic errors.
- No external binaries are required.

### 6. Artifact Card UI With Mock Data

Scope:

- Build a reusable artifact card component for chat messages.
- Show name, type, size, created time, open/download actions, rename, and
  delete affordances.
- Use mocked data and local story/test fixtures.

Out of scope:

- Real download endpoints.
- Production artifact permissions.

Acceptance criteria:

- Component handles long filenames and mobile widths.
- Loading, error, and deleted states are represented.
- No cloud URL is rendered in the UI.

### 7. Library List UI With Mock Data

Scope:

- Build a Library view prototype with list, search, type filter, sort, and
  storage usage display.
- Use mocked files and artifacts.

Out of scope:

- Real API integration.
- Cross-user sharing and project workspaces.

Acceptance criteria:

- Empty, loading, populated, and error states are covered.
- Search/filter/sort behavior is tested.
- UI does not assume GCS or Supabase implementation details.

### 8. Structured Tool Response Parsing Tests

Scope:

- Add tests that parse tool responses shaped like `bharatcode_file`.
- Verify chat rendering uses app-relative download URLs.
- Reject raw `storage.googleapis.com` URLs in model-facing responses.

Out of scope:

- Sandbox uploads and production tool orchestration.

Acceptance criteria:

- Parser accepts valid structured file references.
- Parser rejects malformed IDs, unsafe URLs, and missing ownership context.
- Tests document the model-facing response contract.

## Maintainer-Owned Work

These tasks should stay private or maintainer-only until the contributor
interfaces above are stable:

- Production `GcsStorageDriver`.
- Supabase identity and ownership enforcement.
- Production download proxy and signed redirects.
- Quota, retention, monitoring, and deletion jobs.
- Sandbox isolation, artifact upload integration, and network policy.
- Model gateway and usage accounting integration.

## Issue Template Defaults

When opening GitHub issues from this list, include:

- Label: `help wanted`
- Optional label: `good first issue` for issues 1, 4, 6, and 8
- RFC link: `docs/rfcs/0001-file-artifact-platform.md`
- Security note: no production credentials, no cloud IAM, no deployment changes
