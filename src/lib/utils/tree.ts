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
