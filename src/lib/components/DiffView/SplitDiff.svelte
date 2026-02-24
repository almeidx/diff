<script lang="ts">
	import { browser } from '$app/environment';
	import type { DiffHunk, DiffLine } from '$lib/types/index.js';
	import { wordWrap } from '$lib/stores/ui';
	import { getLanguage, highlight } from '$lib/highlight/prism';

	const INITIAL_LINE_COUNT = 400;
	const LINE_BATCH_SIZE = 250;

	interface Props {
		hunks: DiffHunk[];
		filePath: string;
	}

	interface RawSplitLine {
		left: DiffLine | null;
		right: DiffLine | null;
		isHunkHeader?: boolean;
		hunkHeaderText?: string;
	}

	interface SplitLine extends RawSplitLine {
		leftHighlighted?: string | null;
		rightHighlighted?: string | null;
	}

	let { hunks, filePath }: Props = $props();
	let loadMoreSentinel = $state<HTMLDivElement | null>(null);
	let renderedLineCount = $state(INITIAL_LINE_COUNT);

	const language = $derived(getLanguage(filePath));

	function getHighlightedContent(line: DiffLine | null): string | null {
		if (!line || !language || line.wordDiff) return null;
		return highlight(line.content, language);
	}

	function enhanceVisibleLine(line: RawSplitLine): SplitLine {
		if (line.isHunkHeader) return line;

		return {
			...line,
			leftHighlighted: getHighlightedContent(line.left),
			rightHighlighted: getHighlightedContent(line.right)
		};
	}

	let allLines = $derived.by<RawSplitLine[]>(() => {
		const result: RawSplitLine[] = [];

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
					continue;
				}

				if (line.type === 'delete') {
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
					continue;
				}

				if (line.type === 'add') {
					result.push({ left: null, right: line });
					i++;
					continue;
				}

				i++;
			}
		}

		return result;
	});

	let visibleLines = $derived(
		allLines.slice(0, renderedLineCount).map((line) => enhanceVisibleLine(line))
	);
	let hasMoreLines = $derived(renderedLineCount < allLines.length);

	$effect(() => {
		renderedLineCount = Math.min(allLines.length, INITIAL_LINE_COUNT);
	});

	$effect(() => {
		if (!browser || !hasMoreLines || !loadMoreSentinel) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					renderMoreLines();
				}
			},
			{ rootMargin: '800px 0px' }
		);

		observer.observe(loadMoreSentinel);
		return () => observer.disconnect();
	});

	function renderMoreLines() {
		if (!hasMoreLines) return;
		renderedLineCount = Math.min(allLines.length, renderedLineCount + LINE_BATCH_SIZE);
	}
</script>

<div class="flex font-mono text-xs leading-5 w-full" class:wrap={$wordWrap}>
	<div class="flex flex-1 min-w-0 border-r border-border">
		<div class="shrink-0 w-[50px] bg-bg-secondary border-r border-border-muted select-none">
			{#each visibleLines as line, idx (idx)}
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
				{#each visibleLines as line, idx (idx)}
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
						>
							{#if line.left}
								{#if line.left.wordDiff}
									{#each line.left.wordDiff as segment}
										{#if segment.type === 'equal'}
											<span>{segment.text}</span>
										{:else if segment.type === 'delete'}
											<span class="bg-diff-delete-highlight rounded-sm">{segment.text}</span>
										{/if}
									{/each}
								{:else if line.leftHighlighted}
									{@html line.leftHighlighted}
								{:else}
									{line.left.content}
								{/if}
							{/if}
						</div>
					{/if}
				{/each}
			</div>
		</div>
	</div>
	<div class="flex flex-1 min-w-0">
		<div class="shrink-0 w-[50px] bg-bg-secondary border-r border-border-muted select-none">
			{#each visibleLines as line, idx (idx)}
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
				{#each visibleLines as line, idx (idx)}
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
						>
							{#if line.right}
								{#if line.right.wordDiff}
									{#each line.right.wordDiff as segment}
										{#if segment.type === 'equal'}
											<span>{segment.text}</span>
										{:else if segment.type === 'insert'}
											<span class="bg-diff-add-highlight rounded-sm">{segment.text}</span>
										{/if}
									{/each}
								{:else if line.rightHighlighted}
									{@html line.rightHighlighted}
								{:else}
									{line.right.content}
								{/if}
							{/if}
						</div>
					{/if}
				{/each}
			</div>
		</div>
	</div>
</div>

{#if hasMoreLines}
	<div class="flex items-center justify-center gap-3 py-2" bind:this={loadMoreSentinel}>
		<span class="text-xs text-text-muted">
			Showing {visibleLines.length} of {allLines.length} lines
		</span>
		<button
			type="button"
			onclick={renderMoreLines}
			class="px-2.5 py-1 text-xs border border-border rounded bg-bg-secondary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
		>
			Load more lines
		</button>
	</div>
{/if}
