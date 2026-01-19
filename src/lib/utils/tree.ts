import type { DiffFile, TreeNode, DiffStatus } from '$lib/types/index.js';

export function buildFileTree(files: DiffFile[]): TreeNode[] {
	const root: TreeNode = {
		name: '',
		path: '',
		isDirectory: true,
		children: []
	};

	for (const file of files) {
		const parts = file.path.split('/');
		let current = root;

		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			const isLast = i === parts.length - 1;
			const currentPath = parts.slice(0, i + 1).join('/');

			if (!current.children) {
				current.children = [];
			}

			let child = current.children.find((c) => c.name === part);

			if (!child) {
				child = {
					name: part,
					path: currentPath,
					isDirectory: !isLast,
					children: isLast ? undefined : [],
					file: isLast ? file : undefined,
					status: isLast ? file.status : undefined
				};
				current.children.push(child);
			}

			if (!isLast) {
				current = child;
			}
		}
	}

	return sortTreeNodes(root.children || []);
}

function sortTreeNodes(nodes: TreeNode[]): TreeNode[] {
	return nodes
		.map((node) => ({
			...node,
			children: node.children ? sortTreeNodes(node.children) : undefined
		}))
		.sort((a, b) => {
			if (a.isDirectory && !b.isDirectory) return -1;
			if (!a.isDirectory && b.isDirectory) return 1;
			return a.name.localeCompare(b.name);
		});
}

export function getStatusClass(status: DiffStatus | undefined): string {
	switch (status) {
		case 'added':
			return 'text-green-500';
		case 'deleted':
			return 'text-red-500';
		case 'modified':
			return 'text-yellow-500';
		default:
			return '';
	}
}

export function getStatusIcon(status: DiffStatus | undefined): string {
	switch (status) {
		case 'added':
			return '+';
		case 'deleted':
			return '-';
		case 'modified':
			return '~';
		default:
			return '';
	}
}

export function propagateStatus(nodes: TreeNode[]): TreeNode[] {
	return propagateStatusWithFolders(nodes).nodes;
}

interface PropagateResult {
	nodes: TreeNode[];
	folderPaths: string[];
}

export function propagateStatusWithFolders(nodes: TreeNode[]): PropagateResult {
	const folderPaths: string[] = [];

	const updatedNodes = nodes.map((node) => {
		if (node.isDirectory) {
			folderPaths.push(node.path);

			if (node.children) {
				const childResult = propagateStatusWithFolders(node.children);
				folderPaths.push(...childResult.folderPaths);

				const statuses = new Set<DiffStatus>();
				for (const child of childResult.nodes) {
					if (child.status) {
						statuses.add(child.status);
					}
				}

				let status: DiffStatus | undefined;
				if (statuses.size === 1) {
					status = Array.from(statuses)[0];
				} else if (statuses.size > 1) {
					status = 'modified';
				}

				return { ...node, children: childResult.nodes, status };
			}
		}
		return node;
	});

	return { nodes: updatedNodes, folderPaths };
}

export function sortFilesLikeTree(files: DiffFile[]): DiffFile[] {
	const tree = buildFileTree(files);
	const orderedPaths = flattenTreePaths(tree);
	const fileMap = new Map(files.map((f) => [f.path, f]));
	return orderedPaths.map((path) => fileMap.get(path)!).filter(Boolean);
}

function flattenTreePaths(nodes: TreeNode[]): string[] {
	const paths: string[] = [];
	for (const node of nodes) {
		if (node.isDirectory && node.children) {
			paths.push(...flattenTreePaths(node.children));
		} else {
			paths.push(node.path);
		}
	}
	return paths;
}

export function getAllFolderPaths(nodes: TreeNode[]): string[] {
	const paths: string[] = [];

	function traverse(nodeList: TreeNode[]) {
		for (const node of nodeList) {
			if (node.isDirectory) {
				paths.push(node.path);
				if (node.children) {
					traverse(node.children);
				}
			}
		}
	}

	traverse(nodes);
	return paths;
}

export function getSingleChildFolderPaths(nodes: TreeNode[]): string[] {
	const paths: string[] = [];

	function traverse(nodeList: TreeNode[]) {
		if (nodeList.length === 1 && nodeList[0].isDirectory) {
			const node = nodeList[0];
			paths.push(node.path);
			if (node.children) {
				traverse(node.children);
			}
		} else {
			for (const node of nodeList) {
				if (node.isDirectory && node.children) {
					const folderChildren = node.children.filter((c) => c.isDirectory);
					if (folderChildren.length === 1 && node.children.length === 1) {
						paths.push(folderChildren[0].path);
						traverse(folderChildren[0].children || []);
					}
				}
			}
		}
	}

	traverse(nodes);
	return paths;
}
