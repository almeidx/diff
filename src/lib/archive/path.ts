/**
 * Normalizes an archive entry name to a relative POSIX path. Entries are
 * never written to disk, but `..`, absolute and backslash paths are resolved
 * so a crafted archive cannot fake a path outside the package root.
 */
export function normalizeArchivePath(rawPath: string): string {
	const segments: string[] = [];
	for (const segment of rawPath.replaceAll("\\", "/").split("/")) {
		if (!segment || segment === ".") continue;
		if (segment === "..") segments.pop();
		else segments.push(segment);
	}
	return segments.join("/");
}

/**
 * Removes the single wrapper directory packages ship with: npm tarballs use
 * `package/` (DefinitelyTyped uses the type name), WordPress zips use the
 * plugin slug. Archives without one shared root are returned unchanged.
 */
export function stripCommonRoot<T>(entries: Map<string, T>): Map<string, T> {
	let root: string | undefined;
	for (const path of entries.keys()) {
		const slash = path.indexOf("/");
		if (slash <= 0) return entries;
		const candidate = path.slice(0, slash + 1);
		if (root === undefined) root = candidate;
		else if (root !== candidate) return entries;
	}
	if (root === undefined) return entries;

	const stripped = new Map<string, T>();
	for (const [path, entry] of entries) stripped.set(path.slice(root.length), entry);
	return stripped;
}
