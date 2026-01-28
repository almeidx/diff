# Diff

A web application for comparing different versions of npm packages and WordPress plugins. View the diff between any two versions with syntax highlighting, word-level diff detection, and a file tree navigator.

**Live:** [diff.almeidx.dev](https://diff.almeidx.dev)

## Features

- Compare npm packages and WordPress plugins
- Unified and split diff views
- Syntax highlighting for common languages
- Word-level diff highlighting within changed lines
- File tree navigation with status indicators
- Dark/light theme support
- Mobile responsive

## Running Locally

Running locally removes the size and memory limits imposed by Cloudflare Workers, allowing you to diff larger packages.

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

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server (fast, no caching) |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview with Wrangler (Cloudflare Workers runtime) |
| `pnpm check` | Run TypeScript and Svelte checks |
| `pnpm run deploy` | Deploy to Cloudflare Workers |

### Development vs Preview

- `pnpm dev` - Uses Vite's dev server. Faster hot reload, but no Cloudflare Cache API (caching is skipped).
- `pnpm preview` - Uses Wrangler to simulate the Cloudflare Workers environment locally, including the Cache API.

## Tech Stack

- [SvelteKit](https://kit.svelte.dev/) - Full-stack framework
- [Cloudflare Workers](https://workers.cloudflare.com/) - Edge runtime
- [fflate](https://github.com/101arrowz/fflate) - Fast zip/gzip decompression
- [diff-match-patch](https://github.com/google/diff-match-patch) - Diff algorithm
- [Prism.js](https://prismjs.com/) - Syntax highlighting

## Limits

The hosted version has the following limits due to Cloudflare Workers constraints:

- Maximum compressed archive size: 50MB
- Maximum decompressed size: ~128MB
- Maximum files per package: 5,000
- Maximum file size: 1MB per file

For larger packages, run locally where these limits don't apply.

## License

[GNU GPLv3](LICENSE)
