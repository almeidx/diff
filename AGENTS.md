# Agent guidance

Diff is a SvelteKit application for comparing npm package and WordPress plugin
releases. It is fully static and client-only, hosted as static assets on
Cloudflare Workers.

Use `README.md` for product behavior and local setup, and `package.json` for the
current command list. Keep this file focused on constraints that are easy to
miss while changing the code.

## Runtime boundaries

- All runtime code is browser client code: use Web APIs only. No Node-only
  modules in anything bundled for the client. Build-time tooling may use Node.
- Upstream fetch hosts are declared once, in each registry's `hosts`; the CSP
  `connect-src` in `vite.config.ts` is derived from them, and `upstreamFetch`
  refuses anything else. Because the config imports the registries, registry
  modules must not touch browser globals at module load. Security headers
  (including `frame-ancestors`) belong in `static/_headers`.
- `src/lib/archive/` must not import app code (registries, compare, UI): it is
  the most stable layer and everything else depends on it.
- Archive handling is resource-sensitive. Keep the size/count limits in
  `src/lib/archive/limits.ts` as the default — the only bypass is the explicit
  user opt-in surfaced on the diff page — reject unsafe paths, and filter
  unwanted or binary entries before doing expensive decompression or diff work.
- Keep registry-specific fetching behind `src/lib/registries/`; shared
  comparison and archive code should not depend on npm- or WordPress-only
  response shapes.
- Follow the Svelte 5 patterns already used by neighboring components instead
  of introducing a second state-management style.

## Useful areas

- `src/lib/registries/` — one module per registry behind the `Registry`
  interface; adding a registry means adding a module and listing it in
  `index.ts`, which also memoizes and sorts package metadata
- `src/lib/archive/` — streaming tar/zip extraction, filtering and limits
- `src/lib/url.ts` — every app URL (compare links incl. `?limits=off`, picker
  presets), written and parsed in one place
- `src/lib/compare/` — the compare Web Worker (`pipeline.ts`, `diff.ts`), its
  message protocol, the main-thread client and the reactive `CompareSession`
- `src/lib/components/` — `DiffViewer` wraps `@pierre/diffs` `CodeView`,
  `FileTree` wraps `@pierre/trees`; both are imperative and fed in tree order
- `src/routes/[registry]/[...path]/` — the diff page for every registry

## Validation

Choose checks that cover the change, then expand when shared or runtime code is
affected:

```sh
pnpm lint
pnpm check
pnpm test
pnpm test:smoke   # browser-facing changes
pnpm build        # bundling changes
```

Do not run deployment commands unless the user explicitly asks for a deploy.
