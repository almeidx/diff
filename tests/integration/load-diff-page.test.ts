import { afterEach, describe, expect, it, vi } from 'vitest';

import type { FileTree } from '$lib/types/index.js';
import type { Registry } from '$lib/server/registries/types.js';
import { loadDiffPageData } from '$lib/server/diff/load-diff-page';
import * as extractor from '$lib/server/archive/extractor';

function createTree(path: string, content: string): FileTree {
	return {
		files: new Map([
			[
				path,
				{
					path,
					content,
					isBinary: false,
					isMinified: false,
					size: content.length
				}
			]
		])
	};
}

function createRegistry(overrides: Partial<Registry> = {}): Registry {
	return {
		getVersions: async () => ['2.0.0', '1.0.0'],
		getDownloadUrl: async (packageName: string, version: string) =>
			`https://example.test/${packageName}-${version}.tgz`,
		validateVersion: async () => true,
		...overrides
	};
}

describe('loadDiffPageData integration', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns invalid_version when one or more versions are invalid', async () => {
		const getDownloadUrl = vi.fn(async (_packageName: string, _version: string) => 'unused');
		const registry = createRegistry({
			getDownloadUrl,
			validateVersion: async (_packageName: string, version: string) => version !== '9.9.9'
		});

		const result = await loadDiffPageData({
			registry,
			packageType: 'npm',
			packageName: 'lodash',
			fromVersion: '1.0.0',
			toVersion: '9.9.9',
			archiveFormat: 'tgz',
			diffCacheKey: 'diff:npm:lodash:1.0.0:9.9.9'
		});

		expect('error' in result).toBe(true);
		if ('error' in result) {
			expect(result.error.type).toBe('invalid_version');
			expect(result.error.message).toBe('Invalid version: 9.9.9');
			if (result.error.type === 'invalid_version') {
				expect(result.error.availableVersions).toEqual(['2.0.0', '1.0.0']);
			}
		}
		expect(getDownloadUrl).not.toHaveBeenCalled();
	});

	it('builds a diff from both extracted archives for valid versions', async () => {
		const fromTree = createTree('index.js', 'export const value = 1;\n');
		const toTree = createTree('index.js', 'export const value = 2;\n');
		const fetchAndExtractSpy = vi
			.spyOn(extractor, 'fetchAndExtract')
			.mockResolvedValueOnce(fromTree)
			.mockResolvedValueOnce(toTree);

		const result = await loadDiffPageData({
			registry: createRegistry(),
			packageType: 'npm',
			packageName: 'pkg',
			fromVersion: '1.0.0',
			toVersion: '2.0.0',
			archiveFormat: 'tgz',
			diffCacheKey: 'diff:npm:pkg:1.0.0:2.0.0'
		});

		expect('diff' in result).toBe(true);
		if ('diff' in result) {
			expect(result.diff.packageName).toBe('pkg');
			expect(result.diff.stats.files).toBe(1);
			expect(result.diff.stats.insertions).toBe(1);
			expect(result.diff.stats.deletions).toBe(1);
			expect(result.diff.files[0]?.path).toBe('index.js');
		}

		expect(fetchAndExtractSpy).toHaveBeenCalledTimes(2);
		expect(fetchAndExtractSpy).toHaveBeenNthCalledWith(
			1,
			'https://example.test/pkg-1.0.0.tgz',
			'tgz'
		);
		expect(fetchAndExtractSpy).toHaveBeenNthCalledWith(
			2,
			'https://example.test/pkg-2.0.0.tgz',
			'tgz'
		);
	});

	it('returns fetch_error when archive extraction fails', async () => {
		vi.spyOn(extractor, 'fetchAndExtract').mockRejectedValue(new Error('upstream unavailable'));

		const result = await loadDiffPageData({
			registry: createRegistry(),
			packageType: 'wp',
			packageName: 'akismet',
			fromVersion: '5.0.0',
			toVersion: '5.1.0',
			archiveFormat: 'zip',
			diffCacheKey: 'diff:wp:akismet:5.0.0:5.1.0'
		});

		expect('error' in result).toBe(true);
		if ('error' in result) {
			expect(result.error.type).toBe('fetch_error');
			expect(result.error.message).toBe('upstream unavailable');
		}
	});
});
