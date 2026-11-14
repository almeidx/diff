<script lang="ts">
	import { FileTree } from '@pierre/trees';
	import type { ChangedFile } from '#lib/compare/diff.js';
	import { onMount } from 'svelte';

	interface Props {
		/** Already in tree order (see `comparePaths`). */
		files: readonly ChangedFile[];
		/** File currently at the top of the diff viewer. */
		active?: string;
		onSelect: (path: string) => void;
	}

	let { files, active, onSelect }: Props = $props();

	let mount: HTMLDivElement;
	let tree: FileTree | null = null;
	/** Set while the tree follows the viewer, so that selection is not echoed back as a click. */
	let following: string | null = null;

	onMount(() => {
		const byPath = new Map(files.map((file) => [file.path, file]));
		const instance = new FileTree({
			paths: files.map((file) => file.path),
			presorted: true,
			gitStatus: files.map((file) => ({ path: file.path, status: file.status })),
			flattenEmptyDirectories: true,
			initialExpansion: 'open',
			search: true,
			stickyFolders: true,
			labels: { searchPlaceholder: 'Filter files' },
			renderRowDecoration: ({ row }) => {
				const file = row.kind === 'file' ? byPath.get(row.path) : undefined;
				if (file?.kind === 'binary') return { text: 'bin', title: 'Binary file' };
				if (file?.kind === 'too-large') return { text: 'large', title: 'Too large to diff' };
				if (file?.minified) return { text: 'min', title: 'Minified file' };
				return null;
			},
			onSelectionChange: ([path]) => {
				if (path === following) {
					following = null;
					return;
				}
				if (path && byPath.has(path)) onSelect(path);
			},
		});
		instance.render({ containerWrapper: mount });
		instance.getFileTreeContainer()?.shadowRoot?.querySelector('[role="tree"]')?.setAttribute('aria-label', 'Changed files');
		tree = instance;

		return () => {
			instance.cleanUp();
			tree = null;
		};
	});

	$effect(() => {
		const path = active;
		const item = path ? tree?.getItem(path) : null;
		if (!tree || !path || !item || item.isSelected()) return;
		// Handle selection is additive; clear the previous row first.
		for (const selected of tree.getSelectedPaths()) tree.getItem(selected)?.deselect();
		following = path;
		item.select();
		tree.scrollToPath(path, { offset: 'nearest' });
	});
</script>

<div bind:this={mount} class="tree-host h-full"></div>

<style>
	.tree-host {
		--trees-bg-override: var(--surface);
		--trees-fg-override: var(--fg);
		--trees-fg-muted-override: var(--muted);
		--trees-border-color-override: var(--border);
		--trees-accent-override: var(--accent);
		--trees-search-bg-override: var(--bg);
		--trees-input-bg-override: var(--bg);
		--trees-git-added-color-override: var(--added);
		--trees-git-deleted-color-override: var(--deleted);
		--trees-git-modified-color-override: var(--accent);
		--trees-density-override: 0.85;
	}
</style>
