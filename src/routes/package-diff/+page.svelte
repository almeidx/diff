<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/state";

	let redirected = $state(false);

	const name = $derived(page.url.searchParams.get("name"));
	const from = $derived(page.url.searchParams.get("from"));
	const to = $derived(page.url.searchParams.get("to"));

	$effect(() => {
		if (redirected || !name || !from || !to) return;

		redirected = true;
		const encodedName = name.split("/").map(encodeURIComponent).join("/");
		void goto(`/npm/${encodedName}/${encodeURIComponent(from)}...${encodeURIComponent(to)}`, {
			replaceState: true,
		});
	});
</script>

<div class="min-h-screen flex items-center justify-center px-6">
	<p class="text-text-secondary text-sm">
		Missing comparison parameters. <a href="/" class="text-link no-underline hover:underline">Go back home</a>.
	</p>
</div>
