<script lang="ts">
	import { untrack } from 'svelte';
	import type { FileDiff as FileDiffInstance, FileDiffOptions } from '@pierre/diffs';
	import type { DiffFile } from '$lib/types/index.js';
	import { theme, viewMode, wordWrap } from '$lib/stores/ui';

	interface Props {
		file: DiffFile;
	}

	let { file }: Props = $props();

	let container = $state<HTMLDivElement | null>(null);
	let instance = $state<FileDiffInstance | null>(null);
	let appliedKey: string | null = null;

	const options = $derived<FileDiffOptions<undefined>>({
		diffStyle: $viewMode,
		disableFileHeader: true,
		overflow: $wordWrap ? 'wrap' : 'scroll',
		theme: { dark: 'github-dark', light: 'github-light' },
		themeType: $theme
	});

	$effect(() => {
		const mount = container;
		const patch = file.patch;
		if (!mount) return;

		let disposed = false;
		const initial = untrack(() => options);

		void (async () => {
			const { FileDiff, processFile } = await import('@pierre/diffs');
			if (disposed) return;

			const fileDiff = processFile(patch, { isGitDiff: true });
			if (!fileDiff) return;

			const created = new FileDiff(initial);
			created.render({ fileDiff, containerWrapper: mount });
			appliedKey = JSON.stringify(initial);
			instance = created;
		})();

		return () => {
			disposed = true;
			instance?.cleanUp();
			instance = null;
			appliedKey = null;
		};
	});

	$effect(() => {
		const next = options;
		const key = JSON.stringify(next);
		if (!instance || key === appliedKey) return;

		appliedKey = key;
		instance.options = next;
		instance.rerender();
	});
</script>

<div class="min-w-0 max-w-full" bind:this={container}></div>
