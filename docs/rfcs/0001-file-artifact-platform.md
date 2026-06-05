# RFC 0001: File and Artifact Platform

## Status

Draft for contributor review.

## Summary

Build a private-first BharatCode file and artifact platform for Chat. Users
should see durable files and generated artifacts in the chat where they were
used and in a global Library. GCS or local disk should be hidden behind a
storage API; tools should return BharatCode file references instead of raw cloud
URLs.

## Goals

- Persist user-facing uploaded and generated files.
- Auto-save major generated artifacts such as PPTX, DOCX, XLSX, PDF, Markdown,
  HTML, CSV, and generated site bundles.
- Keep internal scratch files hidden unless promoted.
- Support versioned artifacts.
- Support local development without BharatCode production credentials.
- Leave room for future project workspaces and public artifact publishing.

## Non-Goals For The First Contributor Slice

- Public sharing pages.
- Collaborative project permissions.
- Production GCS IAM changes.
- Production quota enforcement.
- Sandbox network isolation changes.

## Architecture

Introduce a file/artifact boundary with small, mockable units:

- `StorageDriver`: stores bytes and returns internal object handles.
- `LocalDiskStorageDriver`: contributor/local implementation.
- `GcsStorageDriver`: maintainer-owned production implementation.
- `FileRepository`: metadata, ownership, versions, sizes, MIME types, and
  attachment links.
- `ArtifactRepository`: artifact records, artifact versions, source file
  references, display metadata, and lifecycle state.
- `ProcessorRegistry`: dispatches extraction and preview jobs by MIME type.
- `DownloadService`: verifies ownership and streams bytes or issues short-lived
  signed redirects.

## Data Model

Core entities:

- `files`: one durable logical file.
- `file_versions`: immutable stored versions.
- `artifacts`: user-facing generated or edited work product.
- `artifact_versions`: immutable artifact states.
- `artifact_files`: links artifacts to files and generated derivatives.
- `file_attachments`: links files/artifacts to conversations, messages, future
  projects, or workflow runs.
- `derived_assets`: previews, thumbnails, extracted text, OCR JSON, embeddings,
  and transcripts.

Every record starts as private to one user. Fields for `project_id`,
`visibility`, and future sharing can exist before those features are enabled.

## Storage Paths

Production object layout:

```text
users/{user_id}/files/{file_id}/versions/{version_id}/{object_name}
users/{user_id}/derived/{file_id}/{derived_asset_id}/{object_name}
```

Local object layout:

```text
.bharatcode/storage/users/{user_id}/files/{file_id}/versions/{version_id}/{object_name}
```

## API Shape

Initial routes:

- `POST /api/chat/files/upload`
- `GET /api/chat/files`
- `GET /api/chat/files/:fileId`
- `GET /api/chat/files/:fileId/download`
- `DELETE /api/chat/files/:fileId`
- `POST /api/chat/artifacts`
- `POST /api/chat/artifacts/:artifactId/versions`
- `GET /api/chat/artifacts/:artifactId`

These routes must verify user ownership. They must not expose raw GCS object
paths or long-lived bearer URLs.

## Tool Integration

Sandbox and MCP tools should return structured references:

```json
{
  "type": "bharatcode_file",
  "file_id": "file_...",
  "artifact_id": "artifact_...",
  "name": "presentation.pptx",
  "content_type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "download_url": "/api/chat/files/file_.../download"
}
```

The model-facing response can include the file name and the BharatCode download
URL. It should never include `storage.googleapis.com` URLs.

## UI

Chat should render file/artifact cards with:

- name
- type
- size
- created time
- Open
- Download
- Rename
- Delete

Library should support:

- list
- search
- filter by type
- sort by recent/name/size
- storage usage display
- reuse in a new chat

## Security

- Private by default.
- No public object ACLs.
- Ownership checked before every download.
- Short-lived signed redirects are implementation details.
- HTML previews render in sandboxed iframes with strict CSP.
- Deletion revokes app-level access immediately; hard-delete can be async.
- Fork PRs must not receive BharatCode production secrets.

## Contributor Issue Slices

Good first implementation issues:

- Define TypeScript interfaces for `StorageDriver`.
- Implement `LocalDiskStorageDriver`.
- Add MIME detection and validation tests.
- Add metadata schema tests.
- Build artifact card UI using mocked data.
- Build Library list/filter UI using mocked data.
- Add processor registry interface and no-op processors.
- Add structured tool response parsing tests.

Maintainer issues:

- Implement `GcsStorageDriver`.
- Wire Supabase/BharatCode identity to ownership checks.
- Add production download proxy.
- Add quota enforcement.
- Wire sandbox outputs to the File API.
- Add production monitoring and retention jobs.
