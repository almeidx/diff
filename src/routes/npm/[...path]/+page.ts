import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";
import { WORKER_CRASH_MESSAGE } from "#lib/compare/client.js";
import { compareWithProgress } from "#lib/stores/progress.js";
import { isNotFoundError } from "#lib/errors.js";
import { limitsFromSearchParams } from "#lib/archive/limits.js";
import { parseVersionRange } from "#lib/utils/versions.js";

interface ParsedPath {
	packageName: string;
	fromVersion: string;
	toVersion: string;
}

function parsePath(path: string): ParsedPath | null {
	const parts = path.split("/");

	let packageName: string;
	let versionPart: string;

	if (parts[0]?.startsWith("@")) {
		if (parts.length < 3) return null;
		packageName = `${parts[0]}/${parts[1]}`;
		versionPart = parts.slice(2).join("/");
	} else {
		if (parts.length < 2) return null;
		packageName = parts[0];
		versionPart = parts.slice(1).join("/");
	}

	const parsed = parseVersionRange(versionPart);
	if (!parsed) return null;

	return {
		packageName,
		...parsed,
	};
}

export const load: PageLoad = async ({ params, url }) => {
	const parsed = parsePath(params.path);

	if (!parsed) {
		error(400, "Invalid URL format. Expected: /npm/package/version1...version2");
	}

	const { packageName, fromVersion, toVersion } = parsed;

	if (packageName.length > 214 || fromVersion.length > 256 || toVersion.length > 256) {
		error(400, "Package name or version string too long");
	}

	const limits = limitsFromSearchParams(url.searchParams);

	let result;
	try {
		result = await compareWithProgress("npm", packageName, fromVersion, toVersion, limits);
	} catch (e) {
		if (isNotFoundError(e)) {
			error(404, `Package "${packageName}" not found on npm`);
		}
		if (e instanceof Error && e.message === WORKER_CRASH_MESSAGE) {
			error(500, "The comparison worker crashed, likely because the package is too large for this browser.");
		}
		error(502, "Failed to fetch package metadata from npm");
	}

	return {
		packageName,
		fromVersion,
		toVersion,
		...result,
	};
};
