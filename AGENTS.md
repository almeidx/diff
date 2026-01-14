# AI Agent Guidelines

This document provides context for AI agents working on this codebase.

## Project Overview

Diff is a SvelteKit application that compares versions of npm packages and WordPress plugins. It runs on Cloudflare Workers.

## Architecture

```
src/
├── lib/
│   ├── components/          # Svelte components
│   │   ├── DiffView/        # Diff rendering (unified/split views)
│   │   ├── FileTree/        # File tree sidebar
│   │   └── ...
│   ├── server/              # Server-only code
│   │   ├── registries/      # npm and WordPress API clients
│   │   ├── diff/            # Diff computation engine
│   │   ├── archive/         # Archive extraction (tgz/zip)
│   │   └── cache.ts         # Cloudflare Cache API wrapper
│   ├── stores/              # Svelte stores for UI state
│   ├── highlight/           # Prism.js syntax highlighting
│   ├── types/               # TypeScript types
│   └── utils/               # Utility functions
├── routes/
│   ├── +page.svelte         # Homepage
│   ├── npm/[...path]/       # npm diff pages
│   ├── wp/[slug]/[...versions]/ # WordPress diff pages
│   └── api/                 # API endpoints
└── hooks.server.ts          # Request hooks (rate limiting, CSRF)
```

## Key Technical Details

### Svelte 5

This project uses Svelte 5 with runes:
- `$state()` for reactive state
- `$derived()` for computed values
- `$effect()` for side effects
- `$props()` for component props

### Cloudflare Workers Constraints

- No Node.js APIs (fs, path, etc.)
- Limited memory (~128MB)
- WASM restrictions (some libraries won't work)
- Use the Cache API for caching (`caches.open()`)

### Archive Extraction

- npm packages are `.tgz` (gzip-compressed tar)
- WordPress plugins are `.zip`
- Uses fflate for decompression
- Filter function skips binary files before decompression to save memory

### Diff Computation

1. Fetch both package versions
2. Extract archives to file maps
3. Compare file trees (added/deleted/modified)
4. Compute line-level diffs with diff-match-patch
5. Compute word-level diffs within modified lines

## Common Tasks

### Adding a new language for syntax highlighting

Edit `src/lib/highlight/prism.ts`:
1. Add the Prism component import
2. Add file extension mapping in `extToLang`

### Adding a new registry (e.g., PyPI)

1. Create `src/lib/server/registries/pypi.ts` implementing version fetching and download URLs
2. Add route at `src/routes/pypi/[...path]/`
3. Update homepage to include the new package type

### Modifying diff display

- Unified view: `src/lib/components/DiffView/UnifiedDiff.svelte`
- Split view: `src/lib/components/DiffView/SplitDiff.svelte`
- File headers: `src/lib/components/DiffView/DiffView.svelte`

## Testing

```bash
pnpm dev      # Fast dev server (no caching)
pnpm preview  # Full Cloudflare Workers simulation
pnpm check    # Type checking
```

## Deployment

```bash
pnpm build && pnpm run deploy
```

Deploys to Cloudflare Workers via Wrangler.
