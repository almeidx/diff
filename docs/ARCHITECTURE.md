# Architecture Notes

## Overview

Diff is a fully static, client-only SvelteKit application (adapter-static with an SPA fallback `404.html`, served by Cloudflare Workers static assets via `not_found_handling: "404-page"`). The landing page is prerendered; there is no server code, no API routes, and no hooks. It compares two package/plugin versions by:

1. Fetching package metadata and archive URLs from a registry — directly from the browser.
2. Downloading and extracting archives into in-memory file trees.
3. Computing file-level and line-level diffs inside a Web Worker.
4. Rendering results with a file tree and unified/split diff views.

## Major Components

- `src/routes/*`
  Pages for npm/WordPress compare flows.
- `src/lib/registries/*`
  Registry clients for metadata, version validation, and download URLs (npm, WordPress.org; GitHub for compare links).
- `src/lib/archive/extractor.ts`
  Archive extraction with the size/count guardrails:
  - streaming `.tgz` decompression and tar parsing
  - filtered zip extraction for WordPress archives
- `src/lib/diff/*`
  Diff engine producing patches for the renderer, plus retained file trees for context expansion.
- `src/lib/compare/*`
  Client-facing comparison pipeline (`compare`, `versions`, `fileContents`); the web-worker entrypoint sits beside the core implementation.
- `src/lib/components/*`
  UI components for tree navigation, stats, and diff rendering.

## Request Flow

1. User selects package type/name and versions.
2. The browser fetches registry metadata directly from the npm registry / WordPress.org API (both send `access-control-allow-origin: *`; the CSP `connect-src` in `vite.config.ts` whitelists these hosts).
3. `compare()` validates versions, downloads and extracts the archives in the compare Web Worker, and computes the diff from the retained file trees.
4. Page renders file tree + diff view; UI state controls split/unified mode and wrapping.
5. Expanding a collapsed region reads that file's full contents from the in-memory trees via `fileContents()` — no network round-trip. Patches only carry three lines of context, so the renderer needs the whole file to reveal more.

## Caching

There is no server cache — there is no server. Registry metadata is memoized in-session only (module-level promise per key; a failed lookup is evicted so a retry refetches). Nothing persists between visits, and extracted trees live only in page memory.

## Performance Strategies

- Incremental file rendering in diff view reduces initial DOM work on large result sets.
- Syntax highlighting is cached for repeated lines.
- `.tgz` archives are streamed through gunzip + tar parsing to reduce peak memory usage.
- File filters skip known binary/lock/vendor paths early.
- Archive download uses a generous 120s timeout (client bandwidth on mobile); registry/API fetches use 15s.

## Operational Constraints

Extraction guardrails are enforced client-side as constants in `src/lib/archive/extractor.ts` and are identical everywhere:

- 50MB max compressed archive
- ~128MB max decompressed text budget
- 5,000 max files per package
- 1MB max per file

The app enforces these guardrails before expensive decompression/diff work and surfaces user-readable errors when limits are exceeded.

## Security

- There is no server, so there is no CSRF token or abuse surface to protect: no rate limiting, no request logging, no KV bindings.
- Security headers (including `frame-ancestors` CSP, which cannot live in a meta tag) come from `static/_headers`.
- Outbound fetches go only to allowlisted upstream hosts; the safe-URL checks for archive downloads remain enforced client-side, and any new upstream host must be added to the CSP `connect-src` in `vite.config.ts`.
