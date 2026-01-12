import type { DiffFile, TreeNode, DiffStatus } from '$lib/types/index.js';

export function buildFileTree(files: DiffFile[]): TreeNode[] {
	const root: Map<string, TreeNode> = new Map();

	for (const file of files) {
		const parts = file.path.split('/');
		let currentLevel = root;
		let currentPath = '';

		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			currentPath = currentPath ? `${currentPath}/${part}` : part;
			const isLast = i === parts.length - 1;

			if (!currentLevel.has(part)) {
				const node: TreeNode = {
					name: part,
					path: currentPath,
					isDirectory: !isLast,
					children: isLast ? undefined : [],
					file: isLast ? file : undefined,
					status: isLast ? file.status : undefined
				};
				currentLevel.set(part, node);
			}

			const node = currentLevel.get(part)!;

			if (!isLast) {
				if (!node.children) {
					node.children = [];
				}

				const childMap = new Map<string, TreeNode>();
				for (const child of node.children) {
					childMap.set(child.name, child);
				}
				currentLevel = childMap;

				node.children = Array.from(childMap.values());
			}
		}
	}

	return sortTreeNodes(Array.from(root.values()));
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
	return nodes.map((node) => {
		if (node.isDirectory && node.children) {
			const updatedChildren = propagateStatus(node.children);
			const statuses = new Set<DiffStatus>();

			for (const child of updatedChildren) {
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

			return { ...node, children: updatedChildren, status };
		}
		return node;
	});
}
