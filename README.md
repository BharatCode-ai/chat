# BharatCode Chat

BharatCode Chat is the open-source chat application for BharatCode. It is a
BharatCode-branded fork of LibreChat focused on one default BharatCode model,
shared BharatCode identity, persistent files, artifacts, and workflow tools.

This repository is intended for public development. BharatCode production
deployment, cloud credentials, model gateway secrets, GCS bucket permissions,
and VM/runtime state are kept outside this repository.

## Repository Status

This snapshot is being prepared for public release. Before publishing a public
remote, maintainers must complete the checklist in
[`docs/open-source-readiness.md`](docs/open-source-readiness.md).

The private production repository remains the source of truth for
`chat.bharatcode.ai` deployment until a maintainer explicitly promotes a public
release.

## What Contributors Can Work On

The first contributor-facing feature is the BharatCode File and Artifact
Platform. See:

- [`docs/rfcs/0001-file-artifact-platform.md`](docs/rfcs/0001-file-artifact-platform.md)
- [`docs/contributing/file-artifact-first-issues.md`](docs/contributing/file-artifact-first-issues.md)
- [`ROADMAP.md`](ROADMAP.md)

Contributor-safe first tasks include local file storage, metadata schema tests,
artifact cards, Library UI, MIME detection, and processor interfaces. Production
GCS, Supabase ownership, quotas, model gateway integration, and sandbox
isolation remain maintainer-owned.

## Local Development

1. Install Node.js `20.19.0+` or `22.12.0+`.
2. Install dependencies:

   ```bash
   npm ci
   ```

3. Copy local environment files:

   ```bash
   cp bharatcode/.env.example .env
   cp librechat.example.yaml librechat.yaml
   ```

4. Run targeted checks:

   ```bash
   node --test bharatcode/test/config.test.mjs
   npm run build:data-provider
   npm run build:data-schemas
   npm run build:api
   npm run frontend:ci
   ```

The public `.env.example` values use localhost and placeholders. They do not
grant access to BharatCode production services.

## Production Configuration

Production BharatCode Chat uses private runtime configuration for:

- Supabase OAuth/OIDC client secret
- BharatCode model gateway token
- GCS artifact bucket IAM
- sandbox/toolbox deployment
- GHCR deployment credentials
- GCP VM and DNS/TLS state

Do not add production values to this repository. Use GitHub protected
environments, Secret Manager, VM runtime env files, or another private secret
system.

## Attribution

BharatCode Chat is derived from LibreChat and keeps the same MIT license. See
[`NOTICE.md`](NOTICE.md) for attribution and [`LICENSE`](LICENSE) for license
terms.

## Trademarks

The source code is open-source, but the BharatCode name, logo, and marks are not
licensed for unrelated products. See [`TRADEMARKS.md`](TRADEMARKS.md).
