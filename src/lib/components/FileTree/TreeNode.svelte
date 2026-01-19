<script lang="ts">
	import type { DiffFile, TreeNode } from '$lib/types/index.js';
	import { expandedPaths, togglePath, expandPaths } from '$lib/stores/ui';
	import TreeNodeComponent from './TreeNode.svelte';

	interface Props {
		node: TreeNode;
		onFileSelect?: (file: DiffFile) => void;
		selectedPath?: string;
		depth?: number;
	}

	let { node, onFileSelect, selectedPath, depth = 0 }: Props = $props();

	let isExpanded = $derived($expandedPaths.has(node.path) || depth === 0);

	function getSingleFolderChildPaths(n: TreeNode): string[] {
		const paths: string[] = [];
		if (!n.children || n.children.length !== 1) return paths;

		const child = n.children[0];
		if (child.isDirectory) {
			paths.push(child.path);
			paths.push(...getSingleFolderChildPaths(child));
		}
		return paths;
	}

	function handleClick() {
		if (node.isDirectory) {
			const wasExpanded = $expandedPaths.has(node.path);
			togglePath(node.path);

			if (!wasExpanded && node.children) {
				const childPaths = getSingleFolderChildPaths(node);
				if (childPaths.length > 0) {
					expandPaths(childPaths);
				}
			}
		} else if (node.file && onFileSelect) {
			onFileSelect(node.file);
		}
	}
</script>

<li class="list-none">
	<button
		type="button"
		class="flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer select-none hover:bg-bg-tertiary w-full text-left border-none bg-transparent focus:outline-none focus:ring-2 focus:ring-link focus:ring-inset"
		class:bg-bg-tertiary={selectedPath === node.path}
		style:padding-left="{depth * 16 + 8}px"
		onclick={handleClick}
	>
		{#if node.isDirectory}
			<span
				class="shrink-0 flex items-center justify-center w-4 h-4 text-text-muted transition-transform duration-150"
				class:rotate-90={isExpanded}
			>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
					<path
						d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z"
					/>
				</svg>
			</span>
			<span class="shrink-0 flex items-center justify-center w-4 h-4 text-link">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
					<path
						d="M1.75 2.5a.25.25 0 00-.25.25v10.5c0 .138.112.25.25.25h12.5a.25.25 0 00.25-.25v-8.5a.25.25 0 00-.25-.25H7.5c-.55 0-1.07-.26-1.4-.7l-.9-1.2a.25.25 0 00-.2-.1H1.75z"
					/>
				</svg>
			</span>
		{:else}
			<span class="w-4"></span>
			<span class="shrink-0 flex items-center justify-center w-4 h-4 text-text-muted">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
					<path
						d="M3.75 1.5a.25.25 0 00-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 00.25-.25V6h-2.75A1.75 1.75 0 019 4.25V1.5H3.75zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011z"
					/>
				</svg>
			</span>
		{/if}
		<span
			class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
			class:text-diff-add-text={node.status === 'added'}
			class:text-diff-delete-text={node.status === 'deleted'}
			class:text-text-primary={node.status === 'modified'}
		>
			{node.name}
		</span>
		{#if node.file?.isBinary}
			<span class="text-[10px] px-1.5 py-px rounded-xl bg-bg-tertiary text-text-muted">binary</span>
		{/if}
		{#if node.file?.isMinified}
			<span class="text-[10px] px-1.5 py-px rounded-xl bg-bg-tertiary text-text-muted">minified</span>
		{/if}
	</button>

	{#if node.isDirectory && node.children && isExpanded}
		<ul class="list-none">
			{#each node.children as child (child.path)}
				<TreeNodeComponent node={child} {onFileSelect} {selectedPath} depth={depth + 1} />
			{/each}
		</ul>
	{/if}
</li>
