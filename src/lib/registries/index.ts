import { npm } from "./npm.js";
import type { Registry } from "./types.js";
import { wordpress } from "./wordpress.js";

export type { PackageInfo, PackageSuggestion, PackageVersion, Registry } from "./types.js";

/** Display order on the home page. The first entry is the default. */
export const registries: readonly Registry[] = [npm, wordpress];

export function getRegistry(id: string): Registry | undefined {
	return registries.find((registry) => registry.id === id);
}
