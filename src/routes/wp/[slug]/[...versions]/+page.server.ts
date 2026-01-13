import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { wordpressRegistry } from '$lib/server/registries/wordpress';
import { fetchAndExtract } from '$lib/server/archive/extractor';
import { computeDiff } from '$lib/server/diff/engine';
import { getCached } from '$lib/server/cache';
import { highlightDiffResult } from '$lib/server/highlight/shiki';
import type { DiffResult } from '$lib/types/index.js';

const DIFF_CACHE_TTL = 86400; // 24 hours (versions are immutable)

function parseVersions(versionsPath: string): { fromVersion: string; toVersion: string } | null {
	const match = versionsPath.match(/^(.+?)\.\.\.(.+)$/);
	if (!match) return null;

	return {
		fromVersion: match[1],
		toVersion: match[2]
	};
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
				message: `Invalid version${!fromValid && !toValid ? 's' : ''}: ${!fromValid ? fromVersion : ''}${!fromValid && !toValid ? ', ' : ''}${!toValid ? toVersion : ''}`,
				availableVersions: versions
			},
			slug,
			fromVersion,
			toVersion,
			versions
		};
	}

	const diff = await getCached(
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

	await highlightDiffResult(diff);

	return {
		diff,
		slug,
		fromVersion,
		toVersion,
		versions
	};
};
