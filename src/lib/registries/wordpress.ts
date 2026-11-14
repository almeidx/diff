import { AppError } from "#lib/errors.js";
import { assertAllowedUrl, upstreamFetch } from "#lib/http.js";
import type { PackageInfo, PackageSuggestion, Registry } from "./types.js";
import { compareVersions } from "./versions.js";

const API = "https://api.wordpress.org/plugins/info/1.2/";
const HOSTS = ["api.wordpress.org", "downloads.wordpress.org"] as const;
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
/** Keeps API responses small; everything else stays at its server default. */
const DISABLED_FIELDS = [
	"sections",
	"description",
	"reviews",
	"ratings",
	"banners",
	"icons",
	"screenshots",
	"contributors",
	"tags",
	"compatibility",
];

interface PluginInfo {
	name: string;
	slug: string;
	version: string;
	download_link?: string;
	versions?: Record<string, string>;
}

interface PluginSearch {
	plugins: Array<{ name: string; slug: string; version?: string; short_description?: string }>;
}

interface ResolvedPlugin {
	info: PackageInfo;
	downloads: Map<string, string>;
}

const plugins = new Map<string, Promise<ResolvedPlugin>>();

function apiUrl(action: string, request: Record<string, string>): URL {
	const url = new URL(API);
	url.searchParams.set("action", action);
	for (const [key, value] of Object.entries(request)) url.searchParams.set(`request[${key}]`, value);
	for (const field of DISABLED_FIELDS) url.searchParams.set(`request[fields][${field}]`, "0");
	return url;
}

const NAMED_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** The plugin API returns HTML-escaped text; DOMParser is unavailable in workers. */
function decodeEntities(text: string): string {
	return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
		if (code[0] !== "#") return NAMED_ENTITIES[code.toLowerCase()] ?? entity;
		const point = code[1] === "x" || code[1] === "X" ? Number.parseInt(code.slice(2), 16) : Number(code.slice(1));
		return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
	});
}

function resolve(slug: string, signal?: AbortSignal): Promise<ResolvedPlugin> {
	let pending = plugins.get(slug);
	if (!pending) {
		pending = load(slug, signal);
		plugins.set(slug, pending);
		pending.catch(() => plugins.delete(slug));
	}
	return pending;
}

async function load(slug: string, signal?: AbortSignal): Promise<ResolvedPlugin> {
	const response = await upstreamFetch(apiUrl("plugin_information", { slug }), { hosts: HOSTS, signal });
	if (response.status === 404) throw new AppError(`Plugin "${slug}" was not found on WordPress.org.`, "not-found");
	if (!response.ok) throw new AppError(`WordPress.org responded with ${response.status} for "${slug}".`);

	const data = (await response.json()) as PluginInfo;
	const downloads = new Map(Object.entries(data.versions ?? {}).filter(([version]) => version !== "trunk"));
	if (data.download_link && !downloads.has(data.version)) downloads.set(data.version, data.download_link);

	return {
		downloads,
		info: {
			name: data.slug,
			latest: data.version,
			versions: [...downloads.keys()]
				.sort(compareVersions)
				.reverse()
				.map((version) => ({ version, tags: version === data.version ? ["latest"] : [] })),
		},
	};
}

export const wordpress: Registry = {
	id: "wp",
	label: "WordPress",
	icon: "M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zM3.443 12c0-1.156.238-2.256.659-3.262l3.63 9.939A8.564 8.564 0 013.443 12zm8.557 8.557c-.883 0-1.736-.122-2.546-.348l2.703-7.858 2.768 7.585c.018.044.039.085.063.123a8.508 8.508 0 01-2.988.498zm1.172-12.584c.542-.028 1.03-.085 1.03-.085.485-.057.428-.77-.057-.742 0 0-1.458.114-2.4.114-.884 0-2.37-.114-2.37-.114-.485-.028-.542.713-.057.742 0 0 .459.057.943.085l1.401 3.838-1.968 5.901-3.274-9.739c.542-.028 1.03-.085 1.03-.085.485-.057.428-.77-.057-.742 0 0-1.458.114-2.4.114-.169 0-.367-.004-.58-.01A8.538 8.538 0 0112 3.443c2.258 0 4.318.874 5.855 2.3-.037-.002-.072-.008-.11-.008-.884 0-1.512.77-1.512 1.598 0 .742.428 1.37.884 2.113.343.599.742 1.37.742 2.483 0 .77-.296 1.663-.685 2.908l-.898 2.998-3.104-9.239zm4.534 10.946l2.748-7.946c.514-1.284.685-2.31.685-3.224 0-.332-.021-.64-.061-.927a8.558 8.558 0 01-3.372 12.097z",
	nameLabel: "Plugin",
	namePlaceholder: "akismet, jetpack…",
	archiveFormat: "zip",
	hosts: HOSTS,

	isValidName: (name) => name.length <= 200 && SLUG_PATTERN.test(name),

	async search(query, signal) {
		const response = await upstreamFetch(apiUrl("query_plugins", { search: query, per_page: "8" }), {
			hosts: HOSTS,
			signal,
		});
		if (!response.ok) throw new AppError(`WordPress.org search responded with ${response.status}.`);
		const data = (await response.json()) as PluginSearch;
		return data.plugins.map((plugin): PackageSuggestion => ({
			name: plugin.slug,
			description: decodeEntities(plugin.short_description || plugin.name),
			version: plugin.version,
		}));
	},

	async getPackage(slug, signal) {
		return (await resolve(slug, signal)).info;
	},

	async getDownloadUrl(slug, version, signal) {
		const url = (await resolve(slug, signal)).downloads.get(version);
		if (!url) throw new AppError(`Version ${version} of "${slug}" was not found on WordPress.org.`, "not-found");
		return assertAllowedUrl(url, HOSTS).href;
	},
};
