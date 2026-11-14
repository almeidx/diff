const EXCLUDED_DIRS = new Set([
	"node_modules",
	"vendor",
	".git",
	".svn",
	".hg",
	"bower_components",
	".idea",
	".vscode",
	"__pycache__",
	".cache",
]);

const EXCLUDED_FILES = new Set([
	"package-lock.json",
	"yarn.lock",
	"pnpm-lock.yaml",
	"composer.lock",
	"Gemfile.lock",
	"poetry.lock",
	"flake.lock",
	"Cargo.lock",
	"mix.lock",
	"pubspec.lock",
	"Podfile.lock",
	".DS_Store",
	"Thumbs.db",
]);

const BINARY_EXTENSIONS = new Set([
	"png",
	"jpg",
	"jpeg",
	"gif",
	"ico",
	"webp",
	"avif",

	"bmp",
	"tiff",
	"woff",
	"woff2",
	"ttf",
	"eot",
	"otf",
	"pdf",
	"zip",
	"tar",
	"gz",
	"rar",
	"7z",
	"exe",
	"dll",
	"so",
	"dylib",
	"bin",
	"dat",
	"db",
	"sqlite",
	"mp3",
	"mp4",
	"wav",
	"ogg",
	"webm",
	"avi",
	"mov",
	"flv",
	"swf",
	"psd",
	"ai",
	"eps",
	"class",
	"jar",
	"war",
	"pyc",
	"pyo",
	"o",
	"a",
	"lib",
	"obj",
]);

const MINIFIED_PATTERNS = [
	/\.min\.(js|css)$/,
	/\.bundle\.js$/,
	/-min\.js$/,
	/\.prod\.js$/,
	/\.(js|mjs|cjs|ts|mts|cts|css)\.map$/,
];

/**
 * `exclude`: dependency folders, VCS metadata and lockfiles are noise in a
 * package diff and are never read. `binary`: tracked by size/digest only.
 */
export function classifyPath(path: string): "exclude" | "binary" | "text" {
	const parts = path.split("/");
	const fileName = parts[parts.length - 1];

	if (EXCLUDED_FILES.has(fileName) || parts.some((part) => EXCLUDED_DIRS.has(part))) return "exclude";

	const dot = fileName.lastIndexOf(".");
	return dot > 0 && BINARY_EXTENSIONS.has(fileName.slice(dot + 1).toLowerCase()) ? "binary" : "text";
}

/** Generated files whose diffs are rarely readable; the viewer collapses them by default. */
export function isMinifiedPath(path: string): boolean {
	const fileName = path.slice(path.lastIndexOf("/") + 1);
	return MINIFIED_PATTERNS.some((pattern) => pattern.test(fileName));
}

/** Bundles without a telltale name: long text whose lines average hundreds of characters. */
export function looksMinified(content: string): boolean {
	if (content.length < 2_000) return false;
	let lines = 1;
	for (let i = content.indexOf("\n"); i !== -1; i = content.indexOf("\n", i + 1)) lines++;
	return content.length / lines > 250;
}
