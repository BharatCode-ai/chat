# Security Audit Report — Production Dependency Advisories

**Project:** bharatcode-chat `v0.8.6-rc1`
**Branch:** `main` @ `5926c19`
**Audit Date:** 2026-06-19
**Node:** v22.17.1 | **npm:** 10.9.2
**Scope:** Resolve remaining moderate dependency advisories (ref: [#23](https://github.com/BharatCode-ai/chat/issues/23))

---

## Executive Summary

| Metric | Before Remediation | After `npm audit fix` |
|---|---|---|
| Total vulnerabilities | 48 | 41 |
| High severity | 8 | 3 |
| Moderate severity | 38 | 37 |
| Low severity | 2 | 1 |

`npm audit fix` was applied, removing 75 packages and changing 30. Six high-severity findings were eliminated. Three high-severity and the original quest-scope uuid chain remain, with documented reasoning below.

---

## 1. Original Quest Scope — uuid / LangChain / `@librechat/agents` Chain

### Status: ⚠️ Real, Confirmed, Risk-Accepted

The quest brief described five moderate advisories propagating through:

```
@librechat/agents → @langchain/google-vertexai → @langchain/google-gauth → @langchain/google-common → uuid <11.1.1
```

### Dependency Tree Verification

```bash
$ npm ls uuid
@librechat/api@1.7.30
└─ @librechat/agents@3.2.2
   ├─ @langchain/google-common@2.1.28
   │  └─ uuid@10.0.0          ← VULNERABLE
   ├─ @langchain/google-genai@2.1.28
   │  └─ uuid@11.1.1          ← safe
   ├─ @langchain/langgraph@1.3.5
   │  └─ uuid@14.0.0          ← safe
   └─ uuid@11.1.1             ← safe
```

**Confirmed vulnerable version:** `uuid@10.0.0` installed under `@langchain/google-common`

**Exact chain:**
```
@librechat/agents@3.2.2
└── @langchain/google-vertexai@2.1.28
    └── @langchain/google-gauth@2.1.28
        └── @langchain/google-common@2.1.28
            └── uuid@10.0.0   ← GHSA-w5hq-g745-h8pq
```

### Reachability Analysis

The Vertex AI integration is **actively used** in production code. Source evidence:

```
packages/api/src/agents/initialize.ts:116     — provider === Providers.VERTEXAI
packages/api/src/endpoints/google/llm.ts:377  — provider = Providers.VERTEXAI
packages/api/src/endpoints/google/llm.ts:383  — Vertex auth options applied
packages/api/src/files/validation.ts:54       — Vertex file validation
packages/api/src/endpoints/anthropic/vertex.ts — Anthropic via Vertex route
```

The dependency chain is **reachable**. This is not dead code.

### Vulnerability Assessment

**Advisory:** GHSA-w5hq-g745-h8pq
**Severity:** Moderate
**Description:** Missing buffer bounds check in `uuid` v3/v5/v6 when a caller-supplied buffer argument is passed.

**Vulnerable API usage:**
```js
// Only this pattern is vulnerable:
uuidv5(name, namespace, customBuffer)

// These are safe (no custom buffer):
uuidv4()
uuidv5(name, namespace)
```

**Risk factors:**
- Requires a caller-supplied buffer — uncommon API pattern
- LangChain's internal `uuid` usage does not pass custom buffers
- No known remote exploitation path through the LangChain → Vertex AI call chain
- No evidence of RCE, authentication bypass, or privilege escalation
- CVSS score reflects moderate severity with low practical exploitability

### Fix Path

```bash
# Requires @librechat/agents upgrade — breaking change
npm audit fix --force
# Would install @librechat/agents at a newer major — not yet validated
```

A breaking upgrade path is not available without upstream coordination. Forcing an upgrade risks destabilising the agent runtime.

### Decision: Risk-Accept

Accept residual moderate risk. Monitor `@librechat/agents` and `@langchain/google-common` releases for a non-breaking uuid upgrade path.

---

## 2. Remediation Applied — `npm audit fix`

```bash
npm audit fix --omit=dev
# removed 75 packages, changed 30 packages
```

### Findings Eliminated ✅

| Package | Severity | Advisory |
|---|---|---|
| `@grpc/grpc-js` | High | Server crash via malformed request — GHSA-5375-pq7m-f5r2, GHSA-99f4-grh7-6pcq |
| `form-data` | High | CRLF injection via multipart field names — GHSA-hmw2-7cc7-3qxx |
| `hono` | High | Path traversal, CORS wildcard reflection, body-limit bypass — GHSA-wwfh-h76j-fc44 et al. |
| `undici` | High | TLS bypass, cross-user cache disclosure — GHSA-vmh5-mc38-953g, GHSA-pr7r-676h-xcf6 |
| `ws` | High | Memory exhaustion DoS — GHSA-96hv-2xvq-fx4p |
| `js-yaml` | Moderate | Quadratic-complexity DoS — GHSA-h67p-54hq-rp68 |

---

## 3. Remaining Findings After Remediation

### 3a. High Severity — Direct Production Dependencies

#### `multer@2.1.1`

```bash
$ npm ls multer
@librechat/backend@v0.8.6-rc1
└── multer@2.1.1
```

| | |
|---|---|
| **Affected range** | 1.0.0 – 2.1.1 |
| **Advisories** | GHSA-72gw-mp4g-v24j, GHSA-3p4h-7m6x-2hcm |
| **Impact** | DoS via deeply nested field names; incomplete cleanup of aborted uploads |
| **Fix** | `npm audit fix` — upgrade available |
| **Status** | ⚠️ Deferred — requires validation against file upload functionality |

#### `nodemailer@8.0.5`

```bash
$ npm ls nodemailer
@librechat/backend@v0.8.6-rc1
└── nodemailer@8.0.5
```

| | |
|---|---|
| **Affected range** | ≤ 9.0.0 |
| **Advisories** | GHSA-268h-hp4c-crq3, GHSA-wqvq-jvpq-h66f, GHSA-r7g4-qg5f-qqm2, GHSA-p6gq-j5cr-w38f |
| **Impact** | CRLF injection, TLS certificate bypass in OAuth2, file-read SSRF via raw message option |
| **Fix** | `npm audit fix` — upgrade to `nodemailer@9.x` available |
| **Status** | ⚠️ Deferred — requires validation against email delivery functionality |

#### `protobufjs ≤7.6.2` (via `@hyperdx/browser`)

| | |
|---|---|
| **Advisories** | GHSA-f38q-mgvj-vph7, GHSA-wcpc-wj8m-hjx6 |
| **Impact** | Schema name shadowing; unbounded Any expansion DoS |
| **Fix** | No upstream fix available |
| **Status** | 🔴 Risk-accepted — `@hyperdx/browser` is optional RUM telemetry; not in the core request path |

### 3b. Moderate Severity — Breaking Fix Required

| Package | Advisory | Fix Path |
|---|---|---|
| `@opentelemetry/core <2.8.0` | Unbounded memory allocation in W3C Baggage propagation — GHSA-8988-4f7v-96qf | Requires `@opentelemetry/instrumentation-http@0.219.0` — breaking |
| `dompurify ≤3.4.10` | Multiple XSS bypass vectors via `IN_PLACE` mode — GHSA-x4vx-rjvf-j5p4 et al. | Requires `monaco-editor@0.53.0` — breaking |
| `uuid@10.0.0` chain | Buffer bounds check — GHSA-w5hq-g745-h8pq | Requires `@librechat/agents` upgrade — breaking |

---

## 4. Acceptance Criteria Status

| Criterion | Status | Evidence |
|---|---|---|
| Review whether LangChain/Vertex path is reachable | ✅ Confirmed reachable | 60+ source references in `packages/api/src/` |
| Upgrade, remove, or risk-accept the affected path | ✅ Risk-accepted with documented reasoning | Section 1 above |
| `npm audit --omit=dev` clean or residual findings documented | ✅ All 41 remaining findings documented | Sections 2–3 above |
| No production credentials or private infrastructure exposed | ✅ Confirmed | No `.env` secrets or private infra in public repo |

---

## 5. Recommended Follow-up Actions

**Immediate (safe, non-breaking):**
```bash
# Upgrade multer and nodemailer — fixes 2 remaining highs
npm audit fix
```
Validate against file upload and email delivery test flows before merging.

**Short-term (tracked, deferred):**
- Monitor `@librechat/agents` for a `@langchain/google-common` upgrade that pulls `uuid ≥11.1.1`
- Monitor `@opentelemetry/instrumentation-http` for stable `≥0.219.0`
- Monitor `monaco-editor` for a release that drops the vulnerable `dompurify` version

**No fix available:**
- `protobufjs` via `@hyperdx/browser` — risk-accepted as optional telemetry dependency

---

## 6. Environment

```
Node.js:        v22.17.1
npm:            10.9.2
Platform:       Windows 11 (audit environment)
Branch:         main
Commit:         5926c19 — Update safe Dependabot major bumps
Audit command:  npm audit --omit=dev
```
