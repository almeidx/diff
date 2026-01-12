import { unzipSync, gunzipSync } from 'fflate';
import { shouldInclude, isBinaryContent } from '../diff/filters.js';
import type { FileEntry, FileTree } from '$lib/types/index.js';

export async function fetchAndExtract(
	url: string,
	format: 'tgz' | 'zip'
): Promise<FileTree> {
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`Failed to fetch archive: ${response.statusText}`);
	}

	const buffer = await response.arrayBuffer();
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
			const content = data.slice(offset, offset + size);
			const filterResult = shouldInclude(name);

			if (filterResult.include && name && !name.endsWith('/')) {
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

	for (const [path, content] of Object.entries(unzipped)) {
		let normalizedPath = path.replace(/^[^/]+\//, '');

		if (!normalizedPath || normalizedPath.endsWith('/')) {
			continue;
		}

		const filterResult = shouldInclude(normalizedPath);

		if (!filterResult.include) {
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

	return { files };
}
