import { error } from "@sveltejs/kit";
import { waitUntil } from "cloudflare:workers";
import type { PageServerLoad } from "./$types";
import { wordpressRegistry } from "#lib/server/registries/wordpress.js";
import { parseVersionRange } from "#lib/utils/versions.js";
import { loadDiffPageData } from "#lib/server/diff/load-diff-page.js";
import { buildDiffCacheKey } from "#lib/server/diff/cache-key.js";
import { isNotFoundError } from "#lib/server/errors.js";

export const load: PageServerLoad = async ({ params }) => {
	const { slug, versions: versionsPath } = params;

	if (slug.length > 200 || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
		error(400, "Invalid plugin slug format");
	}

	const parsed = parseVersionRange(versionsPath);
	if (!parsed) {
		error(400, "Invalid URL format. Expected: /wp/plugin-slug/version1...version2");
	}

	const { fromVersion, toVersion } = parsed;

	if (fromVersion.length > 256 || toVersion.length > 256) {
		error(400, "Version string too long");
	}

	let result;
	try {
		result = await loadDiffPageData({
			registry: wordpressRegistry,
			packageType: "wp",
			packageName: slug,
			fromVersion,
			toVersion,
			archiveFormat: "zip",
			diffCacheKey: buildDiffCacheKey("wp", slug, fromVersion, toVersion),
			waitUntil,
		});
	} catch (e) {
		if (isNotFoundError(e)) {
			error(404, `Plugin "${slug}" not found on WordPress.org`);
		}
		error(502, "Failed to fetch plugin metadata from WordPress.org");
	}

	return {
		slug,
		fromVersion,
		toVersion,
		...result,
	};
};
