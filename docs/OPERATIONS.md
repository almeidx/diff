# Operations Runbook

## Scope

This guide covers deploy, verification, and incident response for the hosted Cloudflare Worker.

## Runtime and Config

- Runtime: Cloudflare Workers via SvelteKit Cloudflare adapter.
- Main config: `wrangler.jsonc`.
- Optional KV binding for distributed rate limiting: `RATE_LIMIT_KV`.
- Worker limits enforced in app code:
  - 50MB max compressed archive
  - ~128MB max decompressed text budget
  - 5,000 max files per package
  - 1MB max per file

## Standard Release Flow

1. Sync dependencies:
   `pnpm install --frozen-lockfile`
2. Run local quality gates:
   `pnpm check && pnpm test && pnpm build && pnpm test:smoke`
3. (Optional) Validate Cloudflare runtime locally:
   `pnpm preview`
4. Deploy:
   `pnpm run deploy`
5. Post-deploy smoke checks:
   - Open `/`
   - Open a known compare URL (`/npm/react/18.2.0...18.3.1`)
   - Open an invalid compare URL and confirm 400 page

## Rollback

Rollback is a redeploy of the last known good commit:

1. Revert the offending commit(s) in git.
2. Re-run gates:
   `pnpm check && pnpm test && pnpm build`
3. Deploy:
   `pnpm run deploy`

## Logs

App logs are structured JSON lines written through `src/lib/server/log.ts`.

Tail logs from Cloudflare:

```bash
pnpm wrangler tail --format=json
```

Key message types and fields:

- `diff_loaded`: includes `packageType`, `packageName`, versions, diff stats, `durationMs`.
- `diff_load_failed`: includes package/version context and serialized error.
- `diff_invalid_version`: includes invalidity booleans for `fromVersion`/`toVersion`.
- `request_rate_limited`: includes `path`, `method`, `ip`, `retryAfterSeconds`.
- `csrf_validation_failed`: includes `path`, `method`, token presence flags, and IP.
- `cache_parse_failed`: includes cache key and parse error details.

## Incident Playbook

### Spike in 429 responses

- Confirm whether `RATE_LIMIT_KV` is configured in production.
- If KV is missing, limits are per-instance (in-memory) and can behave inconsistently.
- Adjust `RATE_LIMIT`/`WINDOW_MS` in `src/lib/server/rate-limit.ts` only if needed.

### Spike in diff fetch failures

- Check `diff_load_failed` logs for registry/network/archive errors.
- Validate npm/WordPress upstream health.
- Confirm failures are not caused by archive size or decompression limits.

### Frequent CSRF 403 responses

- Check `csrf_validation_failed` logs for missing cookie/header patterns.
- Confirm clients include `x-csrf-token` copied from `csrf_token` cookie.

### Cache parse warnings

- `cache_parse_failed` indicates invalid JSON in cache payload for a key.
- Requests continue by recomputing data; no emergency action needed unless frequent.

