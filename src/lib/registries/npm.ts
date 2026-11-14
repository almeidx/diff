import { AppError } from "#lib/errors.js";
import { upstreamFetch } from "#lib/http.js";
import type { PackageSuggestion, PackageVersion, Registry } from "./types.js";

const REGISTRY = "https://registry.npmjs.org";
const HOSTS = ["registry.npmjs.org", "registry.npmjs.com"] as const;
const NAME_PATTERN = /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/i;

interface Packument {
	name: string;
	"dist-tags"?: Record<string, string>;
	time?: Record<string, string>;
	versions?: Record<string, { dist?: { tarball?: string }; deprecated?: string }>;
}

interface SearchResponse {
	objects: Array<{ package: { name: string; description?: string; version?: string } }>;
}

function encodeName(name: string): string {
	return name.startsWith("@") ? `@${encodeURIComponent(name.slice(1))}` : encodeURIComponent(name);
}

export const npm: Registry = {
	id: "npm",
	label: "npm",
	icon: "M0 7.334v8h6.666v1.332H12v-1.332h12v-8H0zm6.666 6.664H5.334v-4H3.999v4H1.335V8.667h5.331v5.331zm4 0v1.336H8.001V8.667h5.334v5.332h-2.669v-.001zm12.001 0h-1.33v-4h-1.336v4h-1.335v-4h-1.33v4h-2.671V8.667h8.002v5.331z",
	nameLabel: "Package",
	namePlaceholder: "minimatch, chalk…",
	archiveFormat: "tgz",
	hosts: HOSTS,

	isValidName: (name) => name.length <= 214 && NAME_PATTERN.test(name),

	async search(query, signal) {
		const url = new URL(`${REGISTRY}/-/v1/search`);
		url.searchParams.set("text", query);
		url.searchParams.set("size", "8");
		const response = await upstreamFetch(url, { hosts: HOSTS, signal });
		if (!response.ok) throw new AppError(`npm search responded with ${response.status}.`);
		const data = (await response.json()) as SearchResponse;
		return data.objects.map(({ package: pkg }): PackageSuggestion => ({
			name: pkg.name,
			description: pkg.description,
			version: pkg.version,
		}));
	},

	async fetchPackage(name) {
		// The full document (not the abbreviated install format) carries publish
		// times; gzipped they are nearly the same size.
		const response = await upstreamFetch(`${REGISTRY}/${encodeName(name)}`, {
			hosts: HOSTS,
			headers: { Accept: "application/json" },
		});
		if (response.status === 404) throw new AppError(`Package "${name}" was not found on npm.`, "not-found");
		if (!response.ok) throw new AppError(`npm responded with ${response.status} for "${name}".`);

		const doc = (await response.json()) as Packument;
		const tagsByVersion = new Map<string, string[]>();
		for (const [tag, version] of Object.entries(doc["dist-tags"] ?? {})) {
			tagsByVersion.set(version, [...(tagsByVersion.get(version) ?? []), tag]);
		}

		const versions: PackageVersion[] = [];
		for (const [version, manifest] of Object.entries(doc.versions ?? {})) {
			const downloadUrl = URL.parse(manifest.dist?.tarball ?? "");
			if (!downloadUrl) continue;
			// Old packuments still list plain-http tarball URLs for the same host.
			if (downloadUrl.protocol === "http:") downloadUrl.protocol = "https:";
			versions.push({
				version,
				publishedAt: doc.time?.[version],
				deprecated: Boolean(manifest.deprecated),
				tags: tagsByVersion.get(version) ?? [],
				downloadUrl: downloadUrl.href,
			});
		}
		return { name: doc.name ?? name, latest: doc["dist-tags"]?.latest, versions };
	},
};
