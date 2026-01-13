import { createHighlighter, type Highlighter, type BundledLanguage } from 'shiki';
import { detectLanguage } from '../diff/filters.js';

let highlighterPromise: Promise<Highlighter> | null = null;

const SUPPORTED_LANGUAGES: BundledLanguage[] = [
	'javascript',
	'typescript',
	'json',
	'php',
	'css',
	'html',
	'markdown',
	'yaml',
	'bash'
];

const MAX_FILES_FOR_HIGHLIGHTING = 50;
const MAX_LINES_FOR_HIGHLIGHTING = 5000;

async function getHighlighter(): Promise<Highlighter> {
	if (!highlighterPromise) {
		highlighterPromise = createHighlighter({
			themes: ['github-dark'],
			langs: SUPPORTED_LANGUAGES
		});
	}
	return highlighterPromise;
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
	let totalLines = 0;
	for (const file of diff.files) {
		for (const hunk of file.hunks) {
			totalLines += hunk.lines.length;
		}
	}

	console.log(`[highlight] files=${diff.files.length}, lines=${totalLines}`);

	if (diff.files.length > MAX_FILES_FOR_HIGHLIGHTING || totalLines > MAX_LINES_FOR_HIGHLIGHTING) {
		console.log('[highlight] Skipping: too many files or lines');
		return;
	}

	let highlighter;
	try {
		highlighter = await getHighlighter();
		console.log('[highlight] Highlighter loaded successfully');
	} catch (e) {
		console.error('[highlight] Failed to load syntax highlighter:', e);
		return;
	}

	let highlightedFiles = 0;
	for (const file of diff.files) {
		if (file.isBinary || file.hunks.length === 0) continue;

		const lang = detectLanguage(file.path);
		if (!lang || !SUPPORTED_LANGUAGES.includes(lang as BundledLanguage)) {
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
			highlightedFiles++;
		} catch (e) {
			console.error(`[highlight] Failed to highlight ${file.path}:`, e);
		}
	}
	console.log(`[highlight] Highlighted ${highlightedFiles} files`);
}

export { detectLanguage };
