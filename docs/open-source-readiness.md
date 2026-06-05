# Open-Source Readiness Checklist

This checklist must pass before a public remote is created or made visible.

## Repository Strategy

- Keep `BharatCode-ai/bharatcode-chat` private as the production/deploy repo.
- Publish a fresh clean-history public snapshot instead of exposing private
  history.
- Preferred public naming: `BharatCode-ai/chat`.
- Confirm write access to `BharatCode-ai`, then publish the sanitized snapshot
  to `BharatCode-ai/chat`.

## Secret Audit

- Run Gitleaks on private history with redaction.
- Run TruffleHog verified-only on private history.
- Run Gitleaks on the sanitized snapshot with the public allowlist.
- Run TruffleHog verified-only on the sanitized snapshot.
- Rotate any BharatCode production token that appears in a finding, workflow
  log, release asset, image layer, or public snapshot.

Initial prep evidence:

- TruffleHog verified-only scan of the private repo reported zero verified
  findings.
- Gitleaks scan of private history reported findings in upstream examples,
  tests, docs, and old history. A clean-history snapshot avoids publishing that
  history.
- Gitleaks and TruffleHog scans of the sanitized one-commit public snapshot
  reported no leaks or verified secrets.
- Clean-clone dry-run scans of the sanitized snapshot reported no leaks or
  verified secrets.

## Workflow Audit

Public repo workflows must not:

- deploy to BharatCode production
- publish packages to NPM
- push images with production credentials from fork PRs
- access BharatCode GCP, Supabase, GHCR deploy credentials, or model gateway
  secrets

Public repo workflows may:

- run lint and tests
- build the app
- run Docker smoke checks without secrets
- run secret scanning
- publish images only from protected maintainer environments

## Configuration Audit

- `.env` files remain ignored.
- `.env.example` files contain placeholders or localhost values only.
- Production domains may appear in docs as examples, not as active required
  config for local development.
- Production config lives in private deployment systems.

## Attribution and Branding

- Preserve LibreChat MIT license attribution.
- Add BharatCode README, NOTICE, and trademark policy.
- Remove upstream-only badges, issue templates, deploy links, and community
  links that do not apply to BharatCode.

## Dry Run

From a clean clone of the sanitized snapshot:

```bash
npm ci
node --test bharatcode/test/config.test.mjs
npm run build:data-provider
npm run build:data-schemas
npm run build:api
npm run frontend:ci
docker run --rm -v "$PWD:/repo:ro" -v "$PWD:/audit" ghcr.io/gitleaks/gitleaks:latest detect --source=/repo --config=/repo/.gitleaks.toml --redact=100
docker run --rm -v "$PWD:/repo:ro" trufflesecurity/trufflehog:latest filesystem /repo --only-verified --no-update --json
```

Do not publish until the dry run is complete and reviewed by a maintainer.

## Dependency Audit Gate

The initial clean install reported production dependency vulnerabilities. A
non-forcing `npm audit fix` has been applied, and the optional browser RUM
dependency was upgraded to `@hyperdx/browser@^0.24.0` to clear the high and
critical production findings. `npm audit --omit=dev --audit-level=high` now
passes. `npm audit --omit=dev` still reports five moderate advisories through
the `@librechat/agents` / LangChain / `uuid` transitive chain.

Before publishing, maintainers must choose one of these paths:

- upgrade and verify the affected dependencies
- keep the initial public release blocked only on high/critical findings and
  open a follow-up issue for the remaining moderate advisories
- remove/disable affected optional integration paths if they become reachable
  in BharatCode Chat

Dependabot is configured in `.github/dependabot.yml`, but Dependabot is not a
substitute for reviewing the remaining audit findings.
