import type { PackageType } from "$lib/types/index.js";
import type { Registry } from "$lib/server/registries/types.js";
import { fetchAndExtract } from "$lib/server/archive/extractor";
import { getCached } from "$lib/server/cache";
import { logInfo } from "$lib/server/log.js";

const FILE_CONTENTS_CACHE_TTL = 86400; // 24 hours (versions are immutable)

export interface FileContentsPair {
	oldContents: string;
	newContents: string;
}

interface LoadFileContentsOptions {
	registry: Registry;
	packageType: PackageType;
	packageName: string;
	fromVersion: string;
	toVersion: string;
	archiveFormat: "tgz" | "zip";
	path: string;
	waitUntil?: (promise: Promise<unknown>) => void;
}

/**
 * Full contents of one file on both sides of a comparison, used to expand
 * context beyond what the shipped patch carries. Returns null when the file is
 * missing from both versions or is not text.
 */
export async function loadFileContents(options: LoadFileContentsOptions): Promise<FileContentsPair | null> {
	const { registry, packageType, packageName, fromVersion, toVersion, archiveFormat, path, waitUntil } = options;
	const cacheKey = `file:v1:${packageType}:${packageName}:${fromVersion}:${toVersion}:${path}`;
	const startedAt = Date.now();

	const contents = await getCached<FileContentsPair | null>(
		cacheKey,
		async () => {
			const [fromUrl, toUrl] = await Promise.all([
				registry.getDownloadUrl(packageName, fromVersion),
				registry.getDownloadUrl(packageName, toVersion),
			]);

			const fromTree = await fetchAndExtract(fromUrl, archiveFormat);
			const toTree = await fetchAndExtract(toUrl, archiveFormat);

			const oldFile = fromTree.files.get(path);
			const newFile = toTree.files.get(path);

			if (!oldFile && !newFile) return null;
			if (oldFile?.isBinary || newFile?.isBinary) return null;

			return {
				oldContents: oldFile?.content ?? "",
				newContents: newFile?.content ?? "",
			};
		},
		{ ttlSeconds: FILE_CONTENTS_CACHE_TTL, waitUntil },
	);

	logInfo("file_contents_loaded", {
		packageType,
		packageName,
		fromVersion,
		toVersion,
		path,
		found: contents !== null,
		durationMs: Date.now() - startedAt,
	});

	return contents;
}
