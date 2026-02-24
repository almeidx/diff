<script lang="ts">
	import type { DiffFile, TreeNode } from '$lib/types/index.js';
	import { buildFileTree, propagateStatusWithFolders, getSingleChildFolderPaths } from '$lib/utils/tree';
	import { setExpandedPaths, expandAllPaths, collapseAllPaths } from '$lib/stores/ui';
	import TreeNodeComponent from './TreeNode.svelte';

	interface Props {
		files: DiffFile[];
		onFileSelect?: (file: DiffFile) => void;
		selectedPath?: string;
	}

	interface FilteredTreeResult {
		nodes: TreeNode[];
		forcedExpandedPaths: Set<string>;
		filePaths: string[];
		matchCount: number;
	}

	let { files, onFileSelect, selectedPath }: Props = $props();
	let search = $state('');
	let navElement = $state<HTMLElement | null>(null);

	let treeData = $derived(propagateStatusWithFolders(buildFileTree(files)));
	let tree = $derived(treeData.nodes);
	let allFolderPaths = $derived(treeData.folderPaths);
	let hasAnyFolders = $derived(allFolderPaths.length > 0);
	let normalizedSearch = $derived(search.trim().toLowerCase());
	let fileMap = $derived(new Map(files.map((file) => [file.path, file])));

	let filteredTree = $derived.by<FilteredTreeResult>(() => {
		if (!normalizedSearch) {
			return {
				nodes: tree,
				forcedExpandedPaths: new Set<string>(),
				filePaths: flattenFilePaths(tree),
				matchCount: files.length
			};
		}

		return filterTreeNodes(tree, normalizedSearch);
	});

	let displayTree = $derived(filteredTree.nodes);
	let visibleFilePaths = $derived(filteredTree.filePaths);
	let searchMatchCount = $derived(filteredTree.matchCount);
	let forcedExpandedPaths = $derived(
		normalizedSearch ? filteredTree.forcedExpandedPaths : null
	);

	function handleExpandAll() {
		expandAllPaths(allFolderPaths);
	}

	function handleCollapseAll() {
		collapseAllPaths();
	}

	function clearSearch() {
		search = '';
	}

	function selectFileByPath(path: string, focus = false) {
		const file = fileMap.get(path);
		if (!file || !onFileSelect) return;

		onFileSelect(file);
		if (focus) {
			queueMicrotask(() => focusFileNode(path));
		}
	}

	function focusFileNode(path: string) {
		if (!navElement || typeof CSS === 'undefined') return;

		const selector = `button[data-tree-file-path="${CSS.escape(path)}"]`;
		const button = navElement.querySelector<HTMLButtonElement>(selector);
		button?.focus();
	}

	function handleSearchKeydown(event: KeyboardEvent) {
		if (!visibleFilePaths.length) return;

		if (event.key === 'Enter' || event.key === 'ArrowDown') {
			event.preventDefault();
			selectFileByPath(visibleFilePaths[0], true);
		}
	}

	function handleTreeKeydown(event: KeyboardEvent) {
		if (
			!['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter'].includes(event.key) ||
			event.target instanceof HTMLInputElement
		) {
			return;
		}

		if (visibleFilePaths.length === 0) return;
		event.preventDefault();

		const selectedIndex = selectedPath ? visibleFilePaths.indexOf(selectedPath) : -1;
		let nextIndex = selectedIndex >= 0 ? selectedIndex : 0;

		switch (event.key) {
			case 'ArrowDown':
				nextIndex = Math.min(visibleFilePaths.length - 1, nextIndex + 1);
				break;
			case 'ArrowUp':
				nextIndex = Math.max(0, nextIndex - 1);
				break;
			case 'Home':
				nextIndex = 0;
				break;
			case 'End':
				nextIndex = visibleFilePaths.length - 1;
				break;
			case 'Enter':
				if (selectedPath && visibleFilePaths.includes(selectedPath)) {
					selectFileByPath(selectedPath, true);
				}
				return;
		}

		selectFileByPath(visibleFilePaths[nextIndex], true);
	}

	$effect(() => {
		if (files.length === 0) {
			setExpandedPaths([]);
			return;
		}

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
			pathsToExpand.push(p);
		}

		setExpandedPaths(pathsToExpand);
	});

	function flattenFilePaths(nodes: TreeNode[]): string[] {
		const paths: string[] = [];

		for (const node of nodes) {
			if (node.isDirectory) {
				if (node.children) {
					paths.push(...flattenFilePaths(node.children));
				}
				continue;
			}
			paths.push(node.path);
		}

		return paths;
	}

	function filterTreeNodes(nodes: TreeNode[], query: string): FilteredTreeResult {
		const forcedExpandedPaths = new Set<string>();
		const filePaths: string[] = [];
		let matchCount = 0;

		function filterNodeList(nodeList: TreeNode[]): TreeNode[] {
			const result: TreeNode[] = [];

			for (const node of nodeList) {
				const pathMatch = node.path.toLowerCase().includes(query);

				if (node.isDirectory) {
					const filteredChildren = node.children ? filterNodeList(node.children) : [];

					if (pathMatch || filteredChildren.length > 0) {
						forcedExpandedPaths.add(node.path);
						result.push({ ...node, children: filteredChildren });
					}

					continue;
				}

				if (pathMatch) {
					matchCount++;
					filePaths.push(node.path);
					result.push(node);
				}
			}

			return result;
		}

		return {
			nodes: filterNodeList(nodes),
			forcedExpandedPaths,
			filePaths,
			matchCount
		};
	}
</script>

<nav class="overflow-y-auto overflow-x-hidden text-[13px]" aria-label="Changed files">
	<div class="p-2 border-b border-border bg-bg-secondary space-y-2">
		{#if hasAnyFolders && !normalizedSearch}
			<div class="flex gap-1">
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
		<div class="flex items-center gap-1.5">
			<input
				type="search"
				bind:value={search}
				onkeydown={handleSearchKeydown}
				placeholder="Filter files..."
				class="flex-1 min-w-0 px-2.5 py-1.5 text-xs border border-border rounded bg-bg-primary text-text-primary placeholder:text-text-muted focus:outline-none focus:border-link"
				aria-label="Filter changed files"
			/>
			{#if normalizedSearch}
				<button
					type="button"
					onclick={clearSearch}
					class="px-2 py-1 text-[11px] border border-border rounded bg-bg-tertiary text-text-secondary hover:bg-bg-primary"
				>
					Clear
				</button>
			{/if}
		</div>
		{#if normalizedSearch}
			<p class="text-[11px] text-text-muted px-0.5">
				{searchMatchCount} matching file{searchMatchCount === 1 ? '' : 's'}
			</p>
		{/if}
	</div>
	<ul
		class="list-none p-2"
		role="tree"
		aria-label="Changed files tree"
		tabindex="0"
		onkeydown={handleTreeKeydown}
		bind:this={navElement}
	>
		{#if displayTree.length === 0}
			<li class="px-2 py-2 text-xs text-text-muted">No files match your search.</li>
		{:else}
			{#each displayTree as node (node.path)}
				<TreeNodeComponent
					{node}
					{onFileSelect}
					{selectedPath}
					{forcedExpandedPaths}
				/>
			{/each}
		{/if}
	</ul>
</nav>
