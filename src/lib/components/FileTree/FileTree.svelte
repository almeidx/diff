<script lang="ts">
	import type { DiffFile, TreeNode } from '$lib/types/index.js';
	import { buildFileTree, propagateStatusWithFolders, getSingleChildFolderPaths } from '$lib/utils/tree';
	import { expandedPaths, expandAllPaths, collapseAllPaths } from '$lib/stores/ui';
	import TreeNodeComponent from './TreeNode.svelte';

	interface Props {
		files: DiffFile[];
		onFileSelect?: (file: DiffFile) => void;
		selectedPath?: string;
	}

	let { files, onFileSelect, selectedPath }: Props = $props();

	let treeData = $derived(propagateStatusWithFolders(buildFileTree(files)));
	let tree = $derived(treeData.nodes);
	let allFolderPaths = $derived(treeData.folderPaths);
	let hasAnyFolders = $derived(allFolderPaths.length > 0);

	function handleExpandAll() {
		expandAllPaths(allFolderPaths);
	}

	function handleCollapseAll() {
		collapseAllPaths();
	}

	$effect(() => {
		if (files.length > 0) {
			const pathsToExpand: string[] = [];

			for (const node of tree) {
				if (node.isDirectory) {
					pathsToExpand.push(node.path);
				}
			}

			const firstFile = files[0];
			const parts = firstFile.path.split('/');
			if (parts.length > 1) {
				for (let i = 0; i < parts.length - 1; i++) {
					pathsToExpand.push(parts.slice(0, i + 1).join('/'));
				}
			}

			const singleChildPaths = getSingleChildFolderPaths(tree);
			for (const p of singleChildPaths) {
				if (!pathsToExpand.includes(p)) {
					pathsToExpand.push(p);
				}
			}

			if (pathsToExpand.length > 0) {
				expandedPaths.update((set) => {
					const newSet = new Set(set);
					for (const p of pathsToExpand) {
						newSet.add(p);
					}
					return newSet;
				});
			}
		}
	});
</script>

<nav class="overflow-y-auto overflow-x-hidden text-[13px]" aria-label="Changed files">
	{#if hasAnyFolders}
		<div class="flex gap-1 p-2 border-b border-border bg-bg-secondary">
			<button
				type="button"
				onclick={handleExpandAll}
				title="Expand all folders"
				class="flex items-center gap-1 px-2 py-1 text-[11px] bg-bg-tertiary border border-border rounded text-text-secondary cursor-pointer transition-all hover:bg-bg-primary hover:text-text-primary"
			>
				<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
					<path d="M1 3.5a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5zm1 4a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm2 4a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5z"/>
				</svg>
				Expand
			</button>
			<button
				type="button"
				onclick={handleCollapseAll}
				title="Collapse all folders"
				class="flex items-center gap-1 px-2 py-1 text-[11px] bg-bg-tertiary border border-border rounded text-text-secondary cursor-pointer transition-all hover:bg-bg-primary hover:text-text-primary"
			>
				<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
					<path d="M1 3.5a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5zm0 4a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5zm0 4a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5z"/>
				</svg>
				Collapse
			</button>
		</div>
	{/if}
	<ul class="list-none p-2">
		{#each tree as node (node.path)}
			<TreeNodeComponent {node} {onFileSelect} {selectedPath} />
		{/each}
	</ul>
</nav>
