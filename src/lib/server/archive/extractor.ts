import { unzipSync, gunzipSync } from 'fflate';
import { shouldInclude, isBinaryContent } from '../diff/filters.js';
import type { FileEntry, FileTree } from '$lib/types/index.js';

const MAX_ARCHIVE_SIZE = 30 * 1024 * 1024; // 30MB
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
	const decompressed = gunzipSync(data);
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

			if (filterResult.include && name && !name.endsWith('/') && size <= MAX_FILE_SIZE) {
				const content = data.slice(offset, offset + size);
				const isBinary = filterResult.isBinary || isBinaryContent(content);

				files.set(name, {
					path: name,
					content: isBinary ? null : new TextDecoder().decode(content),
					isBinary,
					isMinified: filterResult.isMinified,
					size
				});
			}
		}

		offset += Math.ceil(size / 512) * 512;
	}

	return { files };
}

function extractZip(data: Uint8Array): FileTree {
	const files = new Map<string, FileEntry>();
	const unzipped = unzipSync(data);

	const entries = Object.entries(unzipped);
	console.log(`[extractZip] Total entries in zip: ${entries.length}`);

	let skippedSize = 0;
	let skippedFilter = 0;
	let skippedDir = 0;

	for (const [path, content] of entries) {
		if (files.size >= MAX_FILES) break;

		let normalizedPath = path.replace(/^[^/]+\//, '');

		if (!normalizedPath || normalizedPath.endsWith('/')) {
			skippedDir++;
			continue;
		}

		if (content.length > MAX_FILE_SIZE) {
			skippedSize++;
			continue;
		}

		const filterResult = shouldInclude(normalizedPath);

		if (!filterResult.include) {
			skippedFilter++;
			continue;
		}

		const isBinary = filterResult.isBinary || isBinaryContent(content);

		files.set(normalizedPath, {
			path: normalizedPath,
			content: isBinary ? null : new TextDecoder().decode(content),
			isBinary,
			isMinified: filterResult.isMinified,
			size: content.length
		});
	}

	console.log(`[extractZip] Extracted ${files.size} files, skipped: ${skippedDir} dirs, ${skippedSize} too large, ${skippedFilter} filtered`);

	return { files };
}
