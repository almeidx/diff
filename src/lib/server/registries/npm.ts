import type { Registry, NpmPackageMetadata } from './types.js';
import { getCached } from '../cache.js';

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
		return Object.keys(metadata.versions).sort(this.compareVersions).reverse();
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

	private compareVersions(a: string, b: string): number {
		const partsA = a.split('.').map((p) => parseInt(p, 10) || 0);
		const partsB = b.split('.').map((p) => parseInt(p, 10) || 0);

		for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
			const numA = partsA[i] || 0;
			const numB = partsB[i] || 0;
			if (numA !== numB) return numA - numB;
		}
		return 0;
	}
}

export const npmRegistry = new NpmRegistry();
