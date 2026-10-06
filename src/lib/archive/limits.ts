/**
 * Extraction guardrails enforced by `fetchAndExtract`. Every field is nullable:
 * `null` removes that cap, which the user must opt into explicitly because
 * oversized extractions can exhaust tab memory or crash the page.
 */
export interface ArchiveLimits {
	/** Maximum compressed archive bytes. */
	archiveSize: number | null;
	/** Maximum decompressed bytes, tracked for the whole archive and for included text. */
	decompressedSize: number | null;
	/** Maximum number of text files kept for diffing. */
	fileCount: number | null;
	/** Maximum size of a single text file; larger files are skipped. */
	fileSize: number | null;
}

/**
 * Defaults sized for browser memory instead of the old Worker budget
 * (which was 50MB archives, 128MB decompressed, 5,000 files, 1MB per file).
 */
export const DEFAULT_LIMITS: ArchiveLimits = {
	archiveSize: 100 * 1024 * 1024,
	decompressedSize: 256 * 1024 * 1024,
	fileCount: 10_000,
	fileSize: 2 * 1024 * 1024,
};

/** Bypasses every guardrail; only reachable via the user's explicit opt-in. */
export const NO_LIMITS: ArchiveLimits = {
	archiveSize: null,
	decompressedSize: null,
	fileCount: null,
	fileSize: null,
};

export const LIMITS_PARAM = "limits";
export const LIMITS_OFF_VALUE = "off";

/** Parses the `?limits=off` bypass flag; any other value means the defaults. */
export function limitsFromSearchParams(searchParams: URLSearchParams): ArchiveLimits {
	return searchParams.get(LIMITS_PARAM) === LIMITS_OFF_VALUE ? NO_LIMITS : DEFAULT_LIMITS;
}
