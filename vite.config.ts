import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { registries } from "./src/lib/registries/index.ts";

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			preprocess: vitePreprocess(),
			paths: {
				relative: false,
			},
			adapter: adapter({
				fallback: "404.html",
			}),
			csp: {
				mode: "auto",
				directives: {
					"default-src": ["self"],
					"base-uri": ["self"],
					"object-src": ["none"],
					"form-action": ["self"],
					// The Highlights syntax highlighter compiles WebAssembly.
					"script-src": ["self", "wasm-unsafe-eval"],
					"style-src": ["self", "unsafe-inline"],
					"img-src": ["self", "data:"],
					"font-src": ["self", "data:"],
					"connect-src": [
						"self",
						...registries.flatMap((registry) =>
							registry.hosts.map((host) => `https://${host}` as `https://${string}.${string}`),
						),
					],
				},
			},
		}),
	],
	worker: {
		format: "es",
	},
	build: {
		target: "esnext",
	},
});
