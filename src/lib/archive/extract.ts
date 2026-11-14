import { Gunzip, Unzip, UnzipInflate } from "fflate";
import { AppError } from "#lib/errors.js";
import { classifyPath } from "./filters.js";
import type { ArchiveLimits } from "./limits.js";
import { normalizeArchivePath, stripCommonRoot } from "./path.js";

export type ArchiveFormat = "tgz" | "zip";

/**
 * `binary` and `too-large` entries keep only what change detection needs.
 * `digest` is null when the bytes were deliberately never decompressed (zip).
 */
export type ArchiveEntry =
	| { kind: "text"; size: number; content: string }
	| { kind: "binary" | "too-large"; size: number; digest: string | null };

export type ArchiveFiles = Map<string, ArchiveEntry>;

type ProgressCallback = (loaded: number, total: number | null) => void;

const TAR_BLOCK = 512;
const BINARY_SNIFF_BYTES = 8000;
const MB = 1024 * 1024;

function limitError(what: string, actual: number, max: number): AppError {
	return new AppError(
		`Package ${what} (${Math.ceil(actual / MB)} MB) exceeds the ${Math.round(max / MB)} MB limit.`,
		"limit",
	);
}

export async function extractArchive(
	response: Response,
	format: ArchiveFormat,
	limits: ArchiveLimits,
	onProgress?: ProgressCallback,
): Promise<ArchiveFiles> {
	const header = Number(response.headers.get("content-length"));
	const total = Number.isFinite(header) && header > 0 ? header : null;
	if (total !== null && limits.archiveSize !== null && total > limits.archiveSize) {
		throw limitError("download", total, limits.archiveSize);
	}
	if (!response.body) throw new AppError("The registry returned an empty download.");

	const collector = new EntryCollector(limits);
	const decoder = format === "tgz" ? new TgzDecoder(collector) : new ZipDecoder(collector);
	const reader = response.body.getReader();
	let loaded = 0;

	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			loaded += value.byteLength;
			if (limits.archiveSize !== null && loaded > limits.archiveSize) {
				throw limitError("download", loaded, limits.archiveSize);
			}
			onProgress?.(loaded, total);
			decoder.push(value);
		}
		decoder.finish();
	} finally {
		reader.cancel().catch(() => {});
	}

	return stripCommonRoot(collector.entries);
}

interface EntrySink {
	/** Returns false when the sink needs no more bytes, so zip can stop inflating. */
	write(chunk: Uint8Array): boolean;
	end(): void;
}

/** Applies path filtering and every size/count limit; decoders only feed it bytes. */
class EntryCollector {
	readonly entries: ArchiveFiles = new Map();
	private decompressed = 0;
	private textFiles = 0;
	private readonly limits: ArchiveLimits;

	constructor(limits: ArchiveLimits) {
		this.limits = limits;
	}

	countDecompressed(bytes: number): void {
		this.decompressed += bytes;
		const max = this.limits.decompressedSize;
		if (max !== null && this.decompressed > max) throw limitError("contents", this.decompressed, max);
	}

	/**
	 * `size` is null when unknown upfront. With `lazy`, entries that will not be
	 * diffed are recorded without reading their bytes.
	 */
	open(rawPath: string, size: number | null, lazy: boolean): EntrySink | null {
		const path = normalizeArchivePath(rawPath);
		if (!path) return null;

		const kind = classifyPath(path);
		if (kind === "exclude") return null;

		const { fileSize } = this.limits;
		const opaque =
			kind === "binary" ? "binary" : size !== null && fileSize !== null && size > fileSize ? "too-large" : null;
		if (opaque) {
			if (lazy) {
				this.entries.set(path, { kind: opaque, size: size ?? 0, digest: null });
				return null;
			}
			return new DigestSink((size, digest) => this.entries.set(path, { kind: opaque, size, digest }));
		}

		return new TextSink(fileSize, lazy, (entry) => {
			if (entry.kind === "text") {
				const max = this.limits.fileCount;
				if (max !== null && ++this.textFiles > max) {
					throw new AppError(`Package has more than ${max.toLocaleString()} text files.`, "limit");
				}
			}
			this.entries.set(path, entry);
		});
	}
}

/** 32-bit FNV-1a; with the size it is plenty to tell whether an opaque file changed. */
class DigestSink implements EntrySink {
	private hash = 0x811c9dc5;
	private size = 0;
	private readonly onEnd: (size: number, digest: string) => void;

