# Contributing

Thanks for contributing to Diff.

## Development Setup

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Useful commands:

```bash
pnpm lint
pnpm format:check
pnpm check
pnpm test
pnpm build
pnpm preview
```

## Workflow

1. Create focused changes that are easy to review.
2. Keep commits small and scoped to one concern.
3. Run `pnpm lint`, `pnpm check`, `pnpm test`, and `pnpm build` before opening a PR.
4. Update documentation when behavior, limits, or architecture changes.

## Code Standards

- Use TypeScript strict mode patterns.
- Preserve Svelte 5 runes style (`$state`, `$derived`, `$effect`).
- Keep Cloudflare Worker constraints in mind:
  - No Node-only runtime APIs in server code.
  - Favor streaming/incremental processing for large payloads.
  - Avoid unnecessary memory copies.
- Prefer explicit, user-facing errors for registry/network/archive failures.

## UI and UX Expectations

- Keep keyboard accessibility in interactive controls.
- Preserve responsive behavior for mobile and desktop.
- Diff rendering changes must be tested on both small and large package diffs.

## Testing Guidance

Current automated checks include:

- Unit tests (Vitest) for version parsing, archive path normalization, and diff-engine regression cases.
- Type and Svelte diagnostics via `pnpm check`.

When adding features, include tests for:

- New parsing logic
- Error handling paths
- Performance-sensitive edge cases (large file/diff behavior)

## Cloudflare Configuration

If deploying with distributed rate limiting, bind a KV namespace named `RATE_LIMIT_KV`.

```jsonc
{
  "kv_namespaces": [
    {
      "binding": "RATE_LIMIT_KV",
      "id": "your-kv-namespace-id"
    }
  ]
}
```

Without this binding, the app falls back to per-instance in-memory limits.

## Pull Requests

PR descriptions should include:

- What changed
- Why it changed
- Any impact on limits, memory, or response time
- How it was validated (`check`, `test`, `build`, manual smoke flow)

For production deploy and incident workflows, see `docs/OPERATIONS.md`.
