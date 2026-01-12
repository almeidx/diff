<script lang="ts">
	import type { DiffFile, TreeNode } from '$lib/types/index.js';
	import { buildFileTree, propagateStatus } from '$lib/utils/tree';
	import { expandedPaths } from '$lib/stores/ui';
	import TreeNodeComponent from './TreeNode.svelte';

	interface Props {
		files: DiffFile[];
		onFileSelect?: (file: DiffFile) => void;
		selectedPath?: string;
	}

	let { files, onFileSelect, selectedPath }: Props = $props();

	let tree = $derived(propagateStatus(buildFileTree(files)));

	$effect(() => {
		if (files.length > 0) {
			const firstFile = files[0];
			const parts = firstFile.path.split('/');
			if (parts.length > 1) {
				const pathsToExpand: string[] = [];
				for (let i = 0; i < parts.length - 1; i++) {
					pathsToExpand.push(parts.slice(0, i + 1).join('/'));
				}
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

	.tree-root {
		list-style: none;
		padding: 8px;
	}
</style>
