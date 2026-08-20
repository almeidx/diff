import { formatHunkHeader, type DiffFile } from "$lib/types/index.js";

const DEV_NULL = "/dev/null";

function quotePath(path: string): string {
	return path.replace(/\n/g, "");
}

export function toGitPatch(file: DiffFile): string {
	const path = quotePath(file.path);
	const oldPath = file.status === "added" ? DEV_NULL : `a/${path}`;
	const newPath = file.status === "deleted" ? DEV_NULL : `b/${path}`;

	const lines = [`diff --git a/${path} b/${path}`];

	if (file.status === "added") {
		lines.push("new file mode 100644");
	} else if (file.status === "deleted") {
		lines.push("deleted file mode 100644");
	}

	lines.push(`--- ${oldPath}`, `+++ ${newPath}`);

	for (const hunk of file.hunks) {
		lines.push(formatHunkHeader(hunk));
		for (const line of hunk.lines) {
			const prefix = line.type === "add" ? "+" : line.type === "delete" ? "-" : " ";
			lines.push(`${prefix}${line.content}`);
		}
	}

	return `${lines.join("\n")}\n`;
}
