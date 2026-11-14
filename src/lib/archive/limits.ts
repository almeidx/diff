/**
 * Extraction guardrails. `null` removes a cap, which the user must opt into
 * explicitly because oversized extractions can exhaust tab memory or crash the page.
 */
export interface ArchiveLimits {
	/** Maximum compressed archive bytes. */
	archiveSize: number | null;
	/** Maximum decompressed bytes for the whole archive. */
	decompressedSize: number | null;
	/** Maximum number of text files kept for diffing. */
	fileCount: number | null;
	/** Maximum size of a single text file; larger files are listed but not diffed. */
	fileSize: number | null;
}

export const DEFAULT_LIMITS: ArchiveLimits = {
	archiveSize: 100 * 1024 * 1024,
	decompressedSize: 256 * 1024 * 1024,
	fileCount: 10_000,
	fileSize: 2 * 1024 * 1024,
};

export const NO_LIMITS: ArchiveLimits = {
	archiveSize: null,
	decompressedSize: null,
	fileCount: null,
	fileSize: null,
};
