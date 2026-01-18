<script lang="ts">
	import { browser } from '$app/environment';

	let visible = $state(false);

	$effect(() => {
		if (!browser) return;

		function handleScroll() {
			visible = window.scrollY > 300;
		}

		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => window.removeEventListener('scroll', handleScroll);
	});

	function scrollToTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
</script>

{#if visible}
	<button
		class="fixed bottom-6 right-6 w-11 h-11 rounded-full bg-bg-secondary border border-border text-text-primary flex items-center justify-center cursor-pointer shadow-lg transition-all z-50 hover:bg-bg-tertiary hover:-translate-y-0.5 max-md:bottom-4 max-md:right-4"
		onclick={scrollToTop}
		aria-label="Scroll to top"
	>
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path d="M18 15l-6-6-6 6" />
		</svg>
	</button>
{/if}
