<script lang="ts">
	import { browser } from '$app/environment';
	import { formatHunkHeader, type DiffHunk, type DiffLine } from '$lib/types/index.js';
	import type { WordChange } from '$lib/types/index.js';
	import { getSideWordDiff } from '$lib/diff/word-diff';
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
		wordDiffSource?: WordDiffSource;
		wordDiff?: WordChange[];
	}

	interface WordDiffSource {
		oldText: string;
		newText: string;
		side: 'delete' | 'add';
	}

	let { hunks, filePath }: Props = $props();
	let loadMoreSentinel = $state<HTMLDivElement | null>(null);
	let renderedRowCount = $state(INITIAL_ROW_COUNT);

	const language = $derived(getLanguage(filePath));

	function lineRow(hunkIndex: number, lineIndex: number, line: DiffLine, wordDiffSource?: WordDiffSource): UnifiedRow {
		return {
			kind: 'line',
			key: `l-${hunkIndex}-${lineIndex}`,
			line,
			wordDiffSource
		};
	}

	function enhanceVisibleRow(row: UnifiedRow): UnifiedRow {
		if (!browser || !row.wordDiffSource) return row;

		return {
			...row,
			wordDiff: getSideWordDiff(
				row.wordDiffSource.oldText,
				row.wordDiffSource.newText,
				row.wordDiffSource.side
			)
		};
	}

	let allRows = $derived.by<UnifiedRow[]>(() => {
		const rows: UnifiedRow[] = [];

		for (let hunkIndex = 0; hunkIndex < hunks.length; hunkIndex++) {
			const hunk = hunks[hunkIndex];
			rows.push({
				kind: 'header',
				key: `h-${hunkIndex}`,
				headerText: formatHunkHeader(hunk)
			});

			let lineIndex = 0;
			while (lineIndex < hunk.lines.length) {
				const line = hunk.lines[lineIndex];

				if (line.type === 'delete') {
					const deleteLines: Array<{ line: DiffLine; index: number }> = [];
					const addLines: Array<{ line: DiffLine; index: number }> = [];

					while (lineIndex < hunk.lines.length && hunk.lines[lineIndex].type === 'delete') {
						deleteLines.push({ line: hunk.lines[lineIndex], index: lineIndex });
						lineIndex++;
					}

					while (lineIndex < hunk.lines.length && hunk.lines[lineIndex].type === 'add') {
						addLines.push({ line: hunk.lines[lineIndex], index: lineIndex });
						lineIndex++;
					}

					const pairCount = Math.min(deleteLines.length, addLines.length);
					for (let i = 0; i < deleteLines.length; i++) {
						const pairedLine = i < pairCount ? addLines[i].line : null;
						rows.push(lineRow(
							hunkIndex,
							deleteLines[i].index,
							deleteLines[i].line,
							pairedLine
								? { oldText: deleteLines[i].line.content, newText: pairedLine.content, side: 'delete' }
								: undefined
						));
					}
					for (let i = 0; i < addLines.length; i++) {
						const pairedLine = i < pairCount ? deleteLines[i].line : null;
						rows.push(lineRow(
							hunkIndex,
							addLines[i].index,
							addLines[i].line,
							pairedLine
								? { oldText: pairedLine.content, newText: addLines[i].line.content, side: 'add' }
								: undefined
						));
					}
					continue;
				}

				rows.push(lineRow(hunkIndex, lineIndex, line));
				lineIndex++;
			}
		}

		return rows;
	});

	let visibleRows = $derived(allRows.slice(0, renderedRowCount).map((row) => enhanceVisibleRow(row)));
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
					<DiffLineComponent line={row.line} {language} wordDiff={row.wordDiff} />
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
