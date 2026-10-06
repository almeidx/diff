<script lang="ts">
	import { untrack } from 'svelte';
	import type {
		FileDiff as FileDiffInstance,
		FileDiffMetadata,
		FileDiffOptions,
		FileDiffLoadedFiles
	} from '@pierre/diffs';
	import type { DiffFile, FileContentsPair } from '#lib/types/index.js';
	import { theme, viewMode, wordWrap } from '#lib/stores/ui.js';

	interface Props {
		file: DiffFile;
		loadContext?: (name: string) => Promise<FileContentsPair | null>;
	}

	let { file, loadContext }: Props = $props();

	async function loadDiffFiles(fileDiff: FileDiffMetadata): Promise<FileDiffLoadedFiles> {
		if (!loadContext) throw new Error('Cannot expand context without a diff source');

		const contents = await loadContext(fileDiff.name);
		if (!contents) throw new Error(`Could not load full contents of ${fileDiff.name}`);

		return {
			oldFile: { name: fileDiff.prevName ?? fileDiff.name, contents: contents.oldContents },
			newFile: { name: fileDiff.name, contents: contents.newContents }
		};
	}

	let container = $state<HTMLDivElement | null>(null);
	let instance = $state<FileDiffInstance | null>(null);
	let appliedKey: string | null = null;

	const options = $derived<FileDiffOptions<undefined, undefined>>({
		diffStyle: $viewMode,
		disableFileHeader: true,
		overflow: $wordWrap ? 'wrap' : 'scroll',
		theme: { dark: 'github-dark', light: 'github-light' },
		themeType: $theme,
		loadDiffFiles: loadContext ? loadDiffFiles : undefined
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
		})().catch((error) => {
			console.error(`Failed to render diff for ${file.path}`, error);
		});

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
