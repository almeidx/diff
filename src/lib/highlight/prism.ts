import Prism from "prismjs";
import loadLanguages from "prismjs/components/index.js";

Prism.manual = true;
loadLanguages([
	"typescript",
	"javascript",
	"jsx",
	"tsx",
	"css",
	"scss",
	"json",
	"markdown",
	"yaml",
	"php",
	"sql",
	"docker",
	"ini",
	"handlebars",
]);

const HIGHLIGHT_CACHE_LIMIT = 2000;
const MAX_CACHED_CODE_LENGTH = 1200;
const highlightCache = new Map<string, string>();

const extToLang: Record<string, string> = {
	ts: "typescript",
	mts: "typescript",
	cts: "typescript",
	tsx: "tsx",
	js: "javascript",
	mjs: "javascript",
	cjs: "javascript",
	jsx: "jsx",
	css: "css",
	scss: "scss",
	sass: "scss",
	json: "json",
	md: "markdown",
	mdx: "markdown",
	yml: "yaml",
	yaml: "yaml",
	php: "php",
	sql: "sql",
	dockerfile: "docker",
	ini: "ini",
	conf: "ini",
	cfg: "ini",
	hbs: "handlebars",
	handlebars: "handlebars",
	html: "markup",
	htm: "markup",
	xml: "markup",
	svg: "markup",
};

export function getLanguage(filePath: string): string | null {
	const ext = filePath.split(".").pop()?.toLowerCase();
	if (!ext) return null;

	const basename = filePath.split("/").pop()?.toLowerCase() ?? "";
	if (basename === "dockerfile") return "docker";

	return extToLang[ext] ?? null;
}

export function highlight(code: string, language: string): string {
	const grammar = Prism.languages[language];
	if (!grammar) return escapeHtml(code);

	if (code.length > MAX_CACHED_CODE_LENGTH) {
		return sanitizePrismOutput(Prism.highlight(code, grammar, language));
	}

	const cacheKey = `${language}\0${code}`;
	const cached = highlightCache.get(cacheKey);
	if (cached !== undefined) {
		highlightCache.delete(cacheKey);
		highlightCache.set(cacheKey, cached);
		return cached;
	}

	const highlighted = sanitizePrismOutput(Prism.highlight(code, grammar, language));
	highlightCache.set(cacheKey, highlighted);

	if (highlightCache.size > HIGHLIGHT_CACHE_LIMIT) {
		const oldestKey = highlightCache.keys().next().value;
		if (oldestKey !== undefined) {
			highlightCache.delete(oldestKey);
		}
	}

	return highlighted;
}

const ALLOWED_TAG = /^<\/?span(?:\s+class="token [a-z0-9 -]+")?>/;

function sanitizePrismOutput(html: string): string {
	return html.replace(/<\/?[a-z][^>]*>/gi, (tag) => (ALLOWED_TAG.test(tag) ? tag : escapeHtml(tag)));
}

const HTML_ESCAPE_MAP: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#039;",
};

function escapeHtml(text: string): string {
	return text.replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch]);
}
