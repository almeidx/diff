<script lang="ts">
	import type { DiffLine as DiffLineType } from '$lib/types/index.js';
	import { wordWrap } from '$lib/stores/ui';
	import { highlight } from '$lib/highlight/prism';

	interface Props {
		line: DiffLineType;
		language: string | null;
	}

	let { line, language }: Props = $props();

	function getPrefix(type: string): string {
		switch (type) {
			case 'add':
				return '+';
			case 'delete':
				return '-';
			default:
				return ' ';
		}
	}

	const highlightedContent = $derived(
		language && !line.wordDiff ? highlight(line.content, language) : null
	);
</script>

<tr
	class="h-5"
	class:h-auto={$wordWrap}
	class:bg-diff-add-bg={line.type === 'add'}
	class:bg-diff-delete-bg={line.type === 'delete'}
	class:bg-bg-primary={line.type === 'context'}
>
	<td
		class="w-[50px] min-w-[50px] px-2 text-right text-text-muted border-r border-border-muted select-none align-top"
		class:bg-bg-secondary={line.type === 'context'}
		class:bg-[color-mix(in_srgb,var(--diff-add-bg)_50%,var(--bg-secondary))]={line.type === 'add'}
		class:bg-[color-mix(in_srgb,var(--diff-delete-bg)_50%,var(--bg-secondary))]={line.type === 'delete'}
	>
		{line.oldNumber ?? ''}
	</td>
	<td
		class="w-[50px] min-w-[50px] px-2 text-right text-text-muted border-r border-border-muted select-none align-top"
		class:bg-bg-secondary={line.type === 'context'}
		class:bg-[color-mix(in_srgb,var(--diff-add-bg)_50%,var(--bg-secondary))]={line.type === 'add'}
		class:bg-[color-mix(in_srgb,var(--diff-delete-bg)_50%,var(--bg-secondary))]={line.type === 'delete'}
	>
		{line.newNumber ?? ''}
	</td>
	<td
		class="px-3 whitespace-pre overflow-visible"
		class:whitespace-pre-wrap={$wordWrap}
		class:break-all={$wordWrap}
	><span class="inline-block w-[1ch] select-none">{getPrefix(line.type)}</span>{#if line.wordDiff && line.wordDiff.length > 0}{#each line.wordDiff as segment}{#if segment.type === 'equal'}<span>{segment.text}</span>{:else if segment.type === 'insert'}<span class="bg-diff-add-highlight rounded-sm">{segment.text}</span>{:else if segment.type === 'delete'}<span class="bg-diff-delete-highlight rounded-sm">{segment.text}</span>{/if}{/each}{:else if highlightedContent}{@html highlightedContent}{:else}{line.content}{/if}</td>
</tr>
