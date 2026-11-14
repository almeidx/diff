<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { comparePath } from '#lib/url.js';

	// Legacy `/package-diff?name=&from=&to=` links (npm only).
	const name = page.url.searchParams.get('name');
	const from = page.url.searchParams.get('from');
	const to = page.url.searchParams.get('to');

	$effect(() => {
		void goto(name && from && to ? comparePath({ registry: 'npm', name, from, to, unlimited: false }) : '/', { replaceState: true });
	});
</script>
