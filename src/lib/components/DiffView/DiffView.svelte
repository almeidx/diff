<script lang="ts">
	import { browser } from '$app/environment';
	import { tick } from 'svelte';
	import type { DiffFile } from '$lib/types/index.js';
	import { viewMode, collapsedFiles, toggleFileCollapse, setCollapsedFiles } from '$lib/stores/ui';
	import { sortFilesLikeTree } from '$lib/utils/tree';
	import UnifiedDiff from './UnifiedDiff.svelte';
	import SplitDiff from './SplitDiff.svelte';

	const INITIAL_RENDER_COUNT = 40;
	const RENDER_BATCH_SIZE = 30;

	interface Props {
		files: DiffFile[];
		selectedPath?: string;
	}

	let { files, selectedPath }: Props = $props();
	let renderedCount = $state(INITIAL_RENDER_COUNT);
	let loadMoreSentinel = $state<HTMLDivElement | null>(null);
	let lastScrolledPath = $state<string | null>(null);

	const sortedFiles = $derived(sortFilesLikeTree(files));
	const visibleFiles = $derived(sortedFiles.slice(0, renderedCount));
	const hasMoreFiles = $derived(renderedCount < sortedFiles.length);

	const fileStats = $derived.by(() => {
		const stats = new Map<string, { additions: number; deletions: number }>();

		for (const file of sortedFiles) {
			let additions = 0;
			let deletions = 0;
			for (const hunk of file.hunks) {
				for (const line of hunk.lines) {
					if (line.type === 'add') additions++;
					else if (line.type === 'delete') deletions++;
				}
			}
			stats.set(file.path, { additions, deletions });
		}

		return stats;
	});

	let prevFiles: DiffFile[] | null = null;
	$effect(() => {
		if (files !== prevFiles) {
			prevFiles = files;
			const minifiedPaths = files.filter((f) => f.isMinified).map((f) => f.path);
			setCollapsedFiles(minifiedPaths);
			renderedCount = Math.min(sortedFiles.length, INITIAL_RENDER_COUNT);
			lastScrolledPath = null;
		}
	});

	$effect(() => {
		if (!browser || !hasMoreFiles || !loadMoreSentinel) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					renderMore();
				}
			},
			{ rootMargin: '600px 0px' }
		);

		observer.observe(loadMoreSentinel);
		return () => observer.disconnect();
	});

	$effect(() => {
		if (!selectedPath) return;

		const selectedIndex = sortedFiles.findIndex((file) => file.path === selectedPath);
		if (selectedIndex === -1) return;

		if (selectedIndex >= renderedCount) {
			renderedCount = Math.min(
				sortedFiles.length,
				Math.max(selectedIndex + 1, renderedCount + RENDER_BATCH_SIZE)
			);
		}

		if (!browser || lastScrolledPath === selectedPath) return;

		void (async () => {
			await tick();
			const element = document.getElementById(`file-${selectedPath.replace(/[^\w]/g, '-')}`);
			if (element) {
				element.scrollIntoView({ behavior: 'smooth', block: 'start' });
				lastScrolledPath = selectedPath;
			}
		})();
	});

	function isCollapsed(path: string): boolean {
		return $collapsedFiles.has(path);
	}

	function renderMore() {
		if (!hasMoreFiles) return;
		renderedCount = Math.min(sortedFiles.length, renderedCount + RENDER_BATCH_SIZE);
	}
</script>

<div class="flex flex-col gap-4 min-w-0 max-w-full max-md:gap-3">
	{#each visibleFiles as file (file.path)}
		{@const stats = fileStats.get(file.path)}
		<div class="border border-border rounded-md overflow-hidden min-w-0 max-w-full" id="file-{file.path.replace(/[^\w]/g, '-')}">
			<div class="flex items-center gap-2 px-3 py-2 bg-bg-secondary border-b border-border text-[13px] max-md:flex-wrap max-md:px-2 max-md:py-1.5 max-md:text-xs">
				<button
					class="flex items-center justify-center w-6 h-6 border-none bg-transparent text-text-muted rounded transition-all hover:bg-bg-tertiary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-link focus:ring-offset-1 focus:ring-offset-bg-secondary max-md:order-0"
					onclick={() => toggleFileCollapse(file.path)}
					aria-expanded={!isCollapsed(file.path)}
					aria-label={isCollapsed(file.path) ? 'Expand file' : 'Collapse file'}
				>
					<svg
						width="16"
						height="16"
						viewBox="0 0 16 16"
						fill="currentColor"
						class="transition-transform duration-150"
						class:rotate-90={!isCollapsed(file.path)}
					>
						<path
							d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z"
						/>
					</svg>
				</button>
				<span class="flex-1 font-mono overflow-hidden text-ellipsis whitespace-nowrap max-md:flex-[1_1_calc(100%-40px)] max-md:order-1">{file.path}</span>
				<span
					class="text-xs font-medium px-2 py-0.5 rounded-xl max-md:order-2"
					class:bg-diff-add-bg={file.status === 'added'}
					class:text-diff-add-text={file.status === 'added'}
					class:bg-diff-delete-bg={file.status === 'deleted'}
					class:text-diff-delete-text={file.status === 'deleted'}
					class:bg-diff-hunk-bg={file.status === 'modified'}
					class:text-diff-hunk-text={file.status === 'modified'}
				>
					{file.status}
				</span>
				{#if file.isBinary}
					<span class="text-[11px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted max-md:order-3">Binary file</span>
				{/if}
				{#if file.isMinified}
					<span class="text-[11px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted max-md:order-3">Minified</span>
				{/if}
				{#if stats && (stats.additions > 0 || stats.deletions > 0)}
					<span class="flex gap-1.5 text-xs font-mono max-md:order-4">
						{#if stats.additions > 0}<span class="text-diff-add-text">+{stats.additions}</span>{/if}
						{#if stats.deletions > 0}<span class="text-diff-delete-text">-{stats.deletions}</span>{/if}
					</span>
				{/if}
			</div>

			{#if !isCollapsed(file.path)}
				<div class="overflow-hidden w-full">
					{#if file.isBinary}
						<div class="p-6 text-center text-text-muted italic">Binary file not shown</div>
					{:else if file.hunks.length === 0}
						<div class="p-6 text-center text-text-muted italic">
							{#if file.status === 'added'}
								Empty file added
							{:else if file.status === 'deleted'}
								Empty file deleted
							{:else}
								No changes
							{/if}
						</div>
					{:else if $viewMode === 'unified'}
						<UnifiedDiff hunks={file.hunks} filePath={file.path} />
					{:else}
						<SplitDiff hunks={file.hunks} filePath={file.path} />
					{/if}
				</div>
			{/if}
			</div>
		{/each}

	{#if hasMoreFiles}
		<div class="flex items-center justify-center gap-3 py-1" bind:this={loadMoreSentinel}>
			<span class="text-xs text-text-muted">
				Showing {visibleFiles.length} of {sortedFiles.length} files
			</span>
			<button
				type="button"
				onclick={renderMore}
				class="px-2.5 py-1 text-xs border border-border rounded bg-bg-secondary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
			>
				Load more
			</button>
		</div>
	{/if}
</div>
