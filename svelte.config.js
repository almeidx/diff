import adapter from "@sveltejs/adapter-cloudflare";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			platformProxy: {
				environment: undefined,
				persist: "./wrangler-local-state",
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
					"https://api.github.com",
				],
			},
		},
	},
};

export default config;
