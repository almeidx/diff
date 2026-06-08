import adapter from "@sveltejs/adapter-cloudflare";
import { sveltekit } from "@sveltejs/kit/vite";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			preprocess: vitePreprocess(),
			adapter: adapter({
				platformProxy: {
					environment: undefined,
					persist: {
						path: "./wrangler-local-state",
					},
				},
			}),
			csp: {
				mode: "auto",
				directives: {
					"default-src": ["self"],
					"base-uri": ["self"],
					"frame-ancestors": ["none"],
					"object-src": ["none"],
					"form-action": ["self"],
					"script-src": ["self"],
					"style-src": ["self", "unsafe-inline"],
					"img-src": ["self", "data:"],
					"font-src": ["self", "data:"],
					"connect-src": [
						"self",
						"https://registry.npmjs.org",
						"https://registry.npmjs.com",
						"https://api.wordpress.org",
						"https://downloads.wordpress.org",
					],
				},
			},
		}),
	],
	build: {
		target: "esnext",
	},
});
