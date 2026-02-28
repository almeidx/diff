<script lang="ts">
	import { browser } from '$app/environment';
	import type { DiffHunk, DiffLine } from '$lib/types/index.js';
	import { wordWrap } from '$lib/stores/ui';
	import { getLanguage } from '$lib/highlight/prism';
	import DiffLineComponent from './DiffLine.svelte';

	const INITIAL_ROW_COUNT = 500;
	const ROW_BATCH_SIZE = 300;

	interface Props {
		hunks: DiffHunk[];
		filePath: string;
	}

	interface UnifiedRow {
		kind: 'header' | 'line';
		key: string;
		headerText?: string;
		line?: DiffLine;
	}

	let { hunks, filePath }: Props = $props();
	let loadMoreSentinel = $state<HTMLDivElement | null>(null);
	let renderedRowCount = $state(INITIAL_ROW_COUNT);

	const language = $derived(getLanguage(filePath));

	let allRows = $derived.by<UnifiedRow[]>(() => {
		const rows: UnifiedRow[] = [];

		for (let hunkIndex = 0; hunkIndex < hunks.length; hunkIndex++) {
			const hunk = hunks[hunkIndex];
			rows.push({
				kind: 'header',
				key: `h-${hunkIndex}`,
				headerText: formatHunkHeader(hunk)
			});

			for (let lineIndex = 0; lineIndex < hunk.lines.length; lineIndex++) {
				rows.push({
					kind: 'line',
					key: `l-${hunkIndex}-${lineIndex}`,
					line: hunk.lines[lineIndex]
				});
			}
		}

		return rows;
	});

	let visibleRows = $derived(allRows.slice(0, renderedRowCount));
	let hasMoreRows = $derived(renderedRowCount < allRows.length);

	$effect(() => {
		renderedRowCount = Math.min(allRows.length, INITIAL_ROW_COUNT);
	});

	$effect(() => {
		if (!browser || !hasMoreRows || !loadMoreSentinel) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					renderMoreRows();
				}
			},
			{ rootMargin: '800px 0px' }
		);

		observer.observe(loadMoreSentinel);
		return () => observer.disconnect();
	});

	function renderMoreRows() {
		if (!hasMoreRows) return;
		renderedRowCount = Math.min(allRows.length, renderedRowCount + ROW_BATCH_SIZE);
	}

	function formatHunkHeader(hunk: DiffHunk): string {
		const oldRange =
			hunk.oldCount === 1 ? `${hunk.oldStart}` : `${hunk.oldStart},${hunk.oldCount}`;
		const newRange =
			hunk.newCount === 1 ? `${hunk.newStart}` : `${hunk.newStart},${hunk.newCount}`;
		return `@@ -${oldRange} +${newRange} @@`;
	}
</script>

<div
	class="font-mono text-xs leading-5 w-full"
	class:overflow-x-auto={!$wordWrap}
	class:overflow-x-hidden={$wordWrap}
>
	<table
		class="min-w-full border-collapse"
		class:w-max={!$wordWrap}
		class:w-full={$wordWrap}
		class:table-fixed={$wordWrap}
	>
		<caption class="sr-only">Unified diff for {filePath}</caption>
		<colgroup>
			<col class="w-[50px] min-w-[50px]" />
			<col class="w-[50px] min-w-[50px]" />
			<col />
		</colgroup>
		<thead class="sr-only">
			<tr>
				<th scope="col">Old line</th>
				<th scope="col">New line</th>
				<th scope="col">Content</th>
			</tr>
		</thead>
		<tbody>
			{#each visibleRows as row (row.key)}
				{#if row.kind === 'header'}
					<tr class="bg-diff-hunk-bg">
						<td colspan="3" class="px-3 py-2 text-diff-hunk-text font-medium">
							{row.headerText}
						</td>
					</tr>
				{:else if row.line}
					<DiffLineComponent line={row.line} {language} />
				{/if}
			{/each}
		</tbody>
	</table>
</div>

{#if hasMoreRows}
	<div class="flex items-center justify-center gap-3 py-2" bind:this={loadMoreSentinel}>
		<span class="text-xs text-text-muted">
			Showing {visibleRows.length} of {allRows.length} lines
		</span>
		<button
			type="button"
			onclick={renderMoreRows}
			class="px-2.5 py-1 text-xs border border-border rounded bg-bg-secondary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
		>
			Load more lines
		</button>
	</div>
{/if}
