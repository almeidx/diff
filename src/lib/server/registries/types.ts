export interface Registry {
	getVersions(packageName: string): Promise<string[]>;
	getDownloadUrl(packageName: string, version: string): Promise<string>;
	validateVersion(packageName: string, version: string): Promise<boolean>;
}

export interface NpmPackageMetadata {
	name: string;
	versions: Record<string, NpmVersionMetadata>;
	'dist-tags': Record<string, string>;
	repository?: { url: string; type?: string } | string;
}

export interface NpmVersionMetadata {
	version: string;
	dist: {
		tarball: string;
		shasum: string;
	};
}

export interface WordPressPluginInfo {
	name: string;
	slug: string;
	version: string;
	versions: Record<string, string>;
}
