import type { DiffFile, TreeNode } from "$lib/types/index.js";

export function buildFileTree(files: DiffFile[]): TreeNode[] {
	const root: TreeNode = {
		name: "",
		path: "",
		isDirectory: true,
		children: [],
	};

	const nodeByPath = new Map<string, TreeNode>();

	for (const file of files) {
		const parts = file.path.split("/");
		let current = root;

		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			const isLast = i === parts.length - 1;
			const currentPath = parts.slice(0, i + 1).join("/");

			if (!current.children) {
				current.children = [];
			}

			let child = nodeByPath.get(currentPath);

			if (!child) {
				child = {
					name: part,
					path: currentPath,
					isDirectory: !isLast,
					children: isLast ? undefined : [],
					file: isLast ? file : undefined,
					status: isLast ? file.status : undefined,
				};
				current.children.push(child);
				nodeByPath.set(currentPath, child);
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
			children: node.children ? sortTreeNodes(node.children) : undefined,
		}))
		.sort((a, b) => {
			if (a.isDirectory && !b.isDirectory) return -1;
			if (!a.isDirectory && b.isDirectory) return 1;
			return a.name.localeCompare(b.name);
		});
}

export function sortFilesLikeTree(files: DiffFile[]): DiffFile[] {
	const tree = buildFileTree(files);
	const orderedPaths = flattenTreePaths(tree);
	const fileMap = new Map(files.map((f) => [f.path, f]));
	return orderedPaths.flatMap((path) => {
		const f = fileMap.get(path);
		return f ? [f] : [];
	});
}

export function flattenTreePaths(nodes: TreeNode[]): string[] {
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
