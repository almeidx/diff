import { npmRegistry } from "./npm.js";
import { fetchWithTimeout } from "#lib/http.js";

const GITHUB_ALLOWED_HOSTS = ["api.github.com"];

/**
 * Resolve a GitHub compare URL for an npm package's version range. Returns
 * null when the repository is unknown or no compare range exists.
 */
export async function resolveNpmCompareUrl(
	packageName: string,
	fromVersion: string,
	toVersion: string,
): Promise<string | null> {
	try {
		const repoUrl = await npmRegistry.getRepositoryUrl(packageName);
		if (!repoUrl) return null;

		const repoMatch = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
		if (!repoMatch) return null;

		const [, owner, repo] = repoMatch;
		const apiBase = `https://api.github.com/repos/${owner}/${repo}/compare`;
		const headers = { Accept: "application/vnd.github+json", "User-Agent": "diff-app" };

		const candidates = [`v${fromVersion}...v${toVersion}`, `${fromVersion}...${toVersion}`];

		for (const range of candidates) {
			const res = await fetchWithTimeout(`${apiBase}/${range}`, {
				headers,
				allowedHosts: GITHUB_ALLOWED_HOSTS,
			});
			if (res.ok) return `${repoUrl}/compare/${range}`;
		}

		return null;
	} catch {
		return null;
	}
}
