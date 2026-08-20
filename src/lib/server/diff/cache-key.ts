import type { PackageType } from "$lib/types/index.js";

/**
 * Identifies the shape of the cached `DiffResult` payload.
 *
 * Bump this whenever `DiffFile` or `DiffResult` changes shape. Cached diffs
 * live for 24 hours, so without a bump a deploy keeps serving payloads the new
 * client can no longer read, and the failure is silent: files list normally and
 * their contents render blank.
 */
const DIFF_SCHEMA_VERSION = "v3";

export function buildDiffCacheKey(
	packageType: PackageType,
	packageName: string,
	fromVersion: string,
	toVersion: string,
): string {
	return `diff:${DIFF_SCHEMA_VERSION}:${packageType}:${packageName}:${fromVersion}:${toVersion}`;
}
