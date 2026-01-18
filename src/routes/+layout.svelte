<script lang="ts">
	import '../app.css';
	import '$lib/highlight/prism-theme.css';
	import { theme, type Theme } from '$lib/stores/ui';
	import { browser } from '$app/environment';

	let { children } = $props();

	let initialized = false;

	$effect(() => {
		if (browser && !initialized) {
			const current = document.documentElement.dataset.theme as Theme;
			if (current === 'light' || current === 'dark') {
				theme.set(current);
			}
			initialized = true;
		}
	});

	$effect(() => {
		if (browser && initialized) {
			document.documentElement.dataset.theme = $theme;
			localStorage.setItem('theme', $theme);
		}
	});
</script>

<div class="min-h-screen flex flex-col">
	{@render children()}
</div>
