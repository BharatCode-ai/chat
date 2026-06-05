# BharatCode Config

This directory contains BharatCode-specific configuration and tests for the
public chat app snapshot.

Public defaults:

- one visible model, `BharatCode`
- no user-facing third-party provider or API-key setup
- BharatCode styling, app title, and mark
- RAG/file upload enabled for the BharatCode endpoint
- local placeholder values in `.env.example`

Production values for OAuth, model gateway access, GCS artifacts, sandbox
deployment, and `chat.bharatcode.ai` are intentionally not stored here.

Run the config smoke test with:

```bash
node --test bharatcode/test/config.test.mjs
```
