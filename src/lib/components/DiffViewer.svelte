<script lang="ts">
	import { CodeView, type CodeViewItem, type CodeViewOptions } from '@pierre/diffs';
	import type { DiffItem } from '#lib/compare/diff.js';
	import type { CompareSession } from '#lib/compare/session.svelte.js';
	import { formatBytes } from '#lib/format.js';
	import { DIFF_THEMES, getHighlightPool, preferredHighlighter } from '#lib/highlighter.js';
	import { settings } from '#lib/settings.svelte.js';
	import { onMount, untrack } from 'svelte';

	interface Props {
		session: CompareSession;
		/** Reports the file at the top of the viewport while scrolling. */
		onActiveFile: (path: string) => void;
	}

	let { session, onActiveFile }: Props = $props();

	let root: HTMLDivElement;
	let viewer: CodeView | null = null;
	/** Item ids in display order, for locating the file at the scroll position. */
	const order: string[] = [];
	const byPath = new Map<string, DiffItem>();

	function badge(text: string, title?: string): HTMLElement {
		const element = document.createElement('span');
		element.className = 'ml-2 rounded bg-raised px-1.5 py-px font-sans text-[11px] font-medium text-muted';
		element.textContent = text;
		if (title) element.title = title;
		return element;
	}

	function toggleCollapsed(id: string) {
		const item = viewer?.getItem(id);
		if (!viewer || !item) return;
		viewer.updateItem({ ...item, collapsed: !item.collapsed, version: (item.version ?? 0) + 1 });
	}

	const options = $derived<CodeViewOptions<undefined, undefined>>({
		theme: DIFF_THEMES,
		themeType: settings.theme,
		diffStyle: settings.diffStyle,
		overflow: settings.wrap ? 'wrap' : 'scroll',
		preferredHighlighter,
		stickyHeaders: true,
		hunkSeparators: 'line-info',
		layout: { paddingTop: 12, paddingBottom: 48, gap: 12 },
		renderHeaderPrefix: (fileOrDiff, context) => {
			if (!('hunks' in fileOrDiff) || fileOrDiff.hunks.length === 0) return null;
			const collapsed = context.item.collapsed === true;
			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'mr-1 grid size-6 place-items-center rounded text-muted hover:bg-raised hover:text-fg';
			button.ariaExpanded = String(!collapsed);
			button.ariaLabel = `${collapsed ? 'Expand' : 'Collapse'} ${context.item.id}`;
			button.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" style="transform: rotate(${collapsed ? -90 : 0}deg)"><path d="M4.4 6.4l3.4 3.4a.25.25 0 00.4 0l3.4-3.4a.25.25 0 00-.2-.4H4.6a.25.25 0 00-.2.4z"/></svg>`;
			button.onclick = () => toggleCollapsed(context.item.id);
			return button;
		},
		renderHeaderMetadata: (_, context) => {
			const item = byPath.get(context.item.id);
			if (!item) return null;
			const { change } = item;
			const sizes = [change.oldSize, change.newSize].filter((size) => size !== null).map(formatBytes).join(' → ');
			if (change.kind === 'binary') return badge(`binary · ${sizes}`);
			if (change.kind === 'too-large') return badge(`too large to diff · ${sizes}`);
			if (item.approximate) return badge('rewritten', 'The line diff took too long, so the whole file is shown as replaced.');
			if (change.minified) return badge('minified');
			return null;
		},
	});

	function toItem(item: DiffItem): CodeViewItem<undefined> {
		const id = item.change.path;
		order.push(id);
		byPath.set(id, item);
		return { type: 'diff', id, fileDiff: item.fileDiff, collapsed: item.approximate || item.change.minified };
	}

	/** The last item starting above the viewport's top edge. */
	function itemAt(scrollTop: number): string | undefined {
		let low = 0;
		let high = order.length - 1;
		let found: string | undefined;
		while (low <= high) {
			const mid = (low + high) >> 1;
			const top = viewer?.getTopForItem(order[mid]) ?? 0;
			if (top <= scrollTop + 1) {
				found = order[mid];
				low = mid + 1;
			} else {
				high = mid - 1;
			}
		}
		return found;
	}

	export function scrollToFile(path: string) {
		viewer?.scrollTo({ type: 'item', id: path, align: 'start' });
	}

	onMount(() => {
		const instance = new CodeView(untrack(() => options), getHighlightPool());
		instance.setup(root);
		viewer = instance;

		const unsubscribe = session.subscribe((items) => instance.addItems(items.map(toItem)));
		let frame = 0;
		let active: string | undefined;
		const unsubscribeScroll = instance.subscribeToScroll((scrollTop) => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => {
				const path = itemAt(scrollTop);
				if (path && path !== active) onActiveFile((active = path));
			});
		});

		return () => {
			cancelAnimationFrame(frame);
			unsubscribeScroll();
			unsubscribe();
			instance.cleanUp();
			viewer = null;
		};
	});

	let applied = untrack(() => options);
	$effect(() => {
		if (!viewer || options === applied) return;
		applied = options;
		viewer.setOptions(options);
		viewer.render();
	});
</script>

<div bind:this={root} class="code-view min-h-0 flex-1"></div>

<style>
	.code-view {
		position: relative;
		overflow-x: clip;
		overflow-y: auto;
		overscroll-behavior: contain;
		overflow-anchor: none;
		contain: strict;
		padding-inline: 12px;
	}
</style>
