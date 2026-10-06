# Operations Runbook

## Scope

This guide covers deploy, verification, and incident response for the hosted static deployment.

## Runtime and Config

- Runtime: static assets on Cloudflare Workers (assets-only config, no compute); the SPA fallback `404.html` handles client-side routing via `not_found_handling: "404-page"`.
- Main config: `wrangler.jsonc`.
- App limits enforced client-side in `src/lib/archive/extractor.ts`:
  - 50MB max compressed archive
  - ~128MB max decompressed text budget
  - 5,000 max files per package
  - 1MB max per file
- Security headers (including `frame-ancestors` CSP) come from `static/_headers`.

## Standard Release Flow

1. Sync dependencies:
   `pnpm install --frozen-lockfile`
2. Run local quality gates:
   `pnpm check && pnpm test && pnpm build`
3. (Optional) Validate the production build locally:
   `pnpm preview`
4. Deploy:
   `pnpm run deploy` (uploads the static build via `wrangler deploy`)
5. Post-deploy smoke checks:
   - Open `/`
   - Open a known compare URL (`/npm/react/18.2.0...18.3.1`)
   - Open an unknown route and confirm the SPA fallback renders

## Rollback

Rollback is a redeploy of the last known good build:

1. Check out the last known good commit.
2. Re-run gates:
   `pnpm check && pnpm test && pnpm build`
3. Deploy:
   `pnpm run deploy`

## Logs and Observability

There are none. The app is static: no worker executes per request, so there are no worker logs, no telemetry, and no metrics. All work happens in visitors' browsers; failures surface as in-app error messages. Debug issues by reproducing locally (`pnpm dev` or `pnpm preview`) with browser devtools.

## Incident Playbook

There is no server to fail, so incidents reduce to upstream problems:

### Registry/API outages (npm, WordPress.org, GitHub)

- Confirm upstream health (npm status page, WordPress.org health, GitHub status).
- Failures surface to users as error messages in the UI; nothing to remediate server-side.
- If an upstream changes its CORS policy, browser fetches will fail with network errors; update the affected registry client and the CSP `connect-src` in `vite.config.ts` if hosts change.

### Archive download failures

- Verify `downloads.wordpress.org` / npm tarball URLs are reachable and still CORS-enabled.
- Confirm failures are not caused by the client-side size/decompression limits before escalating upstream.
