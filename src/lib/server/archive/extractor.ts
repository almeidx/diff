import { Gunzip, unzipSync, gunzipSync } from "fflate";
import { dev } from "$app/environment";
import { shouldInclude, isBinaryContent } from "../diff/filters.js";
import type { FileEntry, FileTree } from "$lib/types/index.js";
import { getCommonZipRoot, normalizeArchivePath, stripZipRoot } from "./path.js";
import { fetchWithTimeout } from "$lib/server/http.js";

const MAX_ARCHIVE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_DECOMPRESSED_SIZE = 128 * 1024 * 1024; // 128MB
const MAX_FILES = 5000;
const MAX_FILE_SIZE = 1024 * 1024; // 1MB per file
const TAR_BLOCK_SIZE = 512;
const textDecoder = new TextDecoder();
const ARCHIVE_ALLOWED_HOSTS = ["registry.npmjs.org", "registry.npmjs.com", "downloads.wordpress.org"];

interface FileFilterResult {
	include: boolean;
	isBinary: boolean;
	isMinified: boolean;
	normalizedPath?: string;
}

interface TarEntryState {
	path: string;
	size: number;
	isMinified: boolean;
	capture: boolean;
	captureBuffer: Uint8Array | null;
	captureOffset: number;
	remainingContent: number;
	remainingPadding: number;
}

export async function fetchAndExtract(url: string, format: "tgz" | "zip"): Promise<FileTree> {
	const response = await fetchWithTimeout(url, { allowedHosts: ARCHIVE_ALLOWED_HOSTS });

	if (!response.ok) {
		throw new Error(`Failed to fetch archive: ${response.statusText}`);
	}

	if (format === "tgz") {
		return extractTgzFromResponse(response);
	}

	const data = await readResponseBytes(response, MAX_ARCHIVE_SIZE);
	return extractZip(data);
}

async function extractTgzFromResponse(response: Response): Promise<FileTree> {
	if (!response.body) {
		const data = await readResponseBytes(response, MAX_ARCHIVE_SIZE);
		return extractTgzFromBuffer(data);
	}

	const extractor = new TarStreamExtractor();
	const gunzip = new Gunzip();
	gunzip.ondata = (chunk) => {
		extractor.push(chunk);
	};

	let compressedSize = 0;
	const reader = response.body.getReader();

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			compressedSize += value.byteLength;
			if (!dev && compressedSize > MAX_ARCHIVE_SIZE) {
				throw new Error(
					`Package too large (${Math.round(compressedSize / 1024 / 1024)}MB). Maximum supported size is ${MAX_ARCHIVE_SIZE / 1024 / 1024}MB.`,
				);
			}

			gunzip.push(value, false);
		}

		gunzip.push(new Uint8Array(0), true);
		return extractor.finish();
	} catch (e) {
		if (e instanceof RangeError && e.message.includes("typed array length")) {
			throw new Error("Package too large when decompressed. This package exceeds memory limits.");
		}
		throw e;
	} finally {
		await reader.cancel().catch(() => {});
		reader.releaseLock();
	}
}

