# Diff

See exactly what changed between two releases of an npm package or a WordPress plugin. Everything runs in your browser.

**Live:** [diff.almeidx.dev](https://diff.almeidx.dev)

## Usage

1. Pick a registry (npm or WordPress).
2. Search for a package or plugin.
3. Pick the two versions (defaults to the latest release and the stable one before it).
4. Compare. Both archives are downloaded and diffed in a Web Worker while the page shows progress; results stream into a virtualized file tree and diff view.

Comparisons are shareable links: `/npm/<package>/<from>...<to>` and `/wp/<plugin>/<from>...<to>`.

Diffs are rendered with [Diffs](https://diffs.com) and the file tree with [Trees](https://trees.software), both by The Pierre Computer Company.

## Running Locally

Requires Node.js 24+ and pnpm.

```bash
git clone https://github.com/almeidx/diff.git
cd diff
pnpm install --frozen-lockfile
pnpm dev
```

| Command           | Description                                |
| ----------------- | ------------------------------------------ |
| `pnpm dev`        | Start development server                   |
| `pnpm build`      | Build for production (static output)       |
| `pnpm preview`    | Preview the production build locally       |
| `pnpm lint`       | Check formatting and lint rules            |
| `pnpm fmt`        | Format and auto-fix lint issues            |
| `pnpm check`      | Run TypeScript and Svelte checks           |
| `pnpm test`       | Run unit tests (Vitest)                    |
| `pnpm test:smoke` | Run browser smoke tests (Playwright)       |
| `pnpm run deploy` | Deploy static assets to Cloudflare Workers |

## Limits

- Maximum download size: 100 MB
- Maximum decompressed size: 256 MB
- Maximum text files per package: 10,000
- Text files over 2 MB are listed as changed but not diffed; binary files are compared by size and content hash

Exceeding a limit offers **Compare without limits**. Defaults live in `src/lib/archive/limits.ts`.

## Adding a registry

Implement `Registry` (`src/lib/registries/types.ts`) in a new module and add it to `registries` in `src/lib/registries/index.ts`. The home page, the `/<id>/...` route, the compare worker and the CSP `connect-src` (from the registry's `hosts`) pick it up from there.

## License

[GNU GPLv3](LICENSE)
