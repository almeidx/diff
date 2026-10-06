<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { PageData } from './$types';
	import DiffPage from '#lib/components/DiffPage.svelte';
	import { LIMITS_PARAM, LIMITS_OFF_VALUE } from '#lib/archive/limits.js';

	let { data }: { data: PageData } = $props();

	const limitsOff = $derived(page.url.searchParams.get(LIMITS_PARAM) === LIMITS_OFF_VALUE);

	function buildPath(fromVersion: string, toVersion: string) {
		const encodedName = data.packageName.split('/').map(encodeURIComponent).join('/');
		return `/npm/${encodedName}/${encodeURIComponent(fromVersion)}...${encodeURIComponent(toVersion)}`;
	}

	function handleNavigate(fromVersion: string, toVersion: string) {
		goto(buildPath(fromVersion, toVersion) + (limitsOff ? `?${LIMITS_PARAM}=${LIMITS_OFF_VALUE}` : ''));
	}

	function bypassLimits() {
		goto(`${buildPath(data.fromVersion, data.toVersion)}?${LIMITS_PARAM}=${LIMITS_OFF_VALUE}`);
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
	onNavigate={handleNavigate}
	onBypassLimits={bypassLimits}
/>
