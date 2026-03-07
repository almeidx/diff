<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import DiffPage from '$lib/components/DiffPage.svelte';

	let { data }: { data: PageData } = $props();

	function handleNavigate(fromVersion: string, toVersion: string) {
		const encodedName = data.packageName.split("/").map(encodeURIComponent).join("/");
		goto(`/npm/${encodedName}/${encodeURIComponent(fromVersion)}...${encodeURIComponent(toVersion)}`);
	}
</script>

<DiffPage
	packageLabel="npm"
	packageName={data.packageName}
	fromVersion={data.fromVersion}
	toVersion={data.toVersion}
	versions={data.versions}
	diff={data.diff}
	error={data.error}
	compareUrl={data.compareUrl}
	onNavigate={handleNavigate}
/>
