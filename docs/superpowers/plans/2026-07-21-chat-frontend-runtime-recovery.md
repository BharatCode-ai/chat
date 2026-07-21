# Chat Frontend Runtime Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the production chat UI and prevent browser-startup and service-worker fallback regressions from passing CI.

**Architecture:** Roll back only the four frontend build-tool packages introduced by public PR #58, while retaining all application changes. Add a Node/Playwright smoke harness that serves the generated static client, checks Workbox output, and opens the real production bundle in Chromium so emitted-chunk ordering failures are observable.

**Tech Stack:** npm workspaces, Vite 7, React 18, vite-plugin-pwa/Workbox, Node.js HTTP server, Playwright Chromium.

## Global Constraints

- Use `vite` `^7.3.1`, `@vitejs/plugin-react` `^5.1.4`, `vite-plugin-pwa` `^1.2.0`, and `vite-plugin-node-polyfills` `^0.25.0`.
- Preserve all application changes after public PR #58.
- Keep production credentials and private deployment details out of the public repository.
- The smoke check must execute the built browser bundle and fail on uncaught page exceptions.
- The generated service worker must precache `index.html`.

---

### Task 1: Production-bundle regression smoke check

**Files:**

- Create: `client/scripts/smoke-built-client.cjs`
- Modify: `package.json`
- Test: `client/scripts/smoke-built-client.cjs`

**Interfaces:**

- Consumes: `client/dist/index.html`, `client/dist/sw.js`, and the root `playwright` dependency.
- Produces: root npm script `smoke:client-runtime`; `frontend:ci` invokes it after building.

- [ ] **Step 1: Write the failing smoke check**

Create a CommonJS script that asserts the build files exist, checks `sw.js` for an `index.html`
precache entry, serves `client/dist` on an ephemeral localhost port, launches Playwright Chromium,
captures `pageerror` events, loads `/`, and exits non-zero if an uncaught exception occurred.

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const distDir = path.resolve(__dirname, '..', 'dist');
const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.webmanifest', 'application/manifest+json'],
]);

function createStaticServer() {
  return http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
    let filePath = path.resolve(distDir, relativePath);
    if (!filePath.startsWith(`${distDir}${path.sep}`) || !fs.existsSync(filePath)) {
      filePath = path.join(distDir, 'index.html');
    }
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': contentTypes.get(path.extname(filePath)) ?? 'application/octet-stream',
      'Service-Worker-Allowed': '/',
    });
    fs.createReadStream(filePath).pipe(response);
  });
}

async function main() {
  const indexPath = path.join(distDir, 'index.html');
  const serviceWorkerPath = path.join(distDir, 'sw.js');
  assert.ok(fs.existsSync(indexPath), `Missing production build: ${indexPath}`);
  assert.ok(fs.existsSync(serviceWorkerPath), `Missing service worker: ${serviceWorkerPath}`);

  const server = createStaticServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.stack ?? error.message));
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    assert.deepEqual(pageErrors, [], `Uncaught browser errors:\n${pageErrors.join('\n\n')}`);

    const serviceWorker = fs.readFileSync(serviceWorkerPath, 'utf8');
    assert.match(
      serviceWorker,
      /(?:url:|["']url["']:)\s*["']index\.html["']/,
      'The service worker must precache the index.html navigation fallback',
    );
  } finally {
    await browser.close();
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
  console.log('Production client runtime smoke check passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Wire the check into npm scripts**

Set `smoke:client-runtime` to `node client/scripts/smoke-built-client.cjs` and append
`&& npm run smoke:client-runtime` to `frontend:ci`.

```json
{
  "scripts": {
    "frontend:ci": "npm run build:data-provider && npm run build:client-package && cd client && npm run build:ci && cd .. && npm run smoke:client-runtime",
    "smoke:client-runtime": "node client/scripts/smoke-built-client.cjs"
  }
}
```

- [ ] **Step 3: Verify RED against the Vite 8 build**

Run: `npm ci && npm run frontend:ci`

Expected: FAIL because the emitted app raises `regeneratorRuntime is not defined` and/or because
the generated Workbox precache omits `index.html`.

- [ ] **Step 4: Commit the regression check**

Run: `git add package.json client/scripts/smoke-built-client.cjs && git commit -m "test: smoke production client runtime"`

### Task 2: Restore the known-good frontend build pipeline

**Files:**

- Modify: `client/package.json`
- Modify: `package-lock.json`
- Modify: `client/vite.config.ts`
- Test: `client/scripts/smoke-built-client.cjs`

**Interfaces:**

- Consumes: the smoke script and npm scripts from Task 1.
- Produces: a Vite 7 production bundle whose runtime initializes successfully and whose service worker precaches `index.html`.

- [ ] **Step 1: Apply the minimal toolchain rollback**

Change only these devDependency ranges in `client/package.json`: Vite `^8.1.0` to `^7.3.1`,
plugin-react `^6.0.3` to `^5.1.4`, PWA `^1.3.0` to `^1.2.0`, and node polyfills `^0.28.0`
to `^0.25.0`. Regenerate `package-lock.json` from that manifest.

```json
{
  "devDependencies": {
    "@vitejs/plugin-react": "^5.1.4",
    "vite": "^7.3.1",
    "vite-plugin-node-polyfills": "^0.25.0",
    "vite-plugin-pwa": "^1.2.0"
  }
}
```

- [ ] **Step 2: Correct the Workbox fallback manifest**

Change `globIgnores: ['images/**/*', '**/*.map', 'index.html', 'assets/rum.*.js']` to
`globIgnores: ['images/**/*', '**/*.map', 'assets/rum.*.js']` in `client/vite.config.ts`.

```ts
globIgnores: ['images/**/*', '**/*.map', 'assets/rum.*.js'],
```

- [ ] **Step 3: Verify GREEN with the focused build and smoke check**

Run: `npm ci && npm run frontend:ci`

Expected: PASS; the browser reports zero uncaught page exceptions and `sw.js` contains the
`index.html` precache entry.

- [ ] **Step 4: Run targeted repository checks**

Run: `node --test bharatcode/test/config.test.mjs && npm run build:data-schemas && npm run build:api`

Expected: all commands PASS.

- [ ] **Step 5: Commit the recovery**

Run: `git add client/package.json package-lock.json client/vite.config.ts && git commit -m "fix: restore chat frontend runtime"`

### Task 3: Release and production verification

**Files:**

- No public source files beyond Tasks 1–2.
- Private sync and deployment files only if required by the repository's existing release process.

**Interfaces:**

- Consumes: reviewed public hotfix commit.
- Produces: deployed production image and recorded rollback commit/image.

- [ ] **Step 1: Push the public branch and open a public-safe hotfix PR**

Include the observed browser error, root cause, red/green smoke evidence, and rollback scope. Do
not include deployment topology, credentials, private repository links, or private image names.

- [ ] **Step 2: Confirm required public checks and merge**

Expected: required checks PASS and the merge commit is recorded.

- [ ] **Step 3: Sync the exact public merge into the private deployment branch**

Open the private integration PR through the existing sync workflow and verify its required checks.

- [ ] **Step 4: Deploy through the existing production process**

Record the previous production revision before rollout, build the new image, update the service,
and retain the previous image/revision as the rollback target.

- [ ] **Step 5: Verify production**

Check HTTPS root and `/api/config`, container/service health, a clean-browser page load, absence of
uncaught console errors, successful service-worker activation, and one authenticated chat flow.
Roll back immediately if the UI, API, or chat request path fails.
