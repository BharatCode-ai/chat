# Chat Frontend Runtime Recovery Design

## Incident

`chat.bharatcode.ai` serves HTML and static assets successfully, but the browser stops during
startup with `ReferenceError: regeneratorRuntime is not defined`. The emitted Vite 8 vendor chunk
executes transpiled generator code from `react-speech-recognition` before the bundled
`regenerator-runtime` initializer. The service worker also calls a Workbox navigation handler for
`index.html` while `index.html` is explicitly excluded from the precache.

## Recovery

Restore the last known-good frontend toolchain from before public PR #58:

- `vite`: `^7.3.1`
- `@vitejs/plugin-react`: `^5.1.4`
- `vite-plugin-pwa`: `^1.2.0`
- `vite-plugin-node-polyfills`: `^0.25.0`

Keep the current application code and all later product changes. Remove `index.html` from the PWA
`globIgnores` list so Workbox can precache its configured navigation fallback.

## Regression Protection

Add a production-build smoke check that:

1. verifies `client/dist/index.html` and `client/dist/sw.js` exist;
2. verifies the generated service worker precaches `index.html`;
3. serves `client/dist` over localhost;
4. opens the built app in headless Chromium; and
5. fails on uncaught page exceptions, including the observed `regeneratorRuntime` crash.

Wire this check into `frontend:ci` after the build. It must fail against the currently deployed
Vite 8 output and pass after the rollback.

## Release Path

Publish a narrowly scoped public hotfix PR, merge after required checks, sync that exact public
commit into the private deployment repository, build and deploy through the existing production
path, then verify the live page, API health, browser console, service worker, and rollback target.
No credentials or private deployment details belong in the public PR.

## Acceptance Criteria

- The public hotfix contains only the dependency rollback, PWA fallback correction, smoke check,
  and incident documentation.
- The production client build completes with the Vite 7 toolchain.
- The runtime smoke check reports no uncaught browser exception.
- The generated service worker precaches `index.html`.
- `chat.bharatcode.ai` renders in a clean browser session after deployment.
- Existing API and container health checks remain green.

