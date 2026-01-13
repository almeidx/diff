<script lang="ts">
	import type { DiffFile } from '$lib/types/index.js';
	import { viewMode, collapsedFiles, toggleFileCollapse } from '$lib/stores/ui';
	import UnifiedDiff from './UnifiedDiff.svelte';
	import SplitDiff from './SplitDiff.svelte';

	interface Props {
		files: DiffFile[];
	}

	let { files }: Props = $props();

	$effect(() => {
		const minifiedPaths = files.filter((f) => f.isMinified).map((f) => f.path);
		if (minifiedPaths.length > 0) {
			collapsedFiles.update((set) => {
				const newSet = new Set(set);
				for (const path of minifiedPaths) {
					newSet.add(path);
				}
				return newSet;
			});
		}
	});

	function isCollapsed(path: string): boolean {
		return $collapsedFiles.has(path);
	}

	function getFileStats(file: DiffFile): { additions: number; deletions: number } {
		let additions = 0;
		let deletions = 0;
		for (const hunk of file.hunks) {
			for (const line of hunk.lines) {
				if (line.type === 'add') additions++;
				else if (line.type === 'delete') deletions++;
			}
		}
		return { additions, deletions };
	}
</script>

<div class="diff-view">
	{#each files as file (file.path)}
		<div class="file-diff" id="file-{file.path.replace(/[^\w]/g, '-')}">
			<div class="file-header">
				<button
					class="collapse-toggle"
					onclick={() => toggleFileCollapse(file.path)}
					aria-expanded={!isCollapsed(file.path)}
					aria-label={isCollapsed(file.path) ? 'Expand file' : 'Collapse file'}
				>
					<svg
						width="16"
						height="16"
						viewBox="0 0 16 16"
						fill="currentColor"
						class:collapsed={isCollapsed(file.path)}
					>
						<path
							d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z"
						/>
					</svg>
				</button>
				<span class="file-path">{file.path}</span>
				<span class="file-status status-{file.status}">{file.status}</span>
				{#if file.isBinary}
					<span class="badge">Binary file</span>
				{/if}
				{#if file.isMinified}
					<span class="badge">Minified</span>
				{/if}
				{#if getFileStats(file).additions > 0 || getFileStats(file).deletions > 0}
					{@const stats = getFileStats(file)}
					<span class="file-stats">
						{#if stats.additions > 0}<span class="additions">+{stats.additions}</span>{/if}
						{#if stats.deletions > 0}<span class="deletions">-{stats.deletions}</span>{/if}
					</span>
				{/if}
			</div>

			{#if !isCollapsed(file.path)}
				<div class="file-content">
					{#if file.isBinary}
						<div class="binary-notice">Binary file not shown</div>
					{:else if file.hunks.length === 0}
						<div class="empty-notice">
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
</div>

<style>
	.diff-view {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.file-diff {
		border: 1px solid var(--border-color);
		border-radius: 6px;
		overflow: hidden;
	}

	.file-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		background: var(--bg-secondary);
		border-bottom: 1px solid var(--border-color);
		font-size: 13px;
	}

	.collapse-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border: none;
		background: transparent;
		color: var(--text-muted);
		border-radius: 4px;
		transition: all 0.15s ease;
	}

	.collapse-toggle:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.collapse-toggle svg {
		transition: transform 0.15s ease;
		transform: rotate(90deg);
	}

	.collapse-toggle svg.collapsed {
		transform: rotate(0deg);
	}

	.file-path {
		flex: 1;
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.file-status {
		font-size: 12px;
		font-weight: 500;
		padding: 2px 8px;
		border-radius: 12px;
	}

	.status-added {
		background: var(--diff-add-bg);
		color: var(--diff-add-text);
	}

	.status-deleted {
		background: var(--diff-delete-bg);
		color: var(--diff-delete-text);
	}

	.status-modified {
		background: var(--diff-hunk-bg);
		color: var(--diff-hunk-text);
	}

	.badge {
		font-size: 11px;
		padding: 2px 6px;
		border-radius: 4px;
		background: var(--bg-tertiary);
		color: var(--text-muted);
	}

	.file-stats {
		display: flex;
		gap: 6px;
		font-size: 12px;
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
	}

	.file-stats .additions {
		color: var(--diff-add-text);
	}

	.file-stats .deletions {
		color: var(--diff-delete-text);
	}

	.file-content {
		overflow-x: auto;
	}

	.binary-notice,
	.empty-notice {
		padding: 24px;
		text-align: center;
		color: var(--text-muted);
		font-style: italic;
	}
</style>
