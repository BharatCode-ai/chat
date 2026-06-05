# Roadmap

## Public Release

- Complete secret and workflow audit.
- Publish a clean-history public snapshot.
- Keep production deployment in the private repository until a maintainer
  promotes a release.
- Provide local development without BharatCode production credentials.

## File and Artifact Platform

See `docs/rfcs/0001-file-artifact-platform.md` and
`docs/contributing/file-artifact-first-issues.md`.

Initial contributor-safe slices:

- Local filesystem storage driver.
- File metadata and artifact metadata tests.
- Artifact card UI.
- Library list/search/filter UI.
- MIME detection and validation.
- Processor interfaces for PDF, Office files, CSV, and HTML artifacts.
- Test fixtures for generated artifact versioning.

Maintainer-owned slices:

- Production GCS storage driver.
- Supabase ownership enforcement.
- Production download proxy.
- Quota and retention enforcement.
- Sandbox isolation and artifact upload integration.
- Model gateway and usage accounting integration.

## Later

- Project-owned file spaces.
- Collaborators and access roles.
- Public artifact publishing.
- Native mobile client foundation.
