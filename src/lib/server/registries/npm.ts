import type { Registry, NpmPackageMetadata } from "./types.js";
import { getCached } from "../cache.js";
import { compareVersions } from "$lib/utils/versions.js";
import { fetchWithTimeout, assertSafeUpstreamUrl } from "$lib/server/http.js";

const NPM_REGISTRY = "https://registry.npmjs.org";
const METADATA_TTL = 300; // 5 minutes
const NPM_ALLOWED_HOSTS = ["registry.npmjs.org", "registry.npmjs.com"];

export class NpmRegistry implements Registry {
	private async getMetadata(packageName: string): Promise<NpmPackageMetadata> {
		return getCached(
			`npm:metadata:${packageName}`,
			async () => {
				const encodedName = packageName.startsWith("@")
					? `@${encodeURIComponent(packageName.slice(1))}`
					: encodeURIComponent(packageName);

				const response = await fetchWithTimeout(`${NPM_REGISTRY}/${encodedName}`, {
					headers: { Accept: "application/vnd.npm.install.v1+json" },
					allowedHosts: NPM_ALLOWED_HOSTS,
				});

				if (!response.ok) {
					if (response.status === 404) {
						throw new Error(`Package "${packageName}" not found on npm`);
					}
					throw new Error(`Failed to fetch npm package: ${response.statusText}`);
				}

				return (await response.json()) as NpmPackageMetadata;
			},
			{ ttlSeconds: METADATA_TTL },
		);
	}

	async getVersions(packageName: string): Promise<string[]> {
		const metadata = await this.getMetadata(packageName);
		return Object.keys(metadata.versions).sort(compareVersions).reverse();
	}

	async getDownloadUrl(packageName: string, version: string): Promise<string> {
		const metadata = await this.getMetadata(packageName);
		const versionData = metadata.versions[version];

		if (!versionData) {
			throw new Error(`Version "${version}" not found for package "${packageName}"`);
		}

		const tarballCandidate = new URL(versionData.dist.tarball);
		if (
			tarballCandidate.protocol === "http:" &&
			(tarballCandidate.hostname === "registry.npmjs.org" || tarballCandidate.hostname === "registry.npmjs.com")
		) {
			tarballCandidate.protocol = "https:";
		}

		const tarballUrl = assertSafeUpstreamUrl(tarballCandidate, {
			allowedHosts: NPM_ALLOWED_HOSTS,
		});
		return tarballUrl.toString();
	}

	async getRepositoryUrl(packageName: string): Promise<string | null> {
		const repoInfo = await getCached(
			`npm:repo:${packageName}`,
			async () => {
				const encodedName = packageName.startsWith("@")
					? `@${encodeURIComponent(packageName.slice(1))}`
					: encodeURIComponent(packageName);

				const response = await fetchWithTimeout(`${NPM_REGISTRY}/${encodedName}`, {
					headers: { Accept: "application/json" },
					allowedHosts: NPM_ALLOWED_HOSTS,
				});

				if (!response.ok) return null;

				const data = (await response.json()) as NpmPackageMetadata;
				return data.repository ?? null;
			},
			{ ttlSeconds: METADATA_TTL },
		);

		const repo = repoInfo;
		if (!repo) return null;

		const raw = typeof repo === "string" ? repo : repo.url;

		const match = raw.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
		if (!match) return null;

		return `https://github.com/${match[1]}/${match[2]}`;
	}
}

export const npmRegistry = new NpmRegistry();
