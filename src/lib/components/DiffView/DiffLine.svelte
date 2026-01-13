<script lang="ts">
	import type { DiffLine as DiffLineType } from '$lib/types/index.js';
	import { wordWrap } from '$lib/stores/ui';

	interface Props {
		line: DiffLineType;
	}

	let { line }: Props = $props();

	function getLineClass(type: string): string {
		switch (type) {
			case 'add':
				return 'line-add';
			case 'delete':
				return 'line-delete';
			default:
				return 'line-context';
		}
	}

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
</script>

<tr class="diff-line {getLineClass(line.type)}" class:wrap={$wordWrap}>
	<td class="line-num old-num">
		{line.oldNumber ?? ''}
	</td>
	<td class="line-num new-num">
		{line.newNumber ?? ''}
	</td>
	<td class="line-content"><span class="prefix">{getPrefix(line.type)}</span>{#if line.wordDiff && line.wordDiff.length > 0}{#each line.wordDiff as segment}{#if segment.type === 'equal'}<span>{segment.text}</span>{:else if segment.type === 'insert'}<span class="word-insert">{segment.text}</span>{:else if segment.type === 'delete'}<span class="word-delete">{segment.text}</span>{/if}{/each}{:else}{line.content}{/if}</td>
</tr>

<style>
	.diff-line {
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
		overflow: visible;
	}

	.wrap {
		height: auto;
	}

	.wrap .line-content {
		white-space: pre-wrap;
		word-break: break-all;
	}

	.prefix {
		display: inline-block;
		width: 1ch;
		user-select: none;
	}

	.line-add {
		background: var(--diff-add-bg);
	}

	.line-add .line-num {
		background: color-mix(in srgb, var(--diff-add-bg) 50%, var(--bg-secondary));
	}

	.line-delete {
		background: var(--diff-delete-bg);
	}

	.line-delete .line-num {
		background: color-mix(in srgb, var(--diff-delete-bg) 50%, var(--bg-secondary));
	}

	.line-context {
		background: var(--bg-primary);
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
