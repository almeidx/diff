# Agent guidance

Diff is a SvelteKit application for comparing npm package and WordPress plugin
releases. It runs on Cloudflare Workers.

Use `README.md` for product behavior and local setup, and `package.json` for the
current command list. Keep this file focused on constraints that are easy to
miss while changing the code.

## Runtime boundaries

- Code reached by a Worker request must use Web APIs rather than Node-only
  modules. Build-time tooling may use Node when it cannot enter the Worker
  bundle.
- Archive handling is resource-sensitive. Preserve size/count limits, reject
  unsafe paths, and filter unwanted or binary entries before doing expensive
  decompression or diff work.
- Keep registry-specific fetching behind `src/lib/server/registries/`; shared
  comparison and archive code should not depend on npm- or WordPress-only
  response shapes.
- Preserve the request protections in `src/hooks.server.ts` when changing
  routes, caching, or form/API behavior.
- Follow the Svelte 5 patterns already used by neighboring components instead
  of introducing a second state-management style.

## Useful areas

- `src/lib/server/registries/` — package metadata and downloads
- `src/lib/server/archive/` — archive extraction and validation
- `src/lib/server/diff/` — comparison work
- `src/lib/components/DiffView/` — unified and split rendering
- `src/routes/npm/` and `src/routes/wp/` — registry-specific pages

## Validation

Choose checks that cover the change, then expand when shared or runtime code is
affected:

```sh
pnpm lint
pnpm check
pnpm test
pnpm test:smoke   # browser-facing changes
pnpm build        # Worker or bundling changes
```

Do not run deployment commands unless the user explicitly asks for a deploy.
