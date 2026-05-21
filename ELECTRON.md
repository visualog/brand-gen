# BrandGen Electron Shell

This branch adds a minimal Electron shell around the existing Next.js app and local Codex worker.

## Development

```bash
npm run electron:dev
```

The command starts these processes when they are not already running:

- Next.js dev server on `http://127.0.0.1:3000`
- BrandGen Codex worker on `http://127.0.0.1:4317`
- Electron desktop window loading the local Next.js app

## Current Scope

- Reuses the existing Next.js UI.
- Reuses `scripts/codex-worker.mjs` for Codex CLI calls.
- Keeps Codex authentication and generated files on the user's local machine.

Packaging, auto-update, code signing, and production server bundling are intentionally left for the next step.
