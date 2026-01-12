import type { Registry, WordPressPluginInfo } from './types.js';
import { getCached } from '../cache.js';

const WP_API = 'https://api.wordpress.org/plugins/info/1.2/';
const WP_DOWNLOADS = 'https://downloads.wordpress.org/plugin';
const METADATA_TTL = 300; // 5 minutes

export class WordPressRegistry implements Registry {
	private async getMetadata(slug: string): Promise<WordPressPluginInfo> {
		return getCached(
			`wp:metadata:${slug}`,
			async () => {
				const url = new URL(WP_API);
				url.searchParams.set('action', 'plugin_information');
				url.searchParams.set('request[slug]', slug);

				const response = await fetch(url.toString(), {
					headers: { Accept: 'application/json' }
				});

				if (!response.ok) {
					throw new Error(`Failed to fetch WordPress plugin: ${response.statusText}`);
				}

				const data = await response.json();

				if (data === false || data.error) {
					throw new Error(`Plugin "${slug}" not found on WordPress.org`);
				}

				return data as WordPressPluginInfo;
			},
			{ ttlSeconds: METADATA_TTL }
		);
	}

	async getVersions(slug: string): Promise<string[]> {
		const metadata = await this.getMetadata(slug);

		if (!metadata.versions || Object.keys(metadata.versions).length === 0) {
			return [metadata.version];
		}

		return Object.keys(metadata.versions)
			.filter((v) => v !== 'trunk')
			.sort(this.compareVersions)
			.reverse();
	}

	async getDownloadUrl(slug: string, version: string): Promise<string> {
		const metadata = await this.getMetadata(slug);

		if (metadata.versions && metadata.versions[version]) {
			return metadata.versions[version];
		}

		if (version === metadata.version) {
			return `${WP_DOWNLOADS}/${slug}.${version}.zip`;
		}

		throw new Error(`Version "${version}" not found for plugin "${slug}"`);
	}

	async validateVersion(slug: string, version: string): Promise<boolean> {
		const metadata = await this.getMetadata(slug);

		if (metadata.versions && version in metadata.versions) {
			return true;
		}

		return version === metadata.version;
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

export const wordpressRegistry = new WordPressRegistry();
