import type { PackageType } from "$lib/types/index.js";

/**
 * Identifies the cached `DiffResult` payload.
 *
 * Bump this whenever a deploy would produce a different payload for the same
 * package and versions — a changed `DiffFile`/`DiffResult` shape, but equally a
 * change in how file paths are derived. Cached diffs live for 24 hours, so
 * without a bump a deploy keeps serving stale payloads, and the failure tends to
 * be quiet rather than loud.
 */
const DIFF_SCHEMA_VERSION = "v4";

export function buildDiffCacheKey(
	packageType: PackageType,
	packageName: string,
	fromVersion: string,
	toVersion: string,
): string {
	return `diff:${DIFF_SCHEMA_VERSION}:${packageType}:${packageName}:${fromVersion}:${toVersion}`;
}
