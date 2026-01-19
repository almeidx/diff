import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { npmRegistry } from '$lib/server/registries/npm';
import { fetchAndExtract } from '$lib/server/archive/extractor';
import { computeDiff } from '$lib/server/diff/engine';
import { getCached } from '$lib/server/cache';
import { parseVersionRange, formatInvalidVersionError } from '$lib/utils/versions';
import type { DiffResult } from '$lib/types/index.js';

const DIFF_CACHE_TTL = 86400; // 24 hours (versions are immutable)

interface ParsedPath {
	packageName: string;
	fromVersion: string;
	toVersion: string;
}

function parsePath(path: string): ParsedPath | null {
	const parts = path.split('/');

	let packageName: string;
	let versionPart: string;

	if (parts[0]?.startsWith('@')) {
		if (parts.length < 3) return null;
		packageName = `${parts[0]}/${parts[1]}`;
		versionPart = parts.slice(2).join('/');
	} else {
		if (parts.length < 2) return null;
		packageName = parts[0];
		versionPart = parts.slice(1).join('/');
	}

	const parsed = parseVersionRange(versionPart);
	if (!parsed) return null;

	return {
		packageName,
		...parsed
	};
}

export const load: PageServerLoad = async ({ params }) => {
	const parsed = parsePath(params.path);

	if (!parsed) {
		error(400, 'Invalid URL format. Expected: /npm/package/version1...version2');
	}

	const { packageName, fromVersion, toVersion } = parsed;

	let versions: string[];
	try {
		versions = await npmRegistry.getVersions(packageName);
	} catch (e) {
		error(404, `Package "${packageName}" not found on npm`);
	}

	const fromValid = await npmRegistry.validateVersion(packageName, fromVersion);
	const toValid = await npmRegistry.validateVersion(packageName, toVersion);

	if (!fromValid || !toValid) {
		return {
			error: {
				type: 'invalid_version' as const,
				message: formatInvalidVersionError(fromVersion, toVersion, fromValid, toValid),
				availableVersions: versions
			},
			packageName,
			fromVersion,
			toVersion,
			versions
		};
	}

	let diff: DiffResult;
	try {
		diff = await getCached(
			`diff:npm:${packageName}:${fromVersion}:${toVersion}`,
			async () => {
				const [fromUrl, toUrl] = await Promise.all([
					npmRegistry.getDownloadUrl(packageName, fromVersion),
					npmRegistry.getDownloadUrl(packageName, toVersion)
				]);

				const [fromTree, toTree] = await Promise.all([
					fetchAndExtract(fromUrl, 'tgz'),
					fetchAndExtract(toUrl, 'tgz')
				]);

				return computeDiff(fromTree, toTree, 'npm', packageName, fromVersion, toVersion);
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
			packageName,
			fromVersion,
			toVersion,
			versions
		};
	}

	return {
		diff,
		packageName,
		fromVersion,
		toVersion,
		versions
	};
};
