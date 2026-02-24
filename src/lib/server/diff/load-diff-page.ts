import type { PackageType, DiffResult, DiffError } from '$lib/types/index.js';
import type { Registry } from '$lib/server/registries/types.js';
import { fetchAndExtract } from '$lib/server/archive/extractor';
import { getCached } from '$lib/server/cache';
import { formatInvalidVersionError } from '$lib/utils/versions';
import { computeDiff } from './engine.js';
import { getErrorMessage } from '$lib/server/errors.js';
import { logInfo, logWarn } from '$lib/server/log.js';

const DIFF_CACHE_TTL = 86400; // 24 hours (versions are immutable)

interface LoadDiffPageOptions {
	registry: Registry;
	packageType: PackageType;
	packageName: string;
	fromVersion: string;
	toVersion: string;
	archiveFormat: 'tgz' | 'zip';
	diffCacheKey: string;
}

interface LoadDiffPageSuccess {
	diff: DiffResult;
	versions: string[];
}

interface LoadDiffPageError {
	error: DiffError;
	versions: string[];
}

export type LoadDiffPageResult = LoadDiffPageSuccess | LoadDiffPageError;

export async function loadDiffPageData(options: LoadDiffPageOptions): Promise<LoadDiffPageResult> {
	const { registry, packageType, packageName, fromVersion, toVersion, archiveFormat, diffCacheKey } =
		options;
	const startedAt = Date.now();

	const versions = await registry.getVersions(packageName);

	const [fromValid, toValid] = await Promise.all([
		registry.validateVersion(packageName, fromVersion),
		registry.validateVersion(packageName, toVersion)
	]);

	if (!fromValid || !toValid) {
		logWarn('diff_invalid_version', {
			packageType,
			packageName,
			fromVersion,
			toVersion,
			fromValid,
			toValid
		});
		return {
			error: {
				type: 'invalid_version',
				message: formatInvalidVersionError(fromVersion, toVersion, fromValid, toValid),
				availableVersions: versions
			},
			versions
		};
	}

	try {
		const diff = await getCached(
			diffCacheKey,
			async () => {
				const [fromUrl, toUrl] = await Promise.all([
					registry.getDownloadUrl(packageName, fromVersion),
					registry.getDownloadUrl(packageName, toVersion)
				]);

				const [fromTree, toTree] = await Promise.all([
					fetchAndExtract(fromUrl, archiveFormat),
					fetchAndExtract(toUrl, archiveFormat)
				]);

				return computeDiff(fromTree, toTree, packageType, packageName, fromVersion, toVersion);
			},
			{ ttlSeconds: DIFF_CACHE_TTL }
		);

		logInfo('diff_loaded', {
			packageType,
			packageName,
			fromVersion,
			toVersion,
			files: diff.stats.files,
			insertions: diff.stats.insertions,
			deletions: diff.stats.deletions,
			durationMs: Date.now() - startedAt
		});

		return { diff, versions };
	} catch (e) {
		logWarn('diff_load_failed', {
			packageType,
			packageName,
			fromVersion,
			toVersion,
			durationMs: Date.now() - startedAt,
			error: e
		});
		return {
			error: {
				type: 'fetch_error',
				message: getErrorMessage(e, 'Failed to compute diff')
			},
			versions
		};
	}
}
