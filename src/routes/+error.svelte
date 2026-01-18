<script lang="ts">
	import { page } from '$app/stores';
</script>

<svelte:head>
	<title>Error {$page.status} - Diff</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center p-6">
	<div class="text-center max-w-[500px]">
		<h1 class="text-7xl font-bold mb-4 text-text-primary">{$page.status}</h1>
		<p class="text-lg text-text-secondary mb-8 leading-relaxed">{$page.error?.message || 'Something went wrong'}</p>
		<a
			href="/"
			class="inline-block px-6 py-3 bg-link text-white rounded-lg font-medium no-underline transition-opacity hover:opacity-90 hover:no-underline"
		>
			Go back home
		</a>
	</div>
</div>
