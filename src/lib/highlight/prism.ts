import Prism from "prismjs";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-css";
import "prismjs/components/prism-scss";
import "prismjs/components/prism-json";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-php";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-docker";
import "prismjs/components/prism-ini";
import "prismjs/components/prism-markup-templating";
import "prismjs/components/prism-handlebars";

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
		return Prism.highlight(code, grammar, language);
	}

	const cacheKey = `${language}\0${code}`;
	const cached = highlightCache.get(cacheKey);
	if (cached !== undefined) {
		highlightCache.delete(cacheKey);
		highlightCache.set(cacheKey, cached);
		return cached;
	}

	const highlighted = Prism.highlight(code, grammar, language);
	highlightCache.set(cacheKey, highlighted);

	if (highlightCache.size > HIGHLIGHT_CACHE_LIMIT) {
		const oldestKey = highlightCache.keys().next().value;
		if (oldestKey !== undefined) {
			highlightCache.delete(oldestKey);
		}
	}

	return highlighted;
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}
