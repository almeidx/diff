import { canUseWASM } from "@pierre/diffs";
import { getOrCreateWorkerPoolSingleton } from "@pierre/diffs/worker";
import highlightWorkerUrl from "@pierre/diffs/worker/worker.js?worker&url";

export const DIFF_THEMES = { dark: "pierre-dark", light: "pierre-light" } as const;

/** Highlights (WASM) is fastest; CSPs or engines without WASM SIMD fall back to Shiki's JS engine. */
export const preferredHighlighter = canUseWASM() ? "highlights" : "shiki-js";

/**
 * Syntax highlighting off the main thread for large files. With Highlights,
 * small files skip the worker round trip and render highlighted immediately.
 */
export function getHighlightPool() {
	const mobile = matchMedia("(pointer: coarse)").matches;
	return getOrCreateWorkerPoolSingleton({
		poolOptions: {
			workerFactory: () => new Worker(highlightWorkerUrl, { type: "module", name: "highlight" }),
			poolSize: mobile ? 1 : Math.min(Math.max(1, navigator.hardwareConcurrency - 1), 3),
			totalASTLRUCacheSize: mobile ? 10 : 100,
			mainThreadMaxCharacters: preferredHighlighter === "highlights" ? 100_000 : undefined,
		},
		highlighterOptions: { theme: DIFF_THEMES, preferredHighlighter },
	});
}
