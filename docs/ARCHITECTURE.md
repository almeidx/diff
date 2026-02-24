# Architecture Notes

## Overview

Diff is a SvelteKit application deployed to Cloudflare Workers. It compares two package/plugin versions by:

1. Fetching package metadata and archive URLs from a registry.
2. Downloading and extracting archives into in-memory file trees.
3. Computing file-level and line-level diffs.
4. Rendering results with a file tree and unified/split diff views.

## Major Components

- `src/routes/*`
  Route loaders and pages for npm/WordPress compare flows.
- `src/lib/server/registries/*`
  Registry clients for metadata, version validation, and download URLs.
- `src/lib/server/archive/extractor.ts`
  Archive extraction:
  - streaming `.tgz` decompression and tar parsing
  - filtered zip extraction for WordPress archives
- `src/lib/server/diff/*`
  Diff engine and word-diff computation.
- `src/lib/components/*`
  UI components for tree navigation, stats, and diff rendering.

## Request Flow

1. User selects package type/name and versions.
2. `GET /api/versions` returns candidate versions.
3. Route server load validates versions and computes/loads cached diff.
4. Page renders file tree + diff view; UI state controls split/unified mode and wrapping.

## Caching

`src/lib/server/cache.ts` uses Cloudflare Cache API when available.

- Registry metadata and computed diffs are cached.
- Local `pnpm dev` runs without Cache API, so cache calls fall back to direct fetch/compute.

## Performance Strategies

- Incremental file rendering in diff view reduces initial DOM work on large result sets.
- Syntax highlighting is cached for repeated lines.
- `.tgz` archives are streamed through gunzip + tar parsing to reduce peak memory usage.
- File filters skip known binary/lock/vendor paths early.

## Operational Constraints

Cloudflare Worker limits affect:

- archive size handling
- decompression behavior
- maximum file counts and file size limits

The app enforces explicit guardrails and returns user-readable errors when limits are exceeded.

## Security and Abuse Controls

- CSRF checks for `/api/*` requests via cookie + header token.
- Request rate limiting in `hooks.server.ts`:
  - distributed mode with KV (`RATE_LIMIT_KV`) when configured
  - in-memory fallback in local/dev or missing binding environments
