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

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleClick();
		}
	}

	function getStatusClass(status: string | undefined): string {
		switch (status) {
			case 'added':
				return 'status-added';
			case 'deleted':
				return 'status-deleted';
			case 'modified':
				return 'status-modified';
			default:
				return '';
		}
	}
</script>

<li class="tree-node">
	<div
		class="node-content"
		class:selected={selectedPath === node.path}
		class:directory={node.isDirectory}
		style:padding-left="{depth * 16 + 8}px"
		onclick={handleClick}
		onkeydown={handleKeydown}
		role="button"
		tabindex="0"
	>
		{#if node.isDirectory}
			<span class="icon chevron" class:expanded={isExpanded}>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
					<path
						d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z"
					/>
				</svg>
			</span>
			<span class="icon folder">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
					<path
						d="M1.75 2.5a.25.25 0 00-.25.25v10.5c0 .138.112.25.25.25h12.5a.25.25 0 00.25-.25v-8.5a.25.25 0 00-.25-.25H7.5c-.55 0-1.07-.26-1.4-.7l-.9-1.2a.25.25 0 00-.2-.1H1.75z"
					/>
				</svg>
			</span>
		{:else}
			<span class="icon spacer"></span>
			<span class="icon file">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
					<path
						d="M3.75 1.5a.25.25 0 00-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 00.25-.25V6h-2.75A1.75 1.75 0 019 4.25V1.5H3.75zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011z"
					/>
				</svg>
			</span>
		{/if}
		<span class="name {getStatusClass(node.status)}">{node.name}</span>
		{#if node.file?.isBinary}
			<span class="badge binary">binary</span>
		{/if}
		{#if node.file?.isMinified}
			<span class="badge minified">minified</span>
		{/if}
	</div>

	{#if node.isDirectory && node.children && isExpanded}
		<ul class="children">
			{#each node.children as child (child.path)}
				<TreeNodeComponent node={child} {onFileSelect} {selectedPath} depth={depth + 1} />
			{/each}
		</ul>
	{/if}
</li>

<style>
	.tree-node {
		list-style: none;
	}

	.node-content {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 4px 8px;
		border-radius: 6px;
		cursor: pointer;
		user-select: none;
	}

	.node-content:hover {
		background: var(--bg-tertiary);
	}

	.node-content.selected {
		background: var(--bg-tertiary);
	}

	.icon {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		color: var(--text-muted);
	}

	.icon.spacer {
		width: 16px;
	}

	.chevron {
		transition: transform 0.15s ease;
	}

	.chevron.expanded {
		transform: rotate(90deg);
	}

	.folder {
		color: var(--link-color);
	}

	.name {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.status-added {
		color: var(--diff-add-text);
	}

	.status-deleted {
		color: var(--diff-delete-text);
	}

	.status-modified {
		color: var(--text-primary);
	}

	.badge {
		font-size: 10px;
		padding: 1px 6px;
		border-radius: 10px;
		background: var(--bg-tertiary);
		color: var(--text-muted);
	}

	.children {
		list-style: none;
	}
</style>