function extractTgzFromBuffer(data: Uint8Array): FileTree {
	let decompressed: Uint8Array;
	try {
		decompressed = gunzipSync(data);
	} catch (e) {
		if (e instanceof RangeError && e.message.includes("typed array length")) {
			throw new Error("Package too large when decompressed. This package exceeds memory limits.");
		}
		throw e;
	}

	if (!dev && decompressed.byteLength > MAX_DECOMPRESSED_SIZE) {
		throw new Error(
			`Package too large when decompressed (${Math.round(decompressed.byteLength / 1024 / 1024)}MB). Maximum supported size is ${MAX_DECOMPRESSED_SIZE / 1024 / 1024}MB.`,
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

		const normalizedPath = normalizeArchivePath(name, "tgz");
		const size = parseTarSize(header.subarray(124, 136));
		const typeFlag = header[156];

		offset += TAR_BLOCK_SIZE;

		if (typeFlag === 0 || typeFlag === 48) {
			const filterResult = shouldInclude(normalizedPath);

			if (
				filterResult.include &&
				!filterResult.isBinary &&
				normalizedPath &&
				!normalizedPath.endsWith("/") &&
				(dev || size <= MAX_FILE_SIZE)
			) {
				totalIncludedSize += size;
				if (!dev && totalIncludedSize > MAX_DECOMPRESSED_SIZE) {
					throw new Error(
						`Package has too much text content (${Math.round(totalIncludedSize / 1024 / 1024)}MB). Maximum supported size is ${MAX_DECOMPRESSED_SIZE / 1024 / 1024}MB.`,
					);
				}

				const content = data.subarray(offset, offset + size);

				if (!isBinaryContent(content)) {
					files.set(normalizedPath, {
						path: normalizedPath,
						content: textDecoder.decode(content),
						isBinary: false,
						isMinified: filterResult.isMinified,
						size,
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
	const filterCache = new Map<string, FileFilterResult>();
	let includedOriginalSize = 0;

	let unzipped;
	try {
		unzipped = unzipSync(data, {
			filter: (file) => {
				const normalizedPath = normalizeArchivePath(file.name, "zip");

				if (!normalizedPath || normalizedPath.endsWith("/")) {
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
						`Package has too much text content (${Math.round(includedOriginalSize / 1024 / 1024)}MB). Maximum supported size is ${MAX_DECOMPRESSED_SIZE / 1024 / 1024}MB.`,
					);
				}

				filterCache.set(file.name, { ...filterResult, normalizedPath });
				return true;
			},
		});
	} catch (e) {
		if (e instanceof RangeError && e.message.includes("typed array length")) {
			throw new Error("Package too large when decompressed. This package exceeds memory limits.");
		}
		throw e;
	}

	const entries = Object.entries(unzipped);
	const includedPaths = entries
		.map(([path]) => filterCache.get(path)?.normalizedPath)
		.filter((path): path is string => Boolean(path));
	const zipRoot = getCommonZipRoot(includedPaths);

	for (const [path, content] of entries) {
		if (!dev && files.size >= MAX_FILES) break;

		const filterResult = filterCache.get(path);

		if (!filterResult) continue;
		if (isBinaryContent(content)) continue;
		const normalizedPath = stripZipRoot(filterResult.normalizedPath ?? "", zipRoot);
		if (!normalizedPath || normalizedPath.endsWith("/")) continue;

		files.set(normalizedPath, {
			path: normalizedPath,
			content: textDecoder.decode(content),
			isBinary: false,
			isMinified: filterResult.isMinified,
			size: content.length,
		});
	}

	return { files };
}

class TarStreamExtractor {
	private files = new Map<string, FileEntry>();
	private headerBuffer = new Uint8Array(TAR_BLOCK_SIZE);
	private headerOffset = 0;
	private currentEntry: TarEntryState | null = null;
	private reachedEnd = false;
	private decompressedSize = 0;
	private includedSize = 0;

	push(chunk: Uint8Array): void {
		if (this.reachedEnd) return;

		this.decompressedSize += chunk.byteLength;
		if (!dev && this.decompressedSize > MAX_DECOMPRESSED_SIZE) {
			throw new Error(
				`Package too large when decompressed (${Math.round(this.decompressedSize / 1024 / 1024)}MB). Maximum supported size is ${MAX_DECOMPRESSED_SIZE / 1024 / 1024}MB.`,
			);
		}

		let offset = 0;
		while (offset < chunk.length) {
			if (!this.currentEntry) {
				const read = Math.min(TAR_BLOCK_SIZE - this.headerOffset, chunk.length - offset);
				this.headerBuffer.set(chunk.subarray(offset, offset + read), this.headerOffset);
				this.headerOffset += read;
				offset += read;

				if (this.headerOffset < TAR_BLOCK_SIZE) {
					continue;
				}

				this.headerOffset = 0;
				if (isZeroBlock(this.headerBuffer)) {
					this.reachedEnd = true;
					return;
				}

				this.currentEntry = this.parseHeader(this.headerBuffer);
				continue;
			}

			if (this.currentEntry.remainingContent > 0) {
				const take = Math.min(this.currentEntry.remainingContent, chunk.length - offset);

				if (this.currentEntry.capture && this.currentEntry.captureBuffer) {
					this.currentEntry.captureBuffer.set(chunk.subarray(offset, offset + take), this.currentEntry.captureOffset);
					this.currentEntry.captureOffset += take;
				}

				this.currentEntry.remainingContent -= take;
				offset += take;
				continue;
			}

			if (this.currentEntry.remainingPadding > 0) {
				const skip = Math.min(this.currentEntry.remainingPadding, chunk.length - offset);
				this.currentEntry.remainingPadding -= skip;
				offset += skip;
				continue;
			}

			this.finalizeCurrentEntry();
		}
	}

	finish(): FileTree {
		if (this.currentEntry && this.currentEntry.remainingContent === 0 && this.currentEntry.remainingPadding === 0) {
			this.finalizeCurrentEntry();
		}

		if (this.currentEntry || this.headerOffset > 0) {
			throw new Error("Corrupted or truncated tar archive.");
		}

		return { files: this.files };
	}

	private parseHeader(header: Uint8Array): TarEntryState {
		let name = decodeNullTerminated(header.subarray(0, 100));
		const prefix = decodeNullTerminated(header.subarray(345, 500));
		if (prefix) {
			name = `${prefix}/${name}`;
		}

		const normalizedPath = normalizeArchivePath(name, "tgz");
		const size = parseTarSize(header.subarray(124, 136));
		const typeFlag = header[156];
		const paddedSize = Math.ceil(size / TAR_BLOCK_SIZE) * TAR_BLOCK_SIZE;

		const isRegularFile = typeFlag === 0 || typeFlag === 48;
		const filterResult = isRegularFile
			? shouldInclude(normalizedPath)
			: ({ include: false, isBinary: false, isMinified: false } as FileFilterResult);

		const shouldCapture =
			isRegularFile &&
			filterResult.include &&
			!filterResult.isBinary &&
			normalizedPath.length > 0 &&
			!normalizedPath.endsWith("/") &&
			(dev || size <= MAX_FILE_SIZE) &&
			(dev || this.files.size < MAX_FILES);

		if (shouldCapture) {
			this.includedSize += size;
			if (!dev && this.includedSize > MAX_DECOMPRESSED_SIZE) {
				throw new Error(
					`Package has too much text content (${Math.round(this.includedSize / 1024 / 1024)}MB). Maximum supported size is ${MAX_DECOMPRESSED_SIZE / 1024 / 1024}MB.`,
				);
			}
		}

		return {
			path: normalizedPath,
			size,
			isMinified: filterResult.isMinified,
			capture: shouldCapture,
			captureBuffer: shouldCapture ? new Uint8Array(size) : null,
			captureOffset: 0,
			remainingContent: size,
			remainingPadding: paddedSize - size,
		};
	}

	private finalizeCurrentEntry(): void {
		const entry = this.currentEntry;
		if (!entry) return;

		if (entry.capture && entry.captureBuffer && !isBinaryContent(entry.captureBuffer)) {
			this.files.set(entry.path, {
				path: entry.path,
				content: textDecoder.decode(entry.captureBuffer),
				isBinary: false,
				isMinified: entry.isMinified,
				size: entry.size,
			});
		}

		this.currentEntry = null;
	}
}

async function readResponseBytes(response: Response, maxBytes: number): Promise<Uint8Array> {
	if (!response.body) {
		const buffer = await response.arrayBuffer();
		if (!dev && buffer.byteLength > maxBytes) {
			throw new Error(
				`Package too large (${Math.round(buffer.byteLength / 1024 / 1024)}MB). Maximum supported size is ${maxBytes / 1024 / 1024}MB.`,
			);
		}
		return new Uint8Array(buffer);
	}

	const chunks: Uint8Array[] = [];
	let totalBytes = 0;
	const reader = response.body.getReader();

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			totalBytes += value.byteLength;
			if (!dev && totalBytes > maxBytes) {
				throw new Error(
					`Package too large (${Math.round(totalBytes / 1024 / 1024)}MB). Maximum supported size is ${maxBytes / 1024 / 1024}MB.`,
				);
			}

			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}

	const result = new Uint8Array(totalBytes);
	let offset = 0;
	for (const chunk of chunks) {
		result.set(chunk, offset);
		offset += chunk.byteLength;
	}
	chunks.length = 0;

	return result;
}

function decodeNullTerminated(bytes: Uint8Array): string {
	const nullIndex = bytes.indexOf(0);
	return textDecoder.decode(nullIndex >= 0 ? bytes.subarray(0, nullIndex) : bytes);
}

function parseTarSize(sizeBytes: Uint8Array): number {
	const sizeStr = decodeNullTerminated(sizeBytes).trim();
	if (!sizeStr) return 0;
	const size = parseInt(sizeStr, 8);
	if (Number.isNaN(size)) {
		throw new Error(`Invalid tar header: corrupt size field "${sizeStr}"`);
	}
	return size;
}

function isZeroBlock(block: Uint8Array): boolean {
	for (let i = 0; i < block.length; i++) {
		if (block[i] !== 0) {
			return false;
		}
	}
	return true;
}
