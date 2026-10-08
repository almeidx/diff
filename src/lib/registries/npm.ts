import { fetchWithTimeout, assertSafeUpstreamUrl } from "#lib/http.js";
import { compareVersions } from "#lib/utils/versions.js";
import type { Registry, NpmPackageMetadata } from "./types.js";

const NPM_REGISTRY = "https://registry.npmjs.org";
const NPM_ALLOWED_HOSTS = ["registry.npmjs.org", "registry.npmjs.com"];

export class NpmRegistry implements Registry {
	private metadataMemo = new Map<string, Promise<NpmPackageMetadata>>();
	private repoMemo = new Map<string, Promise<{ url: string; type?: string } | string | null>>();

	/**
	 * Memoize the fetch promise per key in-session. On rejection the entry is
	 * deleted so a retry refetches (failures are not sticky).
	 */
	private memo<T>(memo: Map<string, Promise<T>>, key: string, load: () => Promise<T>): Promise<T> {
		const existing = memo.get(key);
		if (existing) return existing;

		const promise = load().catch((error: unknown) => {
			memo.delete(key);
			throw error;
		});
		memo.set(key, promise);
		return promise;
	}

	private getMetadata(packageName: string): Promise<NpmPackageMetadata> {
		return this.memo(this.metadataMemo, packageName, async () => {
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
		});
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
		const repoInfo = await this.memo(this.repoMemo, packageName, async () => {
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
		});

		const repo = repoInfo;
		if (!repo) return null;

		const raw = typeof repo === "string" ? repo : repo.url;

		const match = raw.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
		if (!match) return null;

		return `https://github.com/${match[1]}/${match[2]}`;
	}
}

export const npmRegistry = new NpmRegistry();
