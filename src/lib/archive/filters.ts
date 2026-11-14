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
