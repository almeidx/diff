<script lang="ts">
	import type { DiffHunk } from '$lib/types/index.js';
	import DiffLine from './DiffLine.svelte';

	interface Props {
		hunks: DiffHunk[];
		filePath: string;
		highlightedLines?: string[];
	}

	let { hunks, filePath, highlightedLines }: Props = $props();

	function formatHunkHeader(hunk: DiffHunk): string {
		const oldRange =
			hunk.oldCount === 1 ? `${hunk.oldStart}` : `${hunk.oldStart},${hunk.oldCount}`;
		const newRange =
			hunk.newCount === 1 ? `${hunk.newStart}` : `${hunk.newStart},${hunk.newCount}`;
		return `@@ -${oldRange} +${newRange} @@`;
	}
</script>

<div class="unified-diff">
	<table class="diff-table">
		<colgroup>
			<col class="line-num-col" />
			<col class="line-num-col" />
			<col class="content-col" />
		</colgroup>
		<tbody>
			{#each hunks as hunk, hunkIndex (hunkIndex)}
				<tr class="hunk-header">
					<td colspan="3" class="hunk-info">
						{formatHunkHeader(hunk)}
					</td>
				</tr>
				{#each hunk.lines as line, lineIndex (`${hunkIndex}-${lineIndex}`)}
					<DiffLine {line} highlighted={highlightedLines?.[lineIndex]} />
				{/each}
			{/each}
		</tbody>
	</table>
</div>

<style>
	.unified-diff {
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
		font-size: 12px;
		line-height: 20px;
	}

	.diff-table {
		width: 100%;
		border-collapse: collapse;
		table-layout: fixed;
	}

	.line-num-col {
		width: 50px;
	}

	.content-col {
		width: auto;
	}

	.hunk-header {
		background: var(--diff-hunk-bg);
	}

	.hunk-info {
		padding: 8px 12px;
		color: var(--diff-hunk-text);
		font-weight: 500;
	}
</style>
