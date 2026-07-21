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
  let browser;

  try {
    browser = await chromium.launch({
      channel: process.env.CI ? 'chrome' : undefined,
      headless: true,
    });
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
    await browser?.close();
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
