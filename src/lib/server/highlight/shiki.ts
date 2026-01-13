import { createHighlighter, type Highlighter, type BundledLanguage } from 'shiki';
import { detectLanguage } from '../diff/filters.js';

let highlighterPromise: Promise<Highlighter> | null = null;

const SUPPORTED_LANGUAGES: BundledLanguage[] = [
	'javascript',
	'typescript',
	'jsx',
	'tsx',
	'json',
	'php',
	'css',
	'scss',
	'html',
	'xml',
	'markdown',
	'yaml',
	'toml',
	'bash',
	'python',
	'ruby',
	'go',
	'rust',
	'java',
	'kotlin',
	'swift',
	'c',
	'cpp',
	'csharp',
	'sql',
	'vue',
	'svelte'
];

async function getHighlighter(): Promise<Highlighter> {
	if (!highlighterPromise) {
		highlighterPromise = createHighlighter({
			themes: ['github-dark', 'github-light'],
			langs: SUPPORTED_LANGUAGES
		});
	}
	return highlighterPromise;
}

export interface HighlightedLine {
	content: string;
	html: string;
}

export async function highlightCode(
	code: string,
	filePath: string,
	theme: 'light' | 'dark' = 'dark'
): Promise<string> {
	const highlighter = await getHighlighter();
	const lang = detectLanguage(filePath);

	const themeName = theme === 'dark' ? 'github-dark' : 'github-light';

	if (!lang || !SUPPORTED_LANGUAGES.includes(lang as BundledLanguage)) {
		return escapeHtml(code);
	}

	try {
		return highlighter.codeToHtml(code, {
			lang: lang as BundledLanguage,
			theme: themeName
		});
	} catch {
		return escapeHtml(code);
	}
}

export async function highlightLines(
	lines: string[],
	filePath: string,
	theme: 'light' | 'dark' = 'dark'
): Promise<string[]> {
	const highlighter = await getHighlighter();
	const lang = detectLanguage(filePath);
	const themeName = theme === 'dark' ? 'github-dark' : 'github-light';

	if (!lang || !SUPPORTED_LANGUAGES.includes(lang as BundledLanguage)) {
		return lines.map(escapeHtml);
	}

	try {
		const code = lines.join('\n');
		const tokens = highlighter.codeToTokensBase(code, {
			lang: lang as BundledLanguage,
			theme: themeName
		});

		return tokens.map((lineTokens) => {
			return lineTokens
				.map((token) => {
					const escaped = escapeHtml(token.content);
					if (token.color) {
						return `<span style="color:${token.color}">${escaped}</span>`;
					}
					return escaped;
				})
				.join('');
		});
	} catch {
		return lines.map(escapeHtml);
	}
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

export async function highlightDiffResult(
	diff: import('$lib/types/index.js').DiffResult
): Promise<void> {
	let highlighter;
	try {
		highlighter = await getHighlighter();
	} catch {
		return;
	}

	for (const file of diff.files) {
		if (file.isBinary || file.hunks.length === 0) continue;

		const lang = detectLanguage(file.path);
		if (!lang || !SUPPORTED_LANGUAGES.includes(lang as BundledLanguage)) {
			for (const hunk of file.hunks) {
				for (const line of hunk.lines) {
					line.highlightedContent = escapeHtml(line.content);
				}
			}
			continue;
		}

		const allLines: string[] = [];
		const lineIndices: { hunkIdx: number; lineIdx: number }[] = [];

		for (let hunkIdx = 0; hunkIdx < file.hunks.length; hunkIdx++) {
			const hunk = file.hunks[hunkIdx];
			for (let lineIdx = 0; lineIdx < hunk.lines.length; lineIdx++) {
				allLines.push(hunk.lines[lineIdx].content);
				lineIndices.push({ hunkIdx, lineIdx });
			}
		}

		try {
			const code = allLines.join('\n');
			const tokens = highlighter.codeToTokensBase(code, {
				lang: lang as BundledLanguage,
				theme: 'github-dark'
			});

			for (let i = 0; i < tokens.length && i < lineIndices.length; i++) {
				const { hunkIdx, lineIdx } = lineIndices[i];
				const lineTokens = tokens[i];
				const highlighted = lineTokens
					.map((token) => {
						const escaped = escapeHtml(token.content);
						if (token.color) {
							return `<span style="color:${token.color}">${escaped}</span>`;
						}
						return escaped;
					})
					.join('');
				file.hunks[hunkIdx].lines[lineIdx].highlightedContent = highlighted;
			}
		} catch {
			for (const hunk of file.hunks) {
				for (const line of hunk.lines) {
					line.highlightedContent = escapeHtml(line.content);
				}
			}
		}
	}
}

export { detectLanguage };
