<script lang="ts">
	import type { DiffStats } from '$lib/types/index.js';

	interface Props {
		stats: DiffStats;
	}

	let { stats }: Props = $props();
</script>

<div class="flex items-center gap-3 px-4 py-2 bg-bg-secondary border border-border rounded-md text-[13px] max-md:px-2.5 max-md:py-1.5 max-md:gap-2 max-md:text-xs">
	<span class="font-medium text-text-primary">
		{stats.files} file{stats.files !== 1 ? 's' : ''} changed
	</span>
	{#if stats.insertions > 0}
		<span class="font-medium text-diff-add-text">+{stats.insertions}</span>
	{/if}
	{#if stats.deletions > 0}
		<span class="font-medium text-diff-delete-text">-{stats.deletions}</span>
	{/if}
</div>
