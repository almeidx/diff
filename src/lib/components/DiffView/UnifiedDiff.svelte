<script lang="ts">
	import type { DiffHunk } from '$lib/types/index.js';
	import { getLanguage } from '$lib/highlight/prism';
	import DiffLine from './DiffLine.svelte';

	interface Props {
		hunks: DiffHunk[];
		filePath: string;
	}

	let { hunks, filePath }: Props = $props();

	const language = $derived(getLanguage(filePath));

	function formatHunkHeader(hunk: DiffHunk): string {
		const oldRange =
			hunk.oldCount === 1 ? `${hunk.oldStart}` : `${hunk.oldStart},${hunk.oldCount}`;
		const newRange =
			hunk.newCount === 1 ? `${hunk.newStart}` : `${hunk.newStart},${hunk.newCount}`;
		return `@@ -${oldRange} +${newRange} @@`;
	}
</script>

<div class="font-mono text-xs leading-5 overflow-x-auto w-full">
	<table class="min-w-full w-max border-collapse">
		<colgroup>
			<col class="w-[50px] min-w-[50px]" />
			<col class="w-[50px] min-w-[50px]" />
			<col />
		</colgroup>
		<tbody>
			{#each hunks as hunk, hunkIndex (hunkIndex)}
				<tr class="bg-diff-hunk-bg">
					<td colspan="3" class="px-3 py-2 text-diff-hunk-text font-medium">
						{formatHunkHeader(hunk)}
					</td>
				</tr>
				{#each hunk.lines as line, lineIndex (`${hunkIndex}-${lineIndex}`)}
					<DiffLine {line} {language} />
				{/each}
			{/each}
		</tbody>
	</table>
</div>
