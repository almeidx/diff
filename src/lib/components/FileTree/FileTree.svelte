<script lang="ts">
	import { untrack } from 'svelte';
	import type { FileTree as FileTreeInstance, FileTreeRowDecoration, GitStatusEntry } from '@pierre/trees';
	import type { DiffFile } from '$lib/types/index.js';

	interface Props {
		files: DiffFile[];
		onFileSelect?: (file: DiffFile) => void;
		selectedPath?: string;
	}

	let { files, onFileSelect, selectedPath }: Props = $props();

	let search = $state('');
	let matchCount = $state(0);
	let mount = $state<HTMLDivElement | null>(null);
	let tree = $state<FileTreeInstance | null>(null);

	let fileMap = new Map<string, DiffFile>();

	const paths = $derived(files.map((file) => file.path));
	const gitStatus = $derived<GitStatusEntry[]>(
		files.map((file) => ({ path: file.path, status: file.status }))
	);
	const normalizedSearch = $derived(search.trim());
	const directoryPaths = $derived.by(() => {
		const directories = new Set<string>();
		for (const path of paths) {
			const segments = path.split('/');
			for (let i = 1; i < segments.length; i++) {
				directories.add(segments.slice(0, i).join('/'));
			}
		}
		return Array.from(directories);
	});
	const hasAnyFolders = $derived(directoryPaths.length > 0);

	$effect(() => {
		fileMap = new Map(files.map((file) => [file.path, file]));
	});

	function decorateRow(path: string): FileTreeRowDecoration | null {
		return fileMap.get(path)?.isMinified ? { text: 'minified', title: 'Minified file' } : null;
	}

	function labelTree(instance: FileTreeInstance) {
		const host = instance.getFileTreeContainer();
		host?.shadowRoot?.querySelector('[role="tree"]')?.setAttribute('aria-label', 'Changed files tree');
	}

	$effect(() => {
		const container = mount;
		if (!container) return;

		let disposed = false;
		const initial = untrack(() => ({
			paths,
			gitStatus,
			selectedPath
		}));

		void (async () => {
			const { FileTree } = await import('@pierre/trees');
			if (disposed) return;

			const instance = new FileTree({
				paths: initial.paths,
				gitStatus: initial.gitStatus,
				flattenEmptyDirectories: true,
				initialExpansion: 'open',
				initialSelectedPaths: initial.selectedPath ? [initial.selectedPath] : [],
				fileTreeSearchMode: 'hide-non-matches',
				searchFakeFocus: true,
				renderRowDecoration: ({ row }) => decorateRow(row.path),
				onSelectionChange: (selectedPaths) => {
					const file = fileMap.get(selectedPaths[0] ?? '');
					if (file) onFileSelect?.(file);
				}
			});

			instance.render({ containerWrapper: container });
			labelTree(instance);
			tree = instance;
		})();

		return () => {
			disposed = true;
			tree?.cleanUp();
			tree = null;
		};
	});

	let appliedPathsKey: string | null = null;
	$effect(() => {
		const key = paths.join('\n');
		const nextStatus = gitStatus;
		if (!tree) return;

		if (appliedPathsKey === null) {
			appliedPathsKey = key;
			return;
		}
		if (appliedPathsKey === key) return;

		appliedPathsKey = key;
		tree.resetPaths(paths, { initialExpandedPaths: directoryPaths });
		tree.setGitStatus(nextStatus);
		labelTree(tree);
	});

	$effect(() => {
		const query = normalizedSearch;
		if (!tree) return;

		tree.setSearch(query || null);
		matchCount = query ? tree.getSearchMatchingPaths().length : files.length;
	});

	function setAllExpanded(expanded: boolean) {
		if (!tree) return;

		for (const path of directoryPaths) {
			const item = tree.getItem(path);
			if (item && 'expand' in item) {
				if (expanded) item.expand();
				else item.collapse();
			}
		}
	}

	function clearSearch() {
		search = '';
	}

	function handleSearchKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter' && event.key !== 'ArrowDown') return;
		if (!tree) return;

		const candidates = normalizedSearch ? tree.getSearchMatchingPaths() : paths;
		const first = candidates.find((path) => fileMap.has(path));
		if (!first) return;

		event.preventDefault();
		tree.getItem(first)?.select();
		tree.focusPath(first);
	}
</script>

<nav class="flex flex-col h-full overflow-hidden text-[13px]" aria-label="Changed files">
	<div class="p-2 border-b border-border bg-bg-secondary space-y-2 shrink-0">
		{#if hasAnyFolders && !normalizedSearch}
			<div class="flex gap-1">
				<button
					type="button"
					onclick={() => setAllExpanded(true)}
					title="Expand all folders"
					class="flex items-center gap-1 px-2 py-1 text-[11px] bg-bg-tertiary border border-border rounded text-text-secondary cursor-pointer transition-all hover:bg-bg-primary hover:text-text-primary"
				>
					<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
						<path d="M1 3.5a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5zm1 4a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm2 4a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5z"/>
					</svg>
					Expand
				</button>
				<button
					type="button"
					onclick={() => setAllExpanded(false)}
					title="Collapse all folders"
					class="flex items-center gap-1 px-2 py-1 text-[11px] bg-bg-tertiary border border-border rounded text-text-secondary cursor-pointer transition-all hover:bg-bg-primary hover:text-text-primary"
				>
					<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
						<path d="M1 3.5a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5zm0 4a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5zm0 4a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5z"/>
					</svg>
					Collapse
				</button>
			</div>
		{/if}
		<div class="flex items-center gap-1.5">
			<input
				type="search"
				bind:value={search}
				onkeydown={handleSearchKeydown}
				placeholder="Filter files..."
				class="flex-1 min-w-0 px-2.5 py-1.5 text-xs border border-border rounded bg-bg-primary text-text-primary placeholder:text-text-muted focus:outline-none focus:border-link"
				aria-label="Filter changed files"
			/>
			{#if normalizedSearch}
				<button
					type="button"
					onclick={clearSearch}
					class="px-2 py-1 text-[11px] border border-border rounded bg-bg-tertiary text-text-secondary hover:bg-bg-primary"
				>
					Clear
				</button>
			{/if}
		</div>
		{#if normalizedSearch}
			<p class="text-[11px] text-text-muted px-0.5">
				{matchCount} matching file{matchCount === 1 ? '' : 's'}
			</p>
		{/if}
	</div>

	<div class="flex-1 min-h-0 tree-host" bind:this={mount}></div>
</nav>

<style>
	.tree-host {
		color-scheme: light;
		--trees-fg-override: var(--text-primary);
		--trees-bg-override: var(--bg-secondary);
		--trees-border-color-override: var(--border-color);
		--trees-selected-bg-override: var(--bg-tertiary);
	}

	:global([data-theme='dark']) .tree-host {
		color-scheme: dark;
	}
</style>
