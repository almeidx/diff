import { npm } from "./npm.js";
import type { PackageInfo, Registry } from "./types.js";
import { compareVersions } from "./versions.js";
import { wordpress } from "./wordpress.js";

export type { PackageInfo, PackageSuggestion, PackageVersion, Registry } from "./types.js";

/** Display order on the home page. The first entry is the default. */
export const registries: readonly Registry[] = [npm, wordpress];

export function getRegistry(id: string): Registry | undefined {
	return registries.find((registry) => registry.id === id);
}

const packages = new Map<string, Promise<PackageInfo>>();

/**
 * Memoized so the metadata loaded while picking versions is reused by the
 * compare. The request belongs to no single caller, so it takes no signal;
 * failures are evicted so a retry refetches.
 */
export function getPackage(registry: Registry, name: string): Promise<PackageInfo> {
	const key = `${registry.id}/${name}`;
	let pending = packages.get(key);
	if (!pending) {
		pending = registry.fetchPackage(name).then((info) => ({
			...info,
			versions: info.versions.toSorted((a, b) => compareVersions(b.version, a.version)),
		}));
		packages.set(key, pending);
		pending.catch(() => packages.delete(key));
	}
	return pending;
}
