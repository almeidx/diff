# Diff

A web application for comparing different versions of npm packages and WordPress plugins. View the diff between any two versions with syntax highlighting, word-level diff detection, and a file tree navigator.

**Live:** [diff.almeidx.dev](https://diff.almeidx.dev)

## Features

- Compare npm packages and WordPress plugins
- Unified and split diff views
- Syntax highlighting for common languages
- Word-level diff highlighting within changed lines
- Expandable context around changes
- File tree filtering and keyboard navigation
- Dark/light theme support

## Running Locally

Requires Node.js 24+ and pnpm.

```bash
git clone https://github.com/almeidx/diff.git
cd diff
pnpm install --frozen-lockfile
pnpm dev
```

The app will be available at `http://localhost:5173`.

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

## How It Works

Everything runs in your browser.

## Limits

- Maximum compressed archive size: 100MB
- Maximum decompressed size: ~256MB
- Maximum files per package: 10,000
- Maximum file size: 2MB (larger files are skipped)

Exceeding a limit surfaces a **Compare without limits** opt-in on the diff page. Defaults live in `src/lib/archive/limits.ts`.

## Troubleshooting

- `Package too large`: use **Compare without limits** on the diff page.
- `Corrupted or truncated tar archive`: the upstream tarball is malformed; retry or verify the version exists.
- No versions returned: check the package name/slug spelling and that your network can reach the npm/WordPress APIs.
- UI slows down on huge diffs: use file-tree filtering to narrow the diff.

## License

[GNU GPLv3](LICENSE)
