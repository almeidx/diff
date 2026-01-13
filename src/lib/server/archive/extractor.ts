import { unzipSync, gunzipSync } from 'fflate';
import { shouldInclude, isBinaryContent } from '../diff/filters.js';
import type { FileEntry, FileTree } from '$lib/types/index.js';

const MAX_ARCHIVE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILES = 5000;
const MAX_FILE_SIZE = 1024 * 1024; // 1MB per file

export async function fetchAndExtract(
	url: string,
	format: 'tgz' | 'zip'
): Promise<FileTree> {
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`Failed to fetch archive: ${response.statusText}`);
	}

	const buffer = await response.arrayBuffer();

	if (buffer.byteLength > MAX_ARCHIVE_SIZE) {
		throw new Error(`Package too large (${Math.round(buffer.byteLength / 1024 / 1024)}MB). Maximum supported size is ${MAX_ARCHIVE_SIZE / 1024 / 1024}MB.`);
	}

	const data = new Uint8Array(buffer);

	if (format === 'tgz') {
		return extractTgz(data);
	} else {
		return extractZip(data);
	}
}

function extractTgz(data: Uint8Array): FileTree {
	let decompressed: Uint8Array;
	try {
		decompressed = gunzipSync(data);
	} catch (e) {
		if (e instanceof RangeError && e.message.includes('typed array length')) {
			throw new Error('Package too large when decompressed. This package exceeds memory limits.');
		}
		throw e;
	}
	return extractTar(decompressed);
}

function extractTar(data: Uint8Array): FileTree {
	const files = new Map<string, FileEntry>();
	let offset = 0;

	while (offset < data.length - 512) {
		if (files.size >= MAX_FILES) break;

		const header = data.slice(offset, offset + 512);

		if (header.every((b) => b === 0)) {
			break;
		}

		const nameBytes = header.slice(0, 100);
		const nullIndex = nameBytes.indexOf(0);
		let name = new TextDecoder().decode(
			nullIndex >= 0 ? nameBytes.slice(0, nullIndex) : nameBytes
		);

		const prefixBytes = header.slice(345, 500);
		const prefixNullIndex = prefixBytes.indexOf(0);
		const prefix = new TextDecoder().decode(
			prefixNullIndex >= 0 ? prefixBytes.slice(0, prefixNullIndex) : prefixBytes
		);

		if (prefix) {
			name = `${prefix}/${name}`;
		}

		name = name.replace(/^package\//, '').replace(/^[^/]+\//, '');

		const sizeStr = new TextDecoder().decode(header.slice(124, 136)).trim();
		const size = parseInt(sizeStr, 8) || 0;

		const typeFlag = header[156];

		offset += 512;

		if (typeFlag === 0 || typeFlag === 48) {
			const filterResult = shouldInclude(name);

			if (filterResult.include && !filterResult.isBinary && name && !name.endsWith('/') && size <= MAX_FILE_SIZE) {
				const content = data.slice(offset, offset + size);

				if (!isBinaryContent(content)) {
					files.set(name, {
						path: name,
						content: new TextDecoder().decode(content),
						isBinary: false,
						isMinified: filterResult.isMinified,
						size
					});
				}
			}
		}

		offset += Math.ceil(size / 512) * 512;
	}

	return { files };
}

function extractZip(data: Uint8Array): FileTree {
	const files = new Map<string, FileEntry>();
	const filterCache = new Map<string, { include: boolean; isBinary: boolean; isMinified: boolean }>();

	let skippedPreFilter = 0;
	let skippedBinaryContent = 0;

	let unzipped;
	try {
		unzipped = unzipSync(data, {
			filter: (file) => {
				const normalizedPath = file.name.replace(/^[^/]+\//, '');

				if (!normalizedPath || normalizedPath.endsWith('/')) {
					return false;
				}

				if (file.originalSize > MAX_FILE_SIZE) {
					skippedPreFilter++;
					return false;
				}

				const filterResult = shouldInclude(normalizedPath);

				if (!filterResult.include || filterResult.isBinary) {
					skippedPreFilter++;
					return false;
				}

				filterCache.set(file.name, filterResult);
				return true;
			}
		});
	} catch (e) {
		if (e instanceof RangeError && e.message.includes('typed array length')) {
			throw new Error('Package too large when decompressed. This package exceeds memory limits.');
		}
		throw e;
	}

	const entries = Object.entries(unzipped);
	console.log(`[extractZip] Pre-filtered to ${entries.length} entries (skipped ${skippedPreFilter} before decompression)`);

	for (const [path, content] of entries) {
		if (files.size >= MAX_FILES) break;

		const normalizedPath = path.replace(/^[^/]+\//, '');
		const filterResult = filterCache.get(path);

		if (!filterResult) continue;

		if (isBinaryContent(content)) {
			skippedBinaryContent++;
			continue;
		}

		files.set(normalizedPath, {
			path: normalizedPath,
			content: new TextDecoder().decode(content),
			isBinary: false,
			isMinified: filterResult.isMinified,
			size: content.length
		});
	}

	console.log(`[extractZip] Extracted ${files.size} files (skipped ${skippedBinaryContent} binary content)`);

	return { files };
}
