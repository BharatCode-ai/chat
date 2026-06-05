# Contributor Guidance

This project is a BharatCode-maintained fork of LibreChat. Keep changes scoped,
testable, and easy to review.

## Workspace Boundaries

- `client`: React frontend.
- `api`: legacy Express backend entrypoints.
- `packages/api`: TypeScript backend logic used by `api`.
- `packages/data-provider`: shared API types, endpoints, and data-service code.
- `packages/data-schemas`: database schemas and shared persistence types.
- `bharatcode`: BharatCode product config and tests.

Prefer new backend logic in `packages/api`, with thin wrappers in `api` only
when necessary.

## Public Repo Rules

- Do not commit production secrets, `.env` files, service account keys, browser
  storage state, or deployment credentials.
- Do not add workflows that deploy to BharatCode production from public PRs.
- Do not require BharatCode production credentials for local development or
  unit tests.
- Use adapters and mocks for GCS, Supabase, model gateway, and sandbox
  integrations.
- Keep LibreChat attribution intact.

## Development Checks

Use targeted checks while the public snapshot is being stabilized:

```bash
node --test bharatcode/test/config.test.mjs
npm run build:data-provider
npm run build:data-schemas
npm run build:api
npm run frontend:ci
```

Run narrower package or client tests for the files you change.
