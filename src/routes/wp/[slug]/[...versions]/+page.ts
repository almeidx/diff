import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";
import { compareWithProgress } from "#lib/stores/progress.js";
import { isNotFoundError } from "#lib/errors.js";
import { parseVersionRange } from "#lib/utils/versions.js";

export const load: PageLoad = async ({ params }) => {
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
		result = await compareWithProgress("wp", slug, fromVersion, toVersion);
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
