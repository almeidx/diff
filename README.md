# Diff

A web application for comparing different versions of npm packages and WordPress plugins. View the diff between any two versions with syntax highlighting, word-level diff detection, and a file tree navigator.

**Live:** [diff.almeidx.dev](https://diff.almeidx.dev)

## Features

- Compare npm packages and WordPress plugins
- Unified and split diff views
- Syntax highlighting for common languages
- Word-level diff highlighting within changed lines
- File tree filtering and keyboard navigation
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
| `pnpm test` | Run unit tests (Vitest) |
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

## Performance Notes

- The diff view renders files incrementally to keep initial page load responsive on large diffs.
- npm `.tgz` archives are extracted in a streaming path to lower peak memory pressure.
- Zip extraction still requires full archive download due format constraints.

## Rate Limiting

Rate limiting supports two modes:

- KV-backed distributed rate limiting when `RATE_LIMIT_KV` is bound in Cloudflare.
- In-memory fallback when running locally without KV.

Add this binding in your Cloudflare config if you want shared limits across instances:

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

## Troubleshooting

- `Package too large` errors:
  Run locally (`pnpm dev`) to bypass Cloudflare Worker runtime limits.
- `Corrupted or truncated tar archive`:
  The upstream package tarball is malformed or incomplete; retry and confirm the package version exists.
- No versions returned for package/plugin:
  Check package name/slug spelling and that your network can reach npm/WordPress APIs.
- UI slows down on huge diffs:
  Use file-tree filtering to narrow the diff and load relevant files first.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development workflow and standards.

## License

[GNU GPLv3](LICENSE)
