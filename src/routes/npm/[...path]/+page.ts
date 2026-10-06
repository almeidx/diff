import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";
import { compare } from "#lib/compare/client.js";
import { resolveNpmCompareUrl } from "#lib/registries/github.js";
import { isNotFoundError } from "#lib/errors.js";
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

export const load: PageLoad = async ({ params }) => {
	const parsed = parsePath(params.path);

	if (!parsed) {
		error(400, "Invalid URL format. Expected: /npm/package/version1...version2");
	}

	const { packageName, fromVersion, toVersion } = parsed;

	if (packageName.length > 214 || fromVersion.length > 256 || toVersion.length > 256) {
		error(400, "Package name or version string too long");
	}

	let result;
	try {
		result = await compare("npm", packageName, fromVersion, toVersion);
	} catch (e) {
		if (isNotFoundError(e)) {
			error(404, `Package "${packageName}" not found on npm`);
		}
		error(502, "Failed to fetch package metadata from npm");
	}

	const compareUrl = "diff" in result ? await resolveNpmCompareUrl(packageName, fromVersion, toVersion) : null;

	return {
		packageName,
		fromVersion,
		toVersion,
		...result,
		compareUrl,
	};
};
