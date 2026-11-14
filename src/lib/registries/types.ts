import type { ArchiveFormat } from "#lib/archive/extract.js";

export interface PackageSuggestion {
	name: string;
	description?: string;
	version?: string;
}

export interface PackageVersion {
	version: string;
	/** ISO timestamp, when the registry exposes one. */
	publishedAt?: string;
	deprecated?: boolean;
	/** Registry tags pointing at this version, e.g. `latest`, `next`. */
	tags: string[];
	downloadUrl: string;
}

export interface PackageInfo {
	name: string;
	/** Newest first, as returned by `getPackage`. */
	versions: PackageVersion[];
	latest?: string;
}

/**
 * Everything registry-specific lives behind this interface. Adding a registry
 * means adding one module and listing it in `./index.ts`; routes, the CSP, the
 * worker pipeline and the UI pick it up from there. Implementations run inside
 * the compare worker and must only use Web APIs.
 */
export interface Registry {
	/** First URL segment, e.g. `/npm/...`. */
	id: string;
	label: string;
	/** SVG path data for a 24×24 icon. */
	icon: string;
	nameLabel: string;
	namePlaceholder: string;
	archiveFormat: ArchiveFormat;
	/** Every host this registry fetches from, including download URLs. */
	hosts: readonly string[];
	isValidName(name: string): boolean;
	search(query: string, signal?: AbortSignal): Promise<PackageSuggestion[]>;
	/** Versions may come in any order. */
	fetchPackage(name: string): Promise<PackageInfo>;
}
