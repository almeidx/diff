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
- Any new upstream fetch host must be added to the CSP `connect-src` in
  `vite.config.ts`; security headers (including `frame-ancestors`) belong in
  `static/_headers`.
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

- `src/lib/registries/` — package metadata and downloads
- `src/lib/archive/` — archive extraction and validation
- `src/lib/diff/` — comparison work
- `src/lib/compare/` — client-facing compare pipeline
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
pnpm build        # bundling changes
```

Do not run deployment commands unless the user explicitly asks for a deploy.
