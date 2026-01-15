<script lang="ts">
	import type { DiffStats } from '$lib/types/index.js';

	interface Props {
		stats: DiffStats;
	}

	let { stats }: Props = $props();
</script>

<div class="stats-bar">
	<span class="stat files">
		{stats.files} file{stats.files !== 1 ? 's' : ''} changed
	</span>
	{#if stats.insertions > 0}
		<span class="stat additions">+{stats.insertions}</span>
	{/if}
	{#if stats.deletions > 0}
		<span class="stat deletions">-{stats.deletions}</span>
	{/if}
</div>

<style>
	.stats-bar {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 16px;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 6px;
		font-size: 13px;
	}

	.stat {
		font-weight: 500;
	}

	.files {
		color: var(--text-primary);
	}

	.additions {
		color: var(--diff-add-text);
	}

	.deletions {
		color: var(--diff-delete-text);
	}

	@media (max-width: 768px) {
		.stats-bar {
			padding: 6px 10px;
			gap: 8px;
			font-size: 12px;
		}
	}
</style>
