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
pnpm fmt
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
- The app is fully client-side; runtime code must use Web APIs only (no Node-only modules in anything bundled for the browser).
- Favor streaming/incremental processing for large payloads and avoid unnecessary memory copies.
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

## Pull Requests

PR descriptions should include:

- What changed
- Why it changed
- Any impact on limits, memory, or response time
- How it was validated (`check`, `test`, `build`, manual smoke flow)

For production deploy and incident workflows, see `docs/OPERATIONS.md`.
