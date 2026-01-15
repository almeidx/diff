<script lang="ts">
	import type { DiffFile, TreeNode } from '$lib/types/index.js';
	import { buildFileTree, propagateStatus, getSingleChildFolderPaths, getAllFolderPaths } from '$lib/utils/tree';
	import { expandedPaths, expandAllPaths, collapseAllPaths } from '$lib/stores/ui';
	import TreeNodeComponent from './TreeNode.svelte';

	interface Props {
		files: DiffFile[];
		onFileSelect?: (file: DiffFile) => void;
		selectedPath?: string;
	}

	let { files, onFileSelect, selectedPath }: Props = $props();

	let tree = $derived(propagateStatus(buildFileTree(files)));
	let allFolderPaths = $derived(getAllFolderPaths(tree));
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

<nav class="file-tree" aria-label="Changed files">
	{#if hasAnyFolders}
		<div class="tree-actions">
			<button type="button" onclick={handleExpandAll} title="Expand all folders">
				<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
					<path d="M1 3.5a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5zm1 4a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm2 4a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5z"/>
				</svg>
				Expand
			</button>
			<button type="button" onclick={handleCollapseAll} title="Collapse all folders">
				<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
					<path d="M1 3.5a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5zm0 4a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5zm0 4a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5z"/>
				</svg>
				Collapse
			</button>
		</div>
	{/if}
	<ul class="tree-root">
		{#each tree as node (node.path)}
			<TreeNodeComponent {node} {onFileSelect} {selectedPath} />
		{/each}
	</ul>
</nav>

<style>
	.file-tree {
		overflow-y: auto;
		overflow-x: hidden;
		font-size: 13px;
	}

	.tree-actions {
		display: flex;
		gap: 4px;
		padding: 8px;
		border-bottom: 1px solid var(--border-color);
		background: var(--bg-secondary);
	}

	.tree-actions button {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 4px 8px;
		font-size: 11px;
		background: var(--bg-tertiary);
		border: 1px solid var(--border-color);
		border-radius: 4px;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.tree-actions button:hover {
		background: var(--bg-primary);
		color: var(--text-primary);
	}

	.tree-root {
		list-style: none;
		padding: 8px;
	}
</style>
