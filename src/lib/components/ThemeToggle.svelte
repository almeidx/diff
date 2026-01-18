<script lang="ts">
	import { theme } from '$lib/stores/ui';

	function toggle() {
		theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
	}
</script>

<button
	onclick={toggle}
	class="flex items-center justify-center w-9 h-9 border border-border rounded-md bg-bg-secondary text-text-secondary transition-all hover:bg-bg-tertiary hover:text-text-primary"
	aria-label="Toggle theme"
>
	{#if $theme === 'dark'}
		<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
			<path
				d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"
			/>
		</svg>
	{:else}
		<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
			<path
				d="M12 7a5 5 0 100 10 5 5 0 000-10zM12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
			/>
		</svg>
	{/if}
</button>
