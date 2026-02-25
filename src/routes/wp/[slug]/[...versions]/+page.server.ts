import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { wordpressRegistry } from "$lib/server/registries/wordpress";
import { parseVersionRange } from "$lib/utils/versions";
import { loadDiffPageData } from "$lib/server/diff/load-diff-page";
import { isNotFoundError } from "$lib/server/errors";

function parseVersions(versionsPath: string): { fromVersion: string; toVersion: string } | null {
	return parseVersionRange(versionsPath);
}

export const load: PageServerLoad = async ({ params }) => {
	const { slug, versions: versionsPath } = params;

	const parsed = parseVersions(versionsPath);
	if (!parsed) {
		error(400, "Invalid URL format. Expected: /wp/plugin-slug/version1...version2");
	}

	const { fromVersion, toVersion } = parsed;

	let result;
	try {
		result = await loadDiffPageData({
			registry: wordpressRegistry,
			packageType: "wp",
			packageName: slug,
			fromVersion,
			toVersion,
			archiveFormat: "zip",
			diffCacheKey: `diff:wp:${slug}:${fromVersion}:${toVersion}`,
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
