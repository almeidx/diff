<script lang="ts">
	import type { DiffHunk, DiffLine } from '$lib/types/index.js';
	import { wordWrap } from '$lib/stores/ui';
	import { getLanguage, highlight } from '$lib/highlight/prism';

	interface Props {
		hunks: DiffHunk[];
		filePath: string;
	}

	let { hunks, filePath }: Props = $props();

	const language = $derived(getLanguage(filePath));

	function highlightContent(content: string, hasWordDiff: boolean): string | null {
		if (!language || hasWordDiff) return null;
		return highlight(content, language);
	}

	interface SplitLine {
		left: DiffLine | null;
		right: DiffLine | null;
		isHunkHeader?: boolean;
		hunkHeaderText?: string;
	}

	let allLines = $derived.by(() => {
		const result: SplitLine[] = [];

		for (const hunk of hunks) {
			const oldRange =
				hunk.oldCount === 1 ? `${hunk.oldStart}` : `${hunk.oldStart},${hunk.oldCount}`;
			const newRange =
				hunk.newCount === 1 ? `${hunk.newStart}` : `${hunk.newStart},${hunk.newCount}`;
			result.push({
				left: null,
				right: null,
				isHunkHeader: true,
				hunkHeaderText: `@@ -${oldRange} +${newRange} @@`
			});

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
		}

		return result;
	});
</script>

<div class="split-diff" class:wrap={$wordWrap}>
	<div class="split-side left">
		<div class="line-numbers">
			{#each allLines as line, idx (idx)}
				{#if line.isHunkHeader}
					<div class="line-num hunk-header">&nbsp;</div>
				{:else}
					<div class="line-num" class:line-delete={line.left?.type === 'delete'}>
						{line.left?.oldNumber ?? ''}
					</div>
				{/if}
			{/each}
		</div>
		<div class="code-content">
			<div class="code-lines">
				{#each allLines as line, idx (idx)}
					{#if line.isHunkHeader}
						<div class="line-code hunk-header">{line.hunkHeaderText}</div>
					{:else}
						<div
							class="line-code"
							class:line-delete={line.left?.type === 'delete'}
							class:line-context={line.left?.type === 'context'}
							class:line-empty={!line.left}
						>{#if line.left}{#if line.left.wordDiff}{#each line.left.wordDiff as segment}{#if segment.type === 'equal'}<span>{segment.text}</span>{:else if segment.type === 'delete'}<span class="word-delete">{segment.text}</span>{/if}{/each}{:else}{@const highlighted = highlightContent(line.left.content, !!line.left.wordDiff)}{#if highlighted}{@html highlighted}{:else}{line.left.content}{/if}{/if}{/if}</div>
					{/if}
				{/each}
			</div>
		</div>
	</div>
	<div class="split-side right">
		<div class="line-numbers">
			{#each allLines as line, idx (idx)}
				{#if line.isHunkHeader}
					<div class="line-num hunk-header">&nbsp;</div>
				{:else}
					<div class="line-num" class:line-add={line.right?.type === 'add'}>
						{line.right?.newNumber ?? ''}
					</div>
				{/if}
			{/each}
		</div>
		<div class="code-content">
			<div class="code-lines">
				{#each allLines as line, idx (idx)}
					{#if line.isHunkHeader}
						<div class="line-code hunk-header">&nbsp;</div>
					{:else}
						<div
							class="line-code"
							class:line-add={line.right?.type === 'add'}
							class:line-context={line.right?.type === 'context'}
							class:line-empty={!line.right}
						>{#if line.right}{#if line.right.wordDiff}{#each line.right.wordDiff as segment}{#if segment.type === 'equal'}<span>{segment.text}</span>{:else if segment.type === 'insert'}<span class="word-insert">{segment.text}</span>{/if}{/each}{:else}{@const highlighted = highlightContent(line.right.content, !!line.right.wordDiff)}{#if highlighted}{@html highlighted}{:else}{line.right.content}{/if}{/if}{/if}</div>
					{/if}
				{/each}
			</div>
		</div>
	</div>
</div>

<style>
	.split-diff {
		display: flex;
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace;
		font-size: 12px;
		line-height: 20px;
		width: 100%;
	}

	.split-side {
		flex: 1;
		display: flex;
		min-width: 0;
	}

	.split-side.left {
		border-right: 1px solid var(--border-color);
	}

	.line-numbers {
		flex-shrink: 0;
		width: 50px;
		background: var(--bg-secondary);
		border-right: 1px solid var(--border-muted);
		user-select: none;
	}

	.line-num {
		height: 20px;
		padding: 0 8px;
		text-align: right;
		color: var(--text-muted);
	}

	.code-content {
		flex: 1;
		min-width: 0;
		overflow-x: auto;
	}

	.code-lines {
		display: inline-block;
		min-width: 100%;
	}

	.line-code {
		height: 20px;
		padding: 0 12px;
		white-space: pre;
	}

	.wrap .line-code {
		height: auto;
		min-height: 20px;
		white-space: pre-wrap;
		word-break: break-all;
	}

	.wrap .line-num {
		height: auto;
		min-height: 20px;
	}

	.hunk-header {
		background: var(--diff-hunk-bg);
		color: var(--diff-hunk-text);
		font-weight: 500;
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
