<script lang="ts">
	import type { DiffFile, TreeNode } from '$lib/types/index.js';
	import { buildFileTree, propagateStatus } from '$lib/utils/tree';
	import TreeNodeComponent from './TreeNode.svelte';

	interface Props {
		files: DiffFile[];
		onFileSelect?: (file: DiffFile) => void;
		selectedPath?: string;
	}

	let { files, onFileSelect, selectedPath }: Props = $props();

	let tree = $derived(propagateStatus(buildFileTree(files)));
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
