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
	<button class="scroll-to-top" onclick={scrollToTop} aria-label="Scroll to top">
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path d="M18 15l-6-6-6 6" />
		</svg>
	</button>
{/if}

<style>
	.scroll-to-top {
		position: fixed;
		bottom: 24px;
		right: 24px;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		color: var(--text-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		transition: all 0.2s ease;
		z-index: 50;
	}

	.scroll-to-top:hover {
		background: var(--bg-tertiary);
		transform: translateY(-2px);
	}

	@media (max-width: 768px) {
		.scroll-to-top {
			bottom: 16px;
			right: 16px;
		}
	}
</style>
