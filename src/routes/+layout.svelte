<script lang="ts">
	import '../app.css';
	import '$lib/highlight/prism-theme.css';
	import { theme } from '$lib/stores/ui';
	import { browser } from '$app/environment';

	let { children } = $props();

	$effect(() => {
		if (browser) {
			const saved = localStorage.getItem('theme');
			if (saved === 'light' || saved === 'dark') {
				theme.set(saved);
			} else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
				theme.set('light');
			}
		}
	});

	$effect(() => {
		if (browser) {
			document.documentElement.dataset.theme = $theme;
			localStorage.setItem('theme', $theme);
		}
	});
</script>

<div class="app">
	{@render children()}
</div>

<style>
	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}
</style>
