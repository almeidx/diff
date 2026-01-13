<script lang="ts">
	import { page } from '$app/stores';
</script>

<svelte:head>
	<title>Error {$page.status} - Diff</title>
</svelte:head>

<div class="error-page">
	<div class="error-content">
		<h1>{$page.status}</h1>
		<p class="message">{$page.error?.message || 'Something went wrong'}</p>
		<a href="/" class="back-link">Go back home</a>
	</div>
</div>

<style>
	.error-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
	}

	.error-content {
		text-align: center;
		max-width: 500px;
	}

	h1 {
		font-size: 72px;
		font-weight: 700;
		margin-bottom: 16px;
		color: var(--text-primary);
	}

	.message {
		font-size: 18px;
		color: var(--text-secondary);
		margin-bottom: 32px;
		line-height: 1.6;
	}

	.back-link {
		display: inline-block;
		padding: 12px 24px;
		background: var(--link-color);
		color: white;
		border-radius: 8px;
		font-weight: 500;
		text-decoration: none;
		transition: opacity 0.15s ease;
	}

	.back-link:hover {
		opacity: 0.9;
		text-decoration: none;
	}
</style>
