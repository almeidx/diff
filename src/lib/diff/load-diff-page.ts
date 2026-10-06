import type { PackageType, DiffResult, DiffError, FileTree, CompareProgress } from "#lib/types/index.js";
import type { Registry } from "#lib/registries/types.js";
import { fetchAndExtract } from "#lib/archive/extractor.js";
import { formatInvalidVersionError } from "#lib/utils/versions.js";
import { computeDiff } from "./engine.js";
import { getErrorMessage } from "#lib/errors.js";

export interface LoadDiffPageOptions {
	registry: Registry;
	packageType: PackageType;
	packageName: string;
	fromVersion: string;
	toVersion: string;
	archiveFormat: "tgz" | "zip";
	/** Optional observer for the extracted trees, used by the compare pipeline to keep file contents available. */
	onTrees?: (fromTree: FileTree, toTree: FileTree) => void;
	/** Optional progress observer for pipeline stages (metadata, downloads, diff). */
	onProgress?: (progress: CompareProgress) => void;
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
	const { registry, packageType, packageName, fromVersion, toVersion, archiveFormat, onTrees, onProgress } = options;
	onProgress?.({ stage: "metadata" });
	const versions = await registry.getVersions(packageName);
	onProgress?.({ stage: "metadata", done: true });
	const availableVersions = new Set(versions);
	const fromValid = availableVersions.has(fromVersion);
	const toValid = availableVersions.has(toVersion);

	if (!fromValid || !toValid) {
		return {
			error: {
				type: "invalid_version",
				message: formatInvalidVersionError(fromVersion, toVersion, fromValid, toValid),
				availableVersions: versions,
			},
			versions,
		};
	}

	try {
		const [fromUrl, toUrl] = await Promise.all([
			registry.getDownloadUrl(packageName, fromVersion),
			registry.getDownloadUrl(packageName, toVersion),
		]);

		const fromTreePromise = fetchAndExtract(fromUrl, archiveFormat, (bytes, totalBytes) => {
			onProgress?.({ stage: "download", side: "from", bytes, totalBytes });
		}).then((tree) => {
			onProgress?.({ stage: "download", side: "from", done: true });
			return tree;
		});
		const toTreePromise = fetchAndExtract(toUrl, archiveFormat, (bytes, totalBytes) => {
			onProgress?.({ stage: "download", side: "to", bytes, totalBytes });
		}).then((tree) => {
			onProgress?.({ stage: "download", side: "to", done: true });
			return tree;
		});
		const [fromTree, toTree] = await Promise.all([fromTreePromise, toTreePromise]);

		onProgress?.({ stage: "diff" });
		const diff = computeDiff(fromTree, toTree, packageType, packageName, fromVersion, toVersion);
		onTrees?.(fromTree, toTree);

		return { diff, versions };
	} catch (e) {
		return {
			error: {
				type: "fetch_error",
				message: getErrorMessage(e, "Failed to compute diff"),
			},
			versions,
		};
	}
}
