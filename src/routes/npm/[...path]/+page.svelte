<script lang="ts">
	import type { PageData } from './$types';
	import FileTree from '$lib/components/FileTree/FileTree.svelte';
	import DiffView from '$lib/components/DiffView/DiffView.svelte';
	import StatsBar from '$lib/components/StatsBar.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import ViewToggle from '$lib/components/ViewToggle.svelte';
	import VersionSelector from '$lib/components/VersionSelector.svelte';
	import { goto } from '$app/navigation';
	import { navigating } from '$app/stores';
	import type { DiffFile } from '$lib/types/index.js';
	import ScrollToTop from '$lib/components/ScrollToTop.svelte';

	let { data }: { data: PageData } = $props();

	let selectedPath = $state<string | undefined>(undefined);

	let isNavigating = $derived(!!$navigating);

	function handleFileSelect(file: DiffFile) {
		selectedPath = file.path;
		const element = document.getElementById(`file-${file.path.replace(/[^\w]/g, '-')}`);
		element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	function navigateToVersions(from: string, to: string) {
		goto(`/npm/${data.packageName}/${from}...${to}`);
	}
</script>

<svelte:head>
	<title>{data.packageName} {data.fromVersion}...{data.toVersion} - Diff</title>
</svelte:head>

<div class="flex flex-col min-h-screen">
	<header class="flex items-center justify-between px-4 py-3 bg-bg-secondary border-b border-border sticky top-0 z-[100]">
		<div class="flex items-center gap-4">
			<a href="/" class="text-lg font-bold text-text-primary no-underline">diff</a>
			<span class="flex items-center gap-2 text-sm">
				<span class="px-2 py-0.5 bg-bg-tertiary rounded text-text-secondary text-xs font-medium">npm</span>
				<span class="text-text-muted">/</span>
				<span class="font-medium font-mono">{data.packageName}</span>
			</span>
		</div>
		<div class="flex items-center gap-3">
			<ThemeToggle />
		</div>
	</header>

	<div class="flex items-end gap-4 p-4 bg-bg-primary border-b border-border max-md:flex-col max-md:items-stretch">
		<div class="min-w-[200px] flex-1 max-w-xs max-md:min-w-0 max-md:max-w-none">
			<VersionSelector
				versions={data.versions}
				value={data.fromVersion}
				onchange={(v) => navigateToVersions(v, data.toVersion)}
				label="From"
				id="from-version"
				disabledVersion={data.toVersion}
				loading={isNavigating}
			/>
		</div>
		<span class="pb-2.5 text-text-muted text-lg max-md:hidden">→</span>
		<div class="min-w-[200px] flex-1 max-w-xs max-md:min-w-0 max-md:max-w-none">
			<VersionSelector
				versions={data.versions}
				value={data.toVersion}
				onchange={(v) => navigateToVersions(data.fromVersion, v)}
				label="To"
				id="to-version"
				disabledVersion={data.fromVersion}
				loading={isNavigating}
			/>
		</div>
	</div>

	{#if data.error}
		<div class="flex justify-center px-4 py-12">
			<div class="max-w-[600px] p-6 bg-bg-secondary border border-border rounded-lg">
				{#if data.error.type === 'invalid_version'}
					<h2 class="mb-2 text-diff-delete-text">Version not found</h2>
					<p class="mb-3 text-text-secondary">{data.error.message}</p>
					<p class="mb-3 text-text-secondary">Available versions:</p>
					<div class="flex flex-wrap gap-2">
						{#each data.error.availableVersions.slice(0, 20) as version}
							<span class="px-2 py-1 bg-bg-tertiary rounded text-xs font-mono">{version}</span>
						{/each}
						{#if data.error.availableVersions.length > 20}
							<span class="px-2 py-1 text-text-muted text-xs">+{data.error.availableVersions.length - 20} more</span>
						{/if}
					</div>
				{:else}
					<h2 class="mb-2 text-diff-delete-text">Failed to load diff</h2>
					<p class="mb-3 text-text-secondary">{data.error.message}</p>
					<p class="text-sm text-text-muted">This may be due to package size limits or network issues. Try again later or try a different version range.</p>
				{/if}
			</div>
		</div>
	{:else if data.diff}
		<div class="flex items-center justify-between px-4 py-3 bg-bg-primary border-b border-border max-md:flex-wrap max-md:gap-2">
			<StatsBar stats={data.diff.stats} />
			<div class="flex items-center gap-3">
				{#if data.compareUrl}
					<a href={data.compareUrl} class="flex items-center justify-center w-8 h-8 rounded-md text-text-secondary transition-all hover:bg-bg-secondary hover:text-text-primary hover:no-underline" target="_blank" rel="noopener" aria-label="Compare on GitHub" title="Compare on GitHub">
						<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
							<path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
						</svg>
					</a>
				{/if}
				<ViewToggle />
			</div>
		</div>

		<div class="flex flex-1 items-stretch min-w-0 max-md:flex-col max-md:bg-transparent" style:background="linear-gradient(to right, var(--bg-secondary) 280px, transparent 280px)">
			<aside class="w-[280px] min-w-[200px] max-w-[400px] border-r border-border bg-bg-secondary overflow-y-auto sticky top-[61px] h-[calc(100vh-61px)] max-md:w-full max-md:max-w-none max-md:h-auto max-md:max-h-[200px] max-md:border-r-0 max-md:border-b max-md:static">
				<FileTree
					files={data.diff.files}
					onFileSelect={handleFileSelect}
					{selectedPath}
				/>
			</aside>
			<main class="flex-1 p-4 min-w-0 max-md:p-2 max-md:w-full max-md:box-border">
				<DiffView files={data.diff.files} />
			</main>
		</div>
	{/if}

	<ScrollToTop />
</div>
