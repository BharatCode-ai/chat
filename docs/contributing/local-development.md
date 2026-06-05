# Local Development

The public repository must be usable without BharatCode production credentials.

## Requirements

- Node.js `20.19.0+` or `22.12.0+`
- npm
- Docker for full local compose flows

## Setup

```bash
npm ci
cp bharatcode/.env.example .env
cp librechat.example.yaml librechat.yaml
```

The example environment uses localhost and placeholder secrets. Replace values
only in your untracked `.env` file.

## Checks

```bash
node --test bharatcode/test/config.test.mjs
npm run build:data-provider
npm run build:data-schemas
npm run build:api
npm run frontend:ci
```

Run narrower test commands for the package or UI area you change.

## Production Access

Contributors do not need:

- BharatCode GCP access
- BharatCode Supabase production secrets
- BharatCode model gateway tokens
- BharatCode GCS bucket credentials
- GHCR deploy tokens

Use mocks, local adapters, and fixtures for those integrations.
