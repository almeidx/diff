import type { Registry, NpmPackageMetadata } from './types.js';

const NPM_REGISTRY = 'https://registry.npmjs.org';

export class NpmRegistry implements Registry {
	private metadataCache = new Map<string, NpmPackageMetadata>();

	private async getMetadata(packageName: string): Promise<NpmPackageMetadata> {
		const cached = this.metadataCache.get(packageName);
		if (cached) return cached;

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

		const metadata = (await response.json()) as NpmPackageMetadata;
		this.metadataCache.set(packageName, metadata);
		return metadata;
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
