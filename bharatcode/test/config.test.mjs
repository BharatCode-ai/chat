import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function file(path) {
  return readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
}

function fileBuffer(path) {
  return readFileSync(new URL(`../../${path}`, import.meta.url));
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

test('BharatCode fork metadata points at the BharatCode chat repository', () => {
  const pkg = JSON.parse(file('package.json'));

  assert.equal(pkg.name, 'bharatcode-chat');
  assert.match(pkg.description, /BharatCode Chat/);
  assert.equal(pkg.repository.url, 'git+https://github.com/BharatCode-ai/chat.git');
  assert.equal(pkg.homepage, 'https://bharatcode.ai/chat');
  assert.equal(pkg.license, 'MIT');

  for (const packagePath of [
    'api/package.json',
    'client/package.json',
    'packages/api/package.json',
    'packages/client/package.json',
    'packages/data-provider/package.json',
    'packages/data-schemas/package.json',
  ]) {
    const workspacePkg = JSON.parse(file(packagePath));

    assert.match(workspacePkg.description, /BharatCode Chat/);
    assert.match(workspacePkg.repository.url, /github\.com\/BharatCode-ai\/chat/);
    assert.equal(workspacePkg.bugs.url, 'https://github.com/BharatCode-ai/chat/issues');
    assert.equal(workspacePkg.homepage, 'https://bharatcode.ai/chat');
    assert.equal(workspacePkg.license, 'MIT');
  }
});

test('BharatCode public snapshot has safe contributor workflows only', () => {
  const ci = file('.github/workflows/ci.yml');
  const secretScan = file('.github/workflows/secret-scan.yml');

  assert.match(ci, /node --test bharatcode\/test\/config\.test\.mjs/);
  assert.match(ci, /npm run build:api/);
  assert.match(ci, /npm run frontend:ci/);
  assert.match(secretScan, /gitleaks\/gitleaks-action/);

  for (const removedWorkflow of [
    '.github/workflows/bharatcode-chat-image.yml',
    '.github/workflows/deploy.yml',
    '.github/workflows/deploy-dev.yml',
    '.github/workflows/client.yml',
    '.github/workflows/data-provider.yml',
    '.github/workflows/data-schemas.yml',
    '.github/workflows/locize-i18n-sync.yml',
  ]) {
    assert.throws(() => file(removedWorkflow), /ENOENT/);
  }
});

test('BharatCode LibreChat config exposes only one BharatCode model/provider', () => {
  const config = file('bharatcode/librechat.yaml');

  assert.match(config, /mcpSettings:/);
  assert.match(config, /sandbox-orchestrator:8080/);
  assert.match(config, /mcpServers:/);
  assert.match(config, /bharatcode_tools:/);
  assert.match(config, /type: streamable-http/);
  assert.match(config, /name: "BharatCode"/);
  assert.match(config, /baseURL: "\$\{BHARATCODE_MODEL_BASE_URL\}"/);
  assert.match(config, /apiKey: "\$\{BHARATCODE_CHAT_GATEWAY_TOKEN\}"/);
  assert.match(config, /x-bharatcode-user-id: "\{\{LIBRECHAT_USER_OPENIDID\}\}"/);
  assert.match(config, /x-bharatcode-user-email: "\{\{LIBRECHAT_USER_EMAIL\}\}"/);
  assert.match(config, /x-bharatcode-user-name: "\{\{LIBRECHAT_USER_NAME\}\}"/);
  assert.match(config, /x-bharatcode-chat-user-id: "\{\{LIBRECHAT_USER_ID\}\}"/);
  assert.match(config, /model: "bharatcode:qwen36-35b-awq-200k"/);
  assert.match(config, /modelSpecs:/);
  assert.match(config, /label: "BharatCode"/);
  assert.match(config, /mcpServers:\n\s+- "bharatcode_tools"/);
  assert.match(config, /webSearch: true/);
  assert.match(config, /fileSearch: true/);
  assert.match(config, /executeCode: true/);
  assert.match(config, /artifacts: true/);
  assert.match(config, /modelSelect: false/);
  assert.match(config, /endpointsMenu: false/);
  assert.match(config, /buildInfo: false/);
  assert.match(config, /create: false/);
  assert.doesNotMatch(config, /OpenAI|Anthropic|Gemini|OpenRouter|Groq/);
});

test('BharatCode public environment template uses local placeholders', () => {
  const env = file('bharatcode/.env.example');

  assert.match(env, /APP_TITLE=BharatCode Chat/);
  assert.match(env, /CUSTOM_FOOTER=BharatCode Chat/);
  assert.match(env, /HELP_AND_FAQ_URL=https:\/\/bharatcode\.ai/);
  assert.match(env, /NODE_ENV=development/);
  assert.match(env, /DOMAIN_CLIENT=http:\/\/localhost:3080/);
  assert.match(env, /ALLOW_EMAIL_LOGIN=false/);
  assert.match(env, /ALLOW_REGISTRATION=false/);
  assert.match(env, /OPENID_ISSUER=http:\/\/localhost:54321\/auth\/v1/);
  assert.match(env, /BHARATCODE_MODEL_BASE_URL=http:\/\/localhost:8081\/api\/model\/v1/);
  assert.match(env, /BHARATCODE_MODEL_NAME=bharatcode:qwen36-35b-awq-200k/);
  assert.match(env, /BHARATCODE_CHAT_GATEWAY_TOKEN=/);
  assert.match(env, /BHARATCODE_CHAT_ARTIFACT_BUCKET=local-chat-artifacts/);
  assert.doesNotMatch(env, /evgvlcaxfpwupaiwzqqm|app\.bharatcode\.ai|chat\.bharatcode\.ai|bharatcode-chat-artifacts/);
  assert.doesNotMatch(env, /OPENAI_API_KEY|ANTHROPIC_API_KEY|GOOGLE_KEY|OPENROUTER_KEY/);
});

test('BharatCode client shell carries BharatCode title, mark, and visual tokens', () => {
  const html = file('client/index.html');
  const style = file('client/src/style.css');
  const mark = file('client/public/assets/bharatcode-mark.svg');
  const logo = file('client/public/assets/logo.svg');

  assert.match(html, /<title>BharatCode Chat<\/title>/);
  assert.match(html, /shared BharatCode model/);
  assert.match(html, /theme-color" content="#f6f1e5"/);
  assert.match(style, /--bc-ivory: #f6f1e5/);
  assert.match(style, /--bc-green: #123f35/);
  assert.match(style, /--bc-saffron: #ff8a3d/);
  assert.match(mark, /aria-label="BharatCode mark"/);
  assert.match(mark, /M194 142 84 256l110 114/);
  assert.match(mark, /m318 142 110 114-110 114/);
  assert.doesNotMatch(mark, /#00f078|#00f018|M158 102/i);
  assert.equal(logo, mark);
});

test('BharatCode PWA manifest and raster icons do not ship LibreChat branding', () => {
  const vite = file('client/vite.config.ts');
  const legacyLibreChatIconHashes = new Set([
    'b187f0d9fce56e5245887adb8231a7c43273ededa7c2d73686dc48af55d8de17',
    'eabc65588da24b722a86644f10e2808293590191e8f78b3c8ef009ef82a31311',
    '80fd9c887f137e015f4ee0f8d7324aff65f4caadcb065196b9cb52351c8f1974',
    '8c1542988875ee55075617e1b1895e5ba1728740d42202a2144f8ddcd73bc07a',
    'fd6c0d7d5b8ecc8ebcb3278254b87087321f8c73929271492e1ff3f52a09d185',
  ]);

  assert.match(vite, /name: 'BharatCode Chat'/);
  assert.match(vite, /short_name: 'BharatCode'/);
  assert.match(vite, /background_color: '#f6f1e5'/);
  assert.match(vite, /theme_color: '#123f35'/);

  for (const iconPath of [
    'client/public/assets/favicon-16x16.png',
    'client/public/assets/favicon-32x32.png',
    'client/public/assets/apple-touch-icon-180x180.png',
    'client/public/assets/icon-192x192.png',
    'client/public/assets/maskable-icon.png',
  ]) {
    assert.equal(
      legacyLibreChatIconHashes.has(sha256(fileBuffer(iconPath))),
      false,
      `${iconPath} still matches LibreChat branding`,
    );
  }
});
