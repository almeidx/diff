import { unzipSync, gunzipSync } from 'fflate';
import { dev } from '$app/environment';
import { shouldInclude, isBinaryContent } from '../diff/filters.js';
import type { FileEntry, FileTree } from '$lib/types/index.js';
import { normalizeArchivePath } from './path.js';

const MAX_ARCHIVE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_DECOMPRESSED_SIZE = 128 * 1024 * 1024; // 128MB
const MAX_FILES = 5000;
const MAX_FILE_SIZE = 1024 * 1024; // 1MB per file
const TAR_BLOCK_SIZE = 512;
const textDecoder = new TextDecoder();

export async function fetchAndExtract(
	url: string,
	format: 'tgz' | 'zip'
): Promise<FileTree> {
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`Failed to fetch archive: ${response.statusText}`);
	}

	const buffer = await response.arrayBuffer();

	if (!dev && buffer.byteLength > MAX_ARCHIVE_SIZE) {
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

	if (!dev && decompressed.byteLength > MAX_DECOMPRESSED_SIZE) {
		throw new Error(
			`Package too large when decompressed (${Math.round(decompressed.byteLength / 1024 / 1024)}MB). Maximum supported size is ${MAX_DECOMPRESSED_SIZE / 1024 / 1024}MB.`
		);
	}

	return extractTar(decompressed);
}

function extractTar(data: Uint8Array): FileTree {
	const files = new Map<string, FileEntry>();
	let offset = 0;
	let totalIncludedSize = 0;

	while (offset < data.length - TAR_BLOCK_SIZE) {
		if (!dev && files.size >= MAX_FILES) break;

		const header = data.subarray(offset, offset + TAR_BLOCK_SIZE);

		if (isZeroBlock(header)) {
			break;
		}

		let name = decodeNullTerminated(header.subarray(0, 100));
		const prefix = decodeNullTerminated(header.subarray(345, 500));

		if (prefix) {
			name = `${prefix}/${name}`;
		}

		const normalizedPath = normalizeArchivePath(name, 'tgz');
		const size = parseTarSize(header.subarray(124, 136));
		const typeFlag = header[156];

		offset += TAR_BLOCK_SIZE;

		if (typeFlag === 0 || typeFlag === 48) {
			const filterResult = shouldInclude(normalizedPath);

			if (
				filterResult.include &&
				!filterResult.isBinary &&
				normalizedPath &&
				!normalizedPath.endsWith('/') &&
				(dev || size <= MAX_FILE_SIZE)
			) {
				totalIncludedSize += size;
				if (!dev && totalIncludedSize > MAX_DECOMPRESSED_SIZE) {
					throw new Error(
						`Package has too much text content (${Math.round(totalIncludedSize / 1024 / 1024)}MB). Maximum supported size is ${MAX_DECOMPRESSED_SIZE / 1024 / 1024}MB.`
					);
				}

				const content = data.subarray(offset, offset + size);

				if (!isBinaryContent(content)) {
					files.set(normalizedPath, {
						path: normalizedPath,
						content: textDecoder.decode(content),
						isBinary: false,
						isMinified: filterResult.isMinified,
						size
					});
				}
			}
		}

		offset += Math.ceil(size / TAR_BLOCK_SIZE) * TAR_BLOCK_SIZE;
	}

	return { files };
}

function extractZip(data: Uint8Array): FileTree {
	const files = new Map<string, FileEntry>();
	const filterCache = new Map<string, { include: boolean; isBinary: boolean; isMinified: boolean }>();
	let includedOriginalSize = 0;

	let unzipped;
	try {
		unzipped = unzipSync(data, {
			filter: (file) => {
				const normalizedPath = normalizeArchivePath(file.name, 'zip');

				if (!normalizedPath || normalizedPath.endsWith('/')) {
					return false;
				}

				if (!dev && file.originalSize > MAX_FILE_SIZE) {
					return false;
				}

				const filterResult = shouldInclude(normalizedPath);

				if (!filterResult.include || filterResult.isBinary) {
					return false;
				}

				includedOriginalSize += file.originalSize;
				if (!dev && includedOriginalSize > MAX_DECOMPRESSED_SIZE) {
					throw new Error(
						`Package has too much text content (${Math.round(includedOriginalSize / 1024 / 1024)}MB). Maximum supported size is ${MAX_DECOMPRESSED_SIZE / 1024 / 1024}MB.`
					);
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

	for (const [path, content] of entries) {
		if (!dev && files.size >= MAX_FILES) break;

		const normalizedPath = normalizeArchivePath(path, 'zip');
		const filterResult = filterCache.get(path);

		if (!filterResult) continue;

		if (isBinaryContent(content)) {
			continue;
		}

		files.set(normalizedPath, {
			path: normalizedPath,
			content: textDecoder.decode(content),
			isBinary: false,
			isMinified: filterResult.isMinified,
			size: content.length
		});
	}

	return { files };
}

function decodeNullTerminated(bytes: Uint8Array): string {
	const nullIndex = bytes.indexOf(0);
	return textDecoder.decode(nullIndex >= 0 ? bytes.subarray(0, nullIndex) : bytes);
}

function parseTarSize(sizeBytes: Uint8Array): number {
	const sizeStr = decodeNullTerminated(sizeBytes).trim();
	return parseInt(sizeStr, 8) || 0;
}

function isZeroBlock(block: Uint8Array): boolean {
	for (let i = 0; i < block.length; i++) {
		if (block[i] !== 0) {
			return false;
		}
	}
	return true;
}
