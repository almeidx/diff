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

<div class="diff-page">
	<header class="page-header">
		<div class="header-left">
			<a href="/" class="logo">diff</a>
			<span class="breadcrumb">
				<span class="package-type">npm</span>
				<span class="separator">/</span>
				<span class="package-name">{data.packageName}</span>
			</span>
		</div>
		<div class="header-right">
			<ThemeToggle />
		</div>
	</header>

	<div class="version-bar">
		<VersionSelector
			versions={data.versions}
			value={data.fromVersion}
			onchange={(v) => navigateToVersions(v, data.toVersion)}
			label="From"
			id="from-version"
			disabledVersion={data.toVersion}
			loading={isNavigating}
		/>
		<span class="version-arrow">→</span>
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

	{#if data.error}
		<div class="error-container">
			<div class="error-message">
				<h2>Version not found</h2>
				<p>{data.error.message}</p>
				<p>Available versions:</p>
				<div class="version-list">
					{#each data.error.availableVersions.slice(0, 20) as version}
						<span class="version-tag">{version}</span>
					{/each}
					{#if data.error.availableVersions.length > 20}
						<span class="more">+{data.error.availableVersions.length - 20} more</span>
					{/if}
				</div>
			</div>
		</div>
	{:else if data.diff}
		<div class="toolbar">
			<StatsBar stats={data.diff.stats} />
			<ViewToggle />
		</div>

		<div class="main-content">
			<aside class="sidebar">
				<FileTree
					files={data.diff.files}
					onFileSelect={handleFileSelect}
					{selectedPath}
				/>
			</aside>
			<main class="diff-content">
				<DiffView files={data.diff.files} />
			</main>
		</div>
	{/if}
</div>

<style>
	.diff-page {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		background: var(--bg-secondary);
		border-bottom: 1px solid var(--border-color);
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.logo {
		font-size: 18px;
		font-weight: 700;
		color: var(--text-primary);
		text-decoration: none;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
	}

	.package-type {
		padding: 2px 8px;
		background: var(--bg-tertiary);
		border-radius: 4px;
		color: var(--text-secondary);
		font-size: 12px;
		font-weight: 500;
	}

	.separator {
		color: var(--text-muted);
	}

	.package-name {
		font-weight: 500;
		font-family: ui-monospace, monospace;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.version-bar {
		display: flex;
		align-items: flex-end;
		gap: 16px;
		padding: 16px;
		background: var(--bg-primary);
		border-bottom: 1px solid var(--border-color);
	}

	.version-arrow {
		padding-bottom: 10px;
		color: var(--text-muted);
		font-size: 18px;
	}

	.toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		background: var(--bg-primary);
		border-bottom: 1px solid var(--border-color);
	}

	.main-content {
		display: flex;
		flex: 1;
		overflow: hidden;
	}

	.sidebar {
		width: 280px;
		min-width: 200px;
		max-width: 400px;
		border-right: 1px solid var(--border-color);
		background: var(--bg-secondary);
		overflow-y: auto;
	}

	.diff-content {
		flex: 1;
		overflow: auto;
		padding: 16px;
	}

	.error-container {
		display: flex;
		justify-content: center;
		padding: 48px 16px;
	}

	.error-message {
		max-width: 600px;
		padding: 24px;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 8px;
	}

	.error-message h2 {
		margin-bottom: 8px;
		color: var(--diff-delete-text);
	}

	.error-message p {
		margin-bottom: 12px;
		color: var(--text-secondary);
	}

	.version-list {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.version-tag {
		padding: 4px 8px;
		background: var(--bg-tertiary);
		border-radius: 4px;
		font-size: 12px;
		font-family: ui-monospace, monospace;
	}

	.more {
		padding: 4px 8px;
		color: var(--text-muted);
		font-size: 12px;
	}

	@media (max-width: 768px) {
		.main-content {
			flex-direction: column;
		}

		.sidebar {
			width: 100%;
			max-width: none;
			max-height: 200px;
			border-right: none;
			border-bottom: 1px solid var(--border-color);
		}

		.version-bar {
			flex-direction: column;
			align-items: stretch;
		}

		.version-arrow {
			display: none;
		}
	}
</style>
