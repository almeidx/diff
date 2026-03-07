import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { npmRegistry } from "$lib/server/registries/npm";
import { getCached } from "$lib/server/cache";
import { parseVersionRange } from "$lib/utils/versions";
import { loadDiffPageData } from "$lib/server/diff/load-diff-page";
import { isNotFoundError } from "$lib/server/errors";
import { fetchWithTimeout } from "$lib/server/http";

const COMPARE_CACHE_TTL = 86400; // 24 hours
const GITHUB_ALLOWED_HOSTS = ["api.github.com"];

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

async function resolveCompareUrl(packageName: string, fromVersion: string, toVersion: string): Promise<string | null> {
	try {
		const repoUrl = await npmRegistry.getRepositoryUrl(packageName);
		if (!repoUrl) return null;

		const repoMatch = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
		if (!repoMatch) return null;

		const [, owner, repo] = repoMatch;
		const apiBase = `https://api.github.com/repos/${owner}/${repo}/compare`;
		const headers = { Accept: "application/vnd.github+json", "User-Agent": "diff-app" };

		return getCached(
			`github:compare:${packageName}:${fromVersion}:${toVersion}`,
			async () => {
				const candidates = [`v${fromVersion}...v${toVersion}`, `${fromVersion}...${toVersion}`];

				for (const range of candidates) {
					const res = await fetchWithTimeout(`${apiBase}/${range}`, {
						headers,
						allowedHosts: GITHUB_ALLOWED_HOSTS,
					});
					if (res.ok) return `${repoUrl}/compare/${range}`;
				}

				return null;
			},
			{ ttlSeconds: COMPARE_CACHE_TTL },
		);
	} catch {
		return null;
	}
}

export const load: PageServerLoad = async ({ params }) => {
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
		result = await loadDiffPageData({
			registry: npmRegistry,
			packageType: "npm",
			packageName,
			fromVersion,
			toVersion,
			archiveFormat: "tgz",
			diffCacheKey: `diff:npm:${packageName}:${fromVersion}:${toVersion}`,
		});
	} catch (e) {
		if (isNotFoundError(e)) {
			error(404, `Package "${packageName}" not found on npm`);
		}
		error(502, "Failed to fetch package metadata from npm");
	}

	const compareUrl = "diff" in result ? resolveCompareUrl(packageName, fromVersion, toVersion) : null;

	return {
		packageName,
		fromVersion,
		toVersion,
		...result,
		compareUrl,
	};
};
