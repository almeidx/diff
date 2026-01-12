<script lang="ts">
	import '../app.css';
	import { theme } from '$lib/stores/ui';
	import { nextFile, prevFile, nextHunk, prevHunk } from '$lib/stores/keyboard';
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

	function handleKeydown(event: KeyboardEvent) {
		if (
			event.target instanceof HTMLInputElement ||
			event.target instanceof HTMLTextAreaElement ||
			event.target instanceof HTMLSelectElement
		) {
			return;
		}

		switch (event.key) {
			case 'j':
				event.preventDefault();
				nextFile();
				break;
			case 'k':
				event.preventDefault();
				prevFile();
				break;
			case 'n':
				event.preventDefault();
				nextHunk();
				break;
			case 'p':
				event.preventDefault();
				prevHunk();
				break;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

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
