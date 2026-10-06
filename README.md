# Diff

A web application for comparing different versions of npm packages and WordPress plugins. View the diff between any two versions with syntax highlighting, word-level diff detection, and a file tree navigator.

**Live:** [diff.almeidx.dev](https://diff.almeidx.dev)

## Features

- Compare npm packages and WordPress plugins
- Unified and split diff views
- Syntax highlighting for common languages
- Word-level diff highlighting within changed lines
- Expandable context around changes, served from in-memory file trees
- File tree filtering and keyboard navigation
- Dark/light theme support
- Mobile responsive

## Running Locally

### Prerequisites

- Node.js 24+
- pnpm

### Quick Start

```bash
# Clone the repository
git clone https://github.com/almeidx/diff.git
cd diff

# Install dependencies
pnpm install --frozen-lockfile

# Start the development server
pnpm dev
```

The app will be available at `http://localhost:5173`.

### Scripts

| Command           | Description                                |
| ----------------- | ------------------------------------------ |
| `pnpm dev`        | Start development server                   |
| `pnpm build`      | Build for production (static output)       |
| `pnpm preview`    | Preview the production build locally       |
| `pnpm lint`       | Check formatting and lint rules            |
| `pnpm fmt`        | Format and auto-fix lint issues            |
| `pnpm check`      | Run TypeScript and Svelte checks           |
| `pnpm test`       | Run unit tests (Vitest)                    |
| `pnpm run deploy` | Deploy static assets to Cloudflare Workers |

## Tech Stack

- [SvelteKit](https://kit.svelte.dev/) - Static, client-only app (adapter-static)
- [Cloudflare Workers](https://workers.cloudflare.com/) - Static asset hosting (no server-side compute)
- [fflate](https://github.com/101arrowz/fflate) - Fast zip/gzip decompression
- [jsdiff](https://github.com/kpdecker/jsdiff) - Diff algorithm
- [@pierre/diffs](https://diffs.com/) - Diff rendering and syntax highlighting
- [@pierre/trees](https://trees.software/) - File tree navigator

## How It Works

Everything runs in your browser. The app fetches package metadata directly from the npm registry, the WordPress.org API, and the GitHub API (all of which allow cross-origin requests), downloads the package archives, extracts them in-memory, and computes the diff client-side. Extracted file trees are retained in-session, so expanding context around a change reads full file contents from memory instead of re-downloading archives.

No server code is involved: registry metadata is memoized in-session only, and nothing persists between visits.

## Limits

Comparisons run entirely in your browser, so the guardrails below exist to keep extraction and diffing from exhausting tab memory. They apply identically everywhere (local dev and production):

- Maximum compressed archive size: 100MB
- Maximum decompressed size: ~256MB
- Maximum files per package: 10,000
- Maximum file size: 2MB per file (larger single files are skipped)

When a package exceeds these, the diff page explains the tradeoff and offers a **Compare without limits** button that reruns the comparison with every cap removed (`?limits=off` in the URL, preserved across version changes). Skipping the limits is an explicit opt-in: oversized extractions can freeze the tab or crash the browser.

The defaults live in `src/lib/archive/limits.ts`.

## Performance Notes

- The diff view renders files incrementally to keep initial page load responsive on large diffs.
- npm `.tgz` archives are extracted in a streaming path to lower peak memory pressure.
- Zip extraction still requires full archive download due format constraints.

## Troubleshooting

- `Package too large` errors:
  The archive exceeds the client-side limits above. Use the **Compare without limits** option on the diff page if your machine can handle larger packages.
- `Corrupted or truncated tar archive`:
  The upstream package tarball is malformed or incomplete; retry and confirm the package version exists.
- No versions returned for package/plugin:
  Check package name/slug spelling and that your network (and any browser extensions/blockers) can reach the npm/WordPress APIs.
- UI slows down on huge diffs:
  Use file-tree filtering to narrow the diff and load relevant files first.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development workflow and standards.
Operational deployment and incident guidance is in [docs/OPERATIONS.md](docs/OPERATIONS.md).

## License

[GNU GPLv3](LICENSE)
