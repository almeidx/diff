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

<div class="flex font-mono text-xs leading-5 w-full" class:wrap={$wordWrap}>
	<div class="flex flex-1 min-w-0 border-r border-border">
		<div class="shrink-0 w-[50px] bg-bg-secondary border-r border-border-muted select-none">
			{#each allLines as line, idx (idx)}
				{#if line.isHunkHeader}
					<div class="h-5 px-2 text-right bg-diff-hunk-bg" class:h-auto={$wordWrap} class:min-h-5={$wordWrap}>&nbsp;</div>
				{:else}
					<div
						class="h-5 px-2 text-right text-text-muted"
						class:h-auto={$wordWrap}
						class:min-h-5={$wordWrap}
						class:bg-diff-delete-bg={line.left?.type === 'delete'}
					>
						{line.left?.oldNumber ?? ''}
					</div>
				{/if}
			{/each}
		</div>
		<div class="flex-1 min-w-0 overflow-x-auto">
			<div class="inline-block min-w-full">
				{#each allLines as line, idx (idx)}
					{#if line.isHunkHeader}
						<div class="h-5 px-3 whitespace-pre bg-diff-hunk-bg text-diff-hunk-text font-medium">{line.hunkHeaderText}</div>
					{:else}
						<div
							class="h-5 px-3 whitespace-pre"
							class:h-auto={$wordWrap}
							class:min-h-5={$wordWrap}
							class:whitespace-pre-wrap={$wordWrap}
							class:break-all={$wordWrap}
							class:bg-diff-delete-bg={line.left?.type === 'delete'}
							class:bg-bg-primary={line.left?.type === 'context'}
							class:bg-bg-tertiary={!line.left}
						>{#if line.left}{#if line.left.wordDiff}{#each line.left.wordDiff as segment}{#if segment.type === 'equal'}<span>{segment.text}</span>{:else if segment.type === 'delete'}<span class="bg-diff-delete-highlight rounded-sm">{segment.text}</span>{/if}{/each}{:else}{@const highlighted = highlightContent(line.left.content, !!line.left.wordDiff)}{#if highlighted}{@html highlighted}{:else}{line.left.content}{/if}{/if}{/if}</div>
					{/if}
				{/each}
			</div>
		</div>
	</div>
	<div class="flex flex-1 min-w-0">
		<div class="shrink-0 w-[50px] bg-bg-secondary border-r border-border-muted select-none">
			{#each allLines as line, idx (idx)}
				{#if line.isHunkHeader}
					<div class="h-5 px-2 text-right bg-diff-hunk-bg" class:h-auto={$wordWrap} class:min-h-5={$wordWrap}>&nbsp;</div>
				{:else}
					<div
						class="h-5 px-2 text-right text-text-muted"
						class:h-auto={$wordWrap}
						class:min-h-5={$wordWrap}
						class:bg-diff-add-bg={line.right?.type === 'add'}
					>
						{line.right?.newNumber ?? ''}
					</div>
				{/if}
			{/each}
		</div>
		<div class="flex-1 min-w-0 overflow-x-auto">
			<div class="inline-block min-w-full">
				{#each allLines as line, idx (idx)}
					{#if line.isHunkHeader}
						<div class="h-5 px-3 whitespace-pre bg-diff-hunk-bg">&nbsp;</div>
					{:else}
						<div
							class="h-5 px-3 whitespace-pre"
							class:h-auto={$wordWrap}
							class:min-h-5={$wordWrap}
							class:whitespace-pre-wrap={$wordWrap}
							class:break-all={$wordWrap}
							class:bg-diff-add-bg={line.right?.type === 'add'}
							class:bg-bg-primary={line.right?.type === 'context'}
							class:bg-bg-tertiary={!line.right}
						>{#if line.right}{#if line.right.wordDiff}{#each line.right.wordDiff as segment}{#if segment.type === 'equal'}<span>{segment.text}</span>{:else if segment.type === 'insert'}<span class="bg-diff-add-highlight rounded-sm">{segment.text}</span>{/if}{/each}{:else}{@const highlighted = highlightContent(line.right.content, !!line.right.wordDiff)}{#if highlighted}{@html highlighted}{:else}{line.right.content}{/if}{/if}{/if}</div>
					{/if}
				{/each}
			</div>
		</div>
	</div>
</div>
