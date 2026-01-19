import type { Registry, NpmPackageMetadata } from './types.js';
import { getCached } from '../cache.js';
import { compareVersions } from '$lib/utils/versions.js';

const NPM_REGISTRY = 'https://registry.npmjs.org';
const METADATA_TTL = 300; // 5 minutes

export class NpmRegistry implements Registry {
	private async getMetadata(packageName: string): Promise<NpmPackageMetadata> {
		return getCached(
			`npm:metadata:${packageName}`,
			async () => {
				const encodedName = packageName.startsWith('@')
					? `@${encodeURIComponent(packageName.slice(1))}`
					: encodeURIComponent(packageName);

				const response = await fetch(`${NPM_REGISTRY}/${encodedName}`, {
					headers: { Accept: 'application/json' }
				});

				if (!response.ok) {
					if (response.status === 404) {
						throw new Error(`Package "${packageName}" not found on npm`);
					}
					throw new Error(`Failed to fetch npm package: ${response.statusText}`);
				}

				return (await response.json()) as NpmPackageMetadata;
			},
			{ ttlSeconds: METADATA_TTL }
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

		return versionData.dist.tarball;
	}

	async validateVersion(packageName: string, version: string): Promise<boolean> {
		const metadata = await this.getMetadata(packageName);
		return version in metadata.versions;
	}

}

export const npmRegistry = new NpmRegistry();
