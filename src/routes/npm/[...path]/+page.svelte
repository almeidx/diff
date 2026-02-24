<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import DiffPage from '$lib/components/DiffPage.svelte';

	let { data }: { data: PageData } = $props();

	function handleNavigate(fromVersion: string, toVersion: string) {
		goto(`/npm/${data.packageName}/${fromVersion}...${toVersion}`);
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
