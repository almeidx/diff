const EXCLUDED_DIRS = new Set([
	'node_modules',
	'vendor',
	'.git',
	'.svn',
	'.hg',
	'bower_components',
	'.idea',
	'.vscode',
	'__pycache__',
	'.cache'
]);

const EXCLUDED_FILES = new Set([
	'package-lock.json',
	'yarn.lock',
	'pnpm-lock.yaml',
	'composer.lock',
	'Gemfile.lock',
	'poetry.lock',
	'flake.lock',
	'Cargo.lock',
	'mix.lock',
	'pubspec.lock',
	'Podfile.lock',
	'.DS_Store',
	'Thumbs.db'
]);


const BINARY_EXTENSIONS = new Set([
	'png',
	'jpg',
	'jpeg',
	'gif',
	'ico',
	'webp',
	'avif',
	'svg',
	'bmp',
	'tiff',
	'woff',
	'woff2',
	'ttf',
	'eot',
	'otf',
	'pdf',
	'zip',
	'tar',
	'gz',
	'rar',
	'7z',
	'exe',
	'dll',
	'so',
	'dylib',
	'bin',
	'dat',
	'db',
	'sqlite',
	'mp3',
	'mp4',
	'wav',
	'ogg',
	'webm',
	'avi',
	'mov',
	'flv',
	'swf',
	'psd',
	'ai',
	'eps',
	'class',
	'jar',
	'war',
	'pyc',
	'pyo',
	'o',
	'a',
	'lib',
	'obj'
]);

const MINIFIED_PATTERNS = [
	/\.min\.(js|css)$/,
	/\.bundle\.js$/,
	/-min\.js$/,
	/\.prod\.js$/,
	/\.(js|mjs|cjs|ts|mts|cts|css)\.map$/,
];

export interface FilterResult {
	include: boolean;
	isBinary: boolean;
	isMinified: boolean;
}

export function shouldInclude(path: string): FilterResult {
	const parts = path.split('/');
	const fileName = parts[parts.length - 1];
	const extension = fileName.split('.').pop()?.toLowerCase() || '';

	for (const part of parts) {
		if (EXCLUDED_DIRS.has(part)) {
			return { include: false, isBinary: false, isMinified: false };
		}
	}

	if (EXCLUDED_FILES.has(fileName)) {
		return { include: false, isBinary: false, isMinified: false };
	}

	const isBinary = BINARY_EXTENSIONS.has(extension);
	const isMinified = MINIFIED_PATTERNS.some((pattern) => pattern.test(fileName));

	return { include: true, isBinary, isMinified };
}

export function isBinaryContent(content: Uint8Array): boolean {
	const checkLength = Math.min(content.length, 8000);
	let nullCount = 0;

	for (let i = 0; i < checkLength; i++) {
		if (content[i] === 0) {
			nullCount++;
			if (nullCount > 1) return true;
		}
	}

	return false;
}

export function detectLanguage(path: string): string | null {
	const extension = path.split('.').pop()?.toLowerCase();

	const languageMap: Record<string, string> = {
		js: 'javascript',
		mjs: 'javascript',
		cjs: 'javascript',
		jsx: 'jsx',
		ts: 'typescript',
		tsx: 'tsx',
		mts: 'typescript',
		cts: 'typescript',
		json: 'json',
		php: 'php',
		css: 'css',
		scss: 'scss',
		sass: 'sass',
		less: 'less',
		html: 'html',
		htm: 'html',
		xml: 'xml',
		svg: 'xml',
		md: 'markdown',
		mdx: 'mdx',
		yaml: 'yaml',
		yml: 'yaml',
		toml: 'toml',
		ini: 'ini',
		sh: 'bash',
		bash: 'bash',
		zsh: 'bash',
		py: 'python',
		rb: 'ruby',
		go: 'go',
		rs: 'rust',
		java: 'java',
		kt: 'kotlin',
		swift: 'swift',
		c: 'c',
		cpp: 'cpp',
		cc: 'cpp',
		h: 'c',
		hpp: 'cpp',
		cs: 'csharp',
		sql: 'sql',
		vue: 'vue',
		svelte: 'svelte'
	};

	return extension ? (languageMap[extension] ?? null) : null;
}
