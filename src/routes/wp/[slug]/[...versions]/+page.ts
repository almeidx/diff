import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";
import { WORKER_CRASH_MESSAGE } from "#lib/compare/client.js";
import { compareWithProgress } from "#lib/stores/progress.js";
import { isNotFoundError } from "#lib/errors.js";
import { limitsFromSearchParams } from "#lib/archive/limits.js";
import { parseVersionRange } from "#lib/utils/versions.js";

export const load: PageLoad = async ({ params, url }) => {
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

	const limits = limitsFromSearchParams(url.searchParams);

	let result;
	try {
		result = await compareWithProgress("wp", slug, fromVersion, toVersion, limits);
	} catch (e) {
		if (isNotFoundError(e)) {
			error(404, `Plugin "${slug}" not found on WordPress.org`);
		}
		if (e instanceof Error && e.message === WORKER_CRASH_MESSAGE) {
			error(500, "The comparison worker crashed, likely because the plugin is too large for this browser.");
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
