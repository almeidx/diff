import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { wordpressRegistry } from '$lib/server/registries/wordpress';
import { fetchAndExtract } from '$lib/server/archive/extractor';
import { computeDiff } from '$lib/server/diff/engine';
import { getCached } from '$lib/server/cache';
import { parseVersionRange, formatInvalidVersionError } from '$lib/utils/versions';
import type { DiffResult } from '$lib/types/index.js';

const DIFF_CACHE_TTL = 86400; // 24 hours (versions are immutable)

function parseVersions(versionsPath: string): { fromVersion: string; toVersion: string } | null {
	return parseVersionRange(versionsPath);
}

export const load: PageServerLoad = async ({ params }) => {
	const { slug, versions: versionsPath } = params;

	const parsed = parseVersions(versionsPath);
	if (!parsed) {
		error(400, 'Invalid URL format. Expected: /wp/plugin-slug/version1...version2');
	}

	const { fromVersion, toVersion } = parsed;

	let versions: string[];
	try {
		versions = await wordpressRegistry.getVersions(slug);
	} catch (e) {
		error(404, `Plugin "${slug}" not found on WordPress.org`);
	}

	const fromValid = await wordpressRegistry.validateVersion(slug, fromVersion);
	const toValid = await wordpressRegistry.validateVersion(slug, toVersion);

	if (!fromValid || !toValid) {
		return {
			error: {
				type: 'invalid_version' as const,
				message: formatInvalidVersionError(fromVersion, toVersion, fromValid, toValid),
				availableVersions: versions
			},
			slug,
			fromVersion,
			toVersion,
			versions
		};
	}

	let diff: DiffResult;
	try {
		diff = await getCached(
			`diff:wp:${slug}:${fromVersion}:${toVersion}`,
			async () => {
				const [fromUrl, toUrl] = await Promise.all([
					wordpressRegistry.getDownloadUrl(slug, fromVersion),
					wordpressRegistry.getDownloadUrl(slug, toVersion)
				]);

				const [fromTree, toTree] = await Promise.all([
					fetchAndExtract(fromUrl, 'zip'),
					fetchAndExtract(toUrl, 'zip')
				]);

				return computeDiff(fromTree, toTree, 'wp', slug, fromVersion, toVersion);
			},
			{ ttlSeconds: DIFF_CACHE_TTL }
		);
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Failed to compute diff';
		return {
			error: {
				type: 'fetch_error' as const,
				message
			},
			slug,
			fromVersion,
			toVersion,
			versions
		};
	}

	return {
		diff,
		slug,
		fromVersion,
		toVersion,
		versions
	};
};
