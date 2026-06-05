# Contributing

Thanks for contributing to BharatCode Chat.

Before starting a large feature, open an issue or RFC discussion. Small bug
fixes, tests, docs, and contributor-roadmap items can go straight to a pull
request.

## Setup

```bash
npm ci
cp bharatcode/.env.example .env
cp librechat.example.yaml librechat.yaml
```

## Checks

Run the checks that match your change. At minimum:

```bash
node --test bharatcode/test/config.test.mjs
```

Backend changes should also run:

```bash
npm run build:data-provider
npm run build:data-schemas
npm run build:api
npm run frontend:ci
```

## Pull Requests

- Keep PRs focused.
- Explain the user-facing behavior and test coverage.
- Do not include production credentials or private deployment details.
- Do not add workflows that deploy to BharatCode production.
- Use mocks or local adapters for cloud services.

## First Feature Area

The first contributor roadmap is the File and Artifact Platform:

`docs/rfcs/0001-file-artifact-platform.md`

Good first issues should stay in local storage, mocked APIs, UI cards, Library
UI, MIME detection, or processor interfaces.
