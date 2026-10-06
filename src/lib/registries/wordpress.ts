import type { Registry, WordPressPluginInfo } from "./types.js";
import { compareVersions } from "#lib/utils/versions.js";
import { fetchWithTimeout, assertSafeUpstreamUrl } from "#lib/http.js";

const WP_API = "https://api.wordpress.org/plugins/info/1.2/";
const WP_DOWNLOADS = "https://downloads.wordpress.org/plugin";
const WORDPRESS_ALLOWED_HOSTS = ["api.wordpress.org", "downloads.wordpress.org"];

export class WordPressRegistry implements Registry {
	private metadataMemo = new Map<string, Promise<WordPressPluginInfo>>();

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

	private getMetadata(slug: string): Promise<WordPressPluginInfo> {
		return this.memo(this.metadataMemo, slug, async () => {
			const url = new URL(WP_API);
			url.searchParams.set("action", "plugin_information");
			url.searchParams.set("request[slug]", slug);

			const response = await fetchWithTimeout(url.toString(), {
				headers: { Accept: "application/json" },
				allowedHosts: WORDPRESS_ALLOWED_HOSTS,
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch WordPress plugin: ${response.statusText}`);
			}

			const data = (await response.json()) as WordPressPluginInfo | false | { error: string };

			if (data === false || ("error" in data && data.error)) {
				throw new Error(`Plugin "${slug}" not found on WordPress.org`);
			}

			return data as WordPressPluginInfo;
		});
	}

	async getVersions(slug: string): Promise<string[]> {
		const metadata = await this.getMetadata(slug);

		if (!metadata.versions || Object.keys(metadata.versions).length === 0) {
			return [metadata.version];
		}

		return Object.keys(metadata.versions)
			.filter((v) => v !== "trunk")
			.sort(compareVersions)
			.reverse();
	}

	async getDownloadUrl(slug: string, version: string): Promise<string> {
		const metadata = await this.getMetadata(slug);

		if (metadata.versions && metadata.versions[version]) {
			return assertSafeUpstreamUrl(metadata.versions[version], {
				allowedHosts: WORDPRESS_ALLOWED_HOSTS,
			}).toString();
		}

		if (version === metadata.version) {
			return assertSafeUpstreamUrl(`${WP_DOWNLOADS}/${slug}.${version}.zip`, {
				allowedHosts: WORDPRESS_ALLOWED_HOSTS,
			}).toString();
		}

		throw new Error(`Version "${version}" not found for plugin "${slug}"`);
	}
}

export const wordpressRegistry = new WordPressRegistry();