	constructor(onEnd: (size: number, digest: string) => void) {
		this.onEnd = onEnd;
	}

	write(chunk: Uint8Array): boolean {
		let hash = this.hash;
		for (let i = 0; i < chunk.length; i++) hash = Math.imul(hash ^ chunk[i], 0x01000193);
		this.hash = hash;
		this.size += chunk.length;
		return true;
	}

	end(): void {
		this.onEnd(this.size, (this.hash >>> 0).toString(16));
	}
}

/**
 * Buffers a file expected to be text. It turns into a digest when content
 * sniffing finds NUL bytes or the file outgrows `fileSize`; with `lazy` an
 * oversized file stops reading and is recorded without a digest instead.
 */
class TextSink implements EntrySink {
	private chunks: Uint8Array[] = [];
	private size = 0;
	private nulls = 0;
	private fallback: DigestSink | null = null;
	private stopped: ArchiveEntry | null = null;
	private readonly maxSize: number | null;
	private readonly lazy: boolean;
	private readonly onEnd: (entry: ArchiveEntry) => void;

	constructor(maxSize: number | null, lazy: boolean, onEnd: (entry: ArchiveEntry) => void) {
		this.maxSize = maxSize;
		this.lazy = lazy;
		this.onEnd = onEnd;
	}

	write(chunk: Uint8Array): boolean {
		if (this.stopped) return false;
		if (this.fallback) return this.fallback.write(chunk);

		for (let i = this.size; i < BINARY_SNIFF_BYTES && i - this.size < chunk.length; i++) {
			if (chunk[i - this.size] === 0) this.nulls++;
		}
		this.chunks.push(chunk);
		this.size += chunk.length;

		const binary = this.nulls > 1;
		const tooLarge = this.maxSize !== null && this.size > this.maxSize;
		if (!binary && !tooLarge) return true;

		const kind = binary ? "binary" : "too-large";
		if (!binary && this.lazy) {
			this.stopped = { kind, size: this.size, digest: null };
			this.chunks = [];
			return false;
		}
		this.fallback = new DigestSink((size, digest) => this.onEnd({ kind, size, digest }));
		for (const buffered of this.chunks) this.fallback.write(buffered);
		this.chunks = [];
		return true;
	}

	end(): void {
		if (this.stopped) return this.onEnd(this.stopped);
		if (this.fallback) return this.fallback.end();

		const bytes = concat(this.chunks);
		this.chunks = [];
		this.onEnd({ kind: "text", size: this.size, content: new TextDecoder().decode(bytes) });
	}
}

interface TarEntry {
	sink: EntrySink | null;
	remaining: number;
	padding: number;
	/** Collects PAX (`x`) or GNU long-name (`L`) records that rename the next entry. */
	meta: "pax" | "longname" | null;
	metaChunks: Uint8Array[];
}

class TgzDecoder {
	private readonly gunzip = new Gunzip();
	private readonly header = new Uint8Array(TAR_BLOCK);
	private headerFill = 0;
	private entry: TarEntry | null = null;
	private nextPath: string | null = null;
	private ended = false;
	private readonly collector: EntryCollector;

	constructor(collector: EntryCollector) {
		this.collector = collector;
		this.gunzip.ondata = (chunk) => {
			this.collector.countDecompressed(chunk.length);
			this.consume(chunk);
		};
	}

	push(chunk: Uint8Array): void {
		this.gunzip.push(chunk);
	}

	finish(): void {
		this.gunzip.push(new Uint8Array(0), true);
		if (this.entry && this.entry.remaining === 0 && this.entry.padding === 0) this.closeEntry();
		if (!this.ended && (this.entry || this.headerFill > 0)) {
			throw new AppError("The package archive is truncated or corrupted.");
		}
	}

