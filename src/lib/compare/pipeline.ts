import { extractArchive, type ArchiveEntry, type ArchiveFiles } from "#lib/archive/extract.js";
import { DEFAULT_LIMITS, NO_LIMITS } from "#lib/archive/limits.js";
import { AppError } from "#lib/errors.js";
import { upstreamFetch } from "#lib/http.js";
import { getPackage, type PackageVersion, type Registry } from "#lib/registries/index.js";
import { diffFile, listChanges, type DiffItem } from "./diff.js";
import type { CompareEvent, CompareRequest, Side } from "./protocol.js";

/** Batches diffs so the UI receives a few messages per frame, not one per file. */
const BATCH_INTERVAL_MS = 32;
const PROGRESS_INTERVAL_MS = 50;

export async function runCompare(
	registry: Registry,
	request: CompareRequest,
	emit: (event: CompareEvent) => void,
	signal: AbortSignal,
): Promise<void> {
	const { name, from, to } = request;
	const info = await getPackage(registry, name);
	emit({ type: "package", info });

	const versions = new Map(info.versions.map((entry) => [entry.version, entry]));
	const missing = [from, to].filter((version) => !versions.has(version));
	if (missing.length > 0) {
		throw new AppError(`Version ${missing.join(" and ")} of "${name}" does not exist.`, "not-found");
	}

	const limits = request.unlimited ? NO_LIMITS : DEFAULT_LIMITS;
	// One failed side fails the compare, so the other side's download is wasted.
	const downloads = new AbortController();
	const downloadSignal = AbortSignal.any([signal, downloads.signal]);
	const download = async (side: Side, version: PackageVersion): Promise<ArchiveFiles> => {
		const response = await upstreamFetch(version.downloadUrl, {
			hosts: registry.hosts,
			signal: downloadSignal,
			timeoutMs: null,
		});
		if (!response.ok) throw new AppError(`Downloading ${version.version} failed with status ${response.status}.`);

		let loaded = 0;
		let total: number | null = null;
		let reportedAt = 0;
		const files = await extractArchive(response, registry.archiveFormat, limits, (bytes, size) => {
			loaded = bytes;
			total = size;
			const now = performance.now();
			if (now - reportedAt < PROGRESS_INTERVAL_MS) return;
			reportedAt = now;
			emit({ type: "download", side, loaded, total, done: false });
		});
		emit({ type: "download", side, loaded, total, done: true });
		return files;
	};
	const [before, after] = await Promise.all([
		download("from", versions.get(from)!),
		download("to", versions.get(to)!),
	]).catch((error: unknown) => {
		downloads.abort(error);
		throw error;
	});

	const changes = listChanges(before, after);
	emit({ type: "files", files: changes });

	// Keep only the entries still to be diffed: unchanged files (usually most of a
	// release) become collectable now, and each changed pair right after its diff.
	const pending: Array<[ArchiveEntry | undefined, ArchiveEntry | undefined] | undefined> = changes.map((change) => [
		before.get(change.path),
		after.get(change.path),
	]);
	before.clear();
	after.clear();

	const cachePrefix = `${registry.id}/${name}@${from}...${to}:`;
	let batch: DiffItem[] = [];
	let flushedAt = performance.now();
	for (let i = 0; i < changes.length; i++) {
		signal.throwIfAborted();
		const [old, next] = pending[i]!;
		pending[i] = undefined;
		batch.push(diffFile(changes[i], old, next, cachePrefix + changes[i].path));

		const last = i === changes.length - 1;
		if (last || performance.now() - flushedAt >= BATCH_INTERVAL_MS) {
			emit({ type: "diffs", items: batch, completed: i + 1 });
			batch = [];
			// Let a pending cancel message run before the next batch.
			if (!last) {
				const { promise, resolve } = Promise.withResolvers<void>();
				setTimeout(resolve, 0);
				await promise;
			}
			flushedAt = performance.now();
		}
	}
}
