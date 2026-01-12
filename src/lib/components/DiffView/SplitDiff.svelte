<script lang="ts">
	import type { DiffHunk, DiffLine } from '$lib/types/index.js';

	interface Props {
		hunks: DiffHunk[];
		filePath: string;
		highlightedLines?: string[];
	}

	let { hunks, filePath, highlightedLines }: Props = $props();

	interface SplitLine {
		left: DiffLine | null;
		right: DiffLine | null;
	}

	function splitLines(hunk: DiffHunk): SplitLine[] {
		const result: SplitLine[] = [];
		let i = 0;

		while (i < hunk.lines.length) {
			const line = hunk.lines[i];

			if (line.type === 'context') {
				result.push({ left: line, right: line });
				i++;
			} else if (line.type === 'delete') {
				const deleteLines: DiffLine[] = [];
				const addLines: DiffLine[] = [];

				while (i < hunk.lines.length && hunk.lines[i].type === 'delete') {
					deleteLines.push(hunk.lines[i]);
					i++;
				}

				while (i < hunk.lines.length && hunk.lines[i].type === 'add') {
					addLines.push(hunk.lines[i]);
					i++;
				}

				const maxLen = Math.max(deleteLines.length, addLines.length);
				for (let j = 0; j < maxLen; j++) {
					result.push({
						left: deleteLines[j] ?? null,
						right: addLines[j] ?? null
					});
				}
			} else if (line.type === 'add') {
				result.push({ left: null, right: line });
				i++;
			} else {
				i++;
			}
		}

		return result;
	}

	function formatHunkHeader(hunk: DiffHunk): string {
		const oldRange =
			hunk.oldCount === 1 ? `${hunk.oldStart}` : `${hunk.oldStart},${hunk.oldCount}`;
		const newRange =
			hunk.newCount === 1 ? `${hunk.newStart}` : `${hunk.newStart},${hunk.newCount}`;
		return `@@ -${oldRange} +${newRange} @@`;
	}
</script>

<div class="split-diff">
	<table class="diff-table">
		<colgroup>
			<col class="line-num-col" />
			<col class="content-col" />
			<col class="line-num-col" />
			<col class="content-col" />
		</colgroup>
		<tbody>
			{#each hunks as hunk, hunkIndex (hunkIndex)}
				<tr class="hunk-header">
					<td colspan="4" class="hunk-info">
						{formatHunkHeader(hunk)}
					</td>
				</tr>
				{#each splitLines(hunk) as splitLine, lineIndex (`${hunkIndex}-${lineIndex}`)}
					<tr class="split-line">
						<td
							class="line-num"
							class:line-delete={splitLine.left?.type === 'delete'}
						>
							{splitLine.left?.oldNumber ?? ''}
						</td>
						<td
							class="line-content left"
							class:line-delete={splitLine.left?.type === 'delete'}
							class:line-context={splitLine.left?.type === 'context'}
							class:line-empty={!splitLine.left}
						>{#if splitLine.left}{#if splitLine.left.wordDiff}{#each splitLine.left.wordDiff as segment}{#if segment.type === 'equal'}<span>{segment.text}</span>{:else if segment.type === 'delete'}<span class="word-delete">{segment.text}</span>{/if}{/each}{:else}{splitLine.left.content}{/if}{/if}</td>
						<td
							class="line-num"
							class:line-add={splitLine.right?.type === 'add'}
						>
							{splitLine.right?.newNumber ?? ''}
						</td>
						<td
							class="line-content right"
							class:line-add={splitLine.right?.type === 'add'}
							class:line-context={splitLine.right?.type === 'context'}
							class:line-empty={!splitLine.right}
						>{#if splitLine.right}{#if splitLine.right.wordDiff}{#each splitLine.right.wordDiff as segment}{#if segment.type === 'equal'}<span>{segment.text}</span>{:else if segment.type === 'insert'}<span class="word-insert">{segment.text}</span>{/if}{/each}{:else}{splitLine.right.content}{/if}{/if}</td>
					</tr>
				{/each}
			{/each}
		</tbody>
	</table>
</div>

<style>
	.split-diff {
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
		width: calc(50% - 50px);
	}

	.hunk-header {
		background: var(--diff-hunk-bg);
	}

	.hunk-info {
		padding: 8px 12px;
		color: var(--diff-hunk-text);
		font-weight: 500;
	}

	.split-line {
		height: 20px;
	}

	.line-num {
		width: 50px;
		min-width: 50px;
		padding: 0 8px;
		text-align: right;
		color: var(--text-muted);
		background: var(--bg-secondary);
		border-right: 1px solid var(--border-muted);
		user-select: none;
		vertical-align: top;
	}

	.line-content {
		padding: 0 12px;
		white-space: pre;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.line-content.left {
		border-right: 1px solid var(--border-color);
	}

	.line-add {
		background: var(--diff-add-bg);
	}

	.line-delete {
		background: var(--diff-delete-bg);
	}

	.line-context {
		background: var(--bg-primary);
	}

	.line-empty {
		background: var(--bg-tertiary);
	}

	.word-insert {
		background: var(--diff-add-highlight);
		border-radius: 2px;
	}

	.word-delete {
		background: var(--diff-delete-highlight);
		border-radius: 2px;
	}
</style>