	private consume(chunk: Uint8Array): void {
		let offset = 0;
		while (offset < chunk.length && !this.ended) {
			const entry = this.entry;
			if (!entry) {
				const take = Math.min(TAR_BLOCK - this.headerFill, chunk.length - offset);
				this.header.set(chunk.subarray(offset, offset + take), this.headerFill);
				this.headerFill += take;
				offset += take;
				if (this.headerFill === TAR_BLOCK) {
					this.headerFill = 0;
					this.openEntry();
				}
				continue;
			}

			if (entry.remaining > 0) {
				const take = Math.min(entry.remaining, chunk.length - offset);
				const data = chunk.subarray(offset, offset + take);
				if (entry.meta) entry.metaChunks.push(data.slice());
				else entry.sink?.write(data);
				entry.remaining -= take;
				offset += take;
			} else {
				const skip = Math.min(entry.padding, chunk.length - offset);
				entry.padding -= skip;
				offset += skip;
			}

			if (entry.remaining === 0 && entry.padding === 0) this.closeEntry();
		}
	}

	private openEntry(): void {
		const header = this.header;
		if (header.every((byte) => byte === 0)) {
			this.ended = true;
			return;
		}

		const size = parseTarSize(header.subarray(124, 136));
		const type = String.fromCharCode(header[156] || 48);
		const entry: TarEntry = {
			sink: null,
			remaining: size,
			padding: (TAR_BLOCK - (size % TAR_BLOCK)) % TAR_BLOCK,
			meta: type === "x" ? "pax" : type === "L" ? "longname" : null,
			metaChunks: [],
		};

		if (type === "0" || type === "7") {
			let path = this.nextPath;
			if (path === null) {
				path = readString(header, 0, 100);
				// The ustar prefix field holds the leading directories of long paths.
				if (readString(header, 257, 6) === "ustar") {
					const prefix = readString(header, 345, 155);
					if (prefix) path = `${prefix}/${path}`;
				}
			}
			entry.sink = this.collector.open(path, size, false);
		}
		if (!entry.meta) this.nextPath = null;

		this.entry = entry;
		if (size === 0 && entry.padding === 0) this.closeEntry();
	}

	private closeEntry(): void {
		const entry = this.entry!;
		this.entry = null;
		if (entry.meta === "longname") {
			this.nextPath = new TextDecoder().decode(concat(entry.metaChunks)).replace(/\0.*$/s, "");
		} else if (entry.meta === "pax") {
			// Records look like `<length> path=<value>\n`.
			const records = new TextDecoder().decode(concat(entry.metaChunks));
			this.nextPath = records.match(/^\d+ path=(.*)$/m)?.[1] ?? this.nextPath;
		} else {
			entry.sink?.end();
		}
	}
}

class ZipDecoder {
	private readonly unzip: Unzip;
	private error: unknown = null;
	private readonly collector: EntryCollector;

	constructor(collector: EntryCollector) {
		this.collector = collector;
		this.unzip = new Unzip((file) => {
			if (this.error || file.name.endsWith("/")) return;
			const sink = this.collector.open(file.name, file.originalSize ?? null, true);
			if (!sink) return;

			file.ondata = (error, chunk, final) => {
				try {
					if (error) throw error;
					this.collector.countDecompressed(chunk.length);
					if (!sink.write(chunk) && !final) {
						file.terminate();
						sink.end();
						return;
					}
					if (final) sink.end();
				} catch (caught) {
					this.error ??= caught;
					file.terminate();
				}
			};
			file.start();
		});
		this.unzip.register(UnzipInflate);
	}

	push(chunk: Uint8Array): void {
		this.unzip.push(chunk);
		if (this.error) throw this.error;
	}

	finish(): void {
		this.unzip.push(new Uint8Array(0), true);
		if (this.error) throw this.error;
	}
}

function readString(bytes: Uint8Array, start: number, length: number): string {
	const field = bytes.subarray(start, start + length);
	const end = field.indexOf(0);
	return new TextDecoder().decode(end === -1 ? field : field.subarray(0, end));
}

function parseTarSize(field: Uint8Array): number {
	// GNU base-256 encoding for sizes that do not fit 11 octal digits.
	if (field[0] & 0x80) {
		let size = field[0] & 0x7f;
		for (let i = 1; i < field.length; i++) size = size * 256 + field[i];
		return size;
	}
	const text = readString(field, 0, field.length).trim();
	const size = text ? Number.parseInt(text, 8) : 0;
	if (Number.isNaN(size)) throw new AppError("The package archive has a corrupted entry.");
	return size;
}

function concat(chunks: Uint8Array[]): Uint8Array {
	const out = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
	let offset = 0;
	for (const chunk of chunks) {
		out.set(chunk, offset);
		offset += chunk.length;
	}
	return out;
}
