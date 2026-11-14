<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { CompareSession } from '#lib/compare/session.svelte.js';
	import CompareProgress from '#lib/components/CompareProgress.svelte';
	import DiffViewer from '#lib/components/DiffViewer.svelte';
	import FileTree from '#lib/components/FileTree.svelte';
	import SiteHeader from '#lib/components/SiteHeader.svelte';
	import VersionRange from '#lib/components/VersionRange.svelte';
	import { settings } from '#lib/settings.svelte.js';
	import { comparePath, pickerPath } from '#lib/url.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const registry = $derived(data.registry);
	const request = $derived(data.request);
	let active = $state<string | undefined>();
	let viewer = $state<DiffViewer>();

	const session = $derived(new CompareSession(request));

	$effect(() => {
		const current = session;
		active = undefined;
		return () => current.cancel();
	});

	function navigate(from: string, to: string) {
		if (from !== to) void goto(comparePath({ ...request, from, to }));
	}
</script>

<svelte:head>
	<title>{request.name} {request.from}…{request.to} · diff</title>
</svelte:head>

<div class="flex h-dvh flex-col">
	<SiteHeader>
		<a
			href={pickerPath(registry.id, request.name)}
			class="flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 hover:bg-raised"
			title="Choose another {registry.nameLabel.toLowerCase()}"
		>
			<svg class="shrink-0 text-muted" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-label={registry.label}>
				<path d={registry.icon} />
			</svg>
			<span class="truncate font-mono text-sm font-medium">{request.name}</span>
		</a>
		<VersionRange
			class="max-sm:hidden"
			compact
			versions={session.info?.versions ?? []}
			from={request.from}
			to={request.to}
			loading={!session.info}
			onChange={navigate}
		/>

		{#snippet actions()}
			{#if session.files}
				<p class="flex items-center gap-2 font-mono text-xs tabular-nums max-md:hidden" aria-live="polite">
					<span class="text-muted">{session.files.length} {session.files.length === 1 ? 'file' : 'files'}</span>
					<span class="text-added">+{session.additions.toLocaleString()}</span>
					<span class="text-deleted">−{session.deletions.toLocaleString()}</span>
				</p>
			{/if}
			<div class="flex rounded-lg bg-raised p-0.5 text-xs font-medium" role="radiogroup" aria-label="Diff layout">
				{#each [['split', 'Split'], ['unified', 'Unified']] as const as [style, label] (style)}
					<button
						type="button"
						role="radio"
						aria-checked={settings.diffStyle === style}
						class="rounded-md px-2.5 py-1 text-muted aria-checked:bg-bg aria-checked:text-fg aria-checked:shadow-sm"
						onclick={() => (settings.diffStyle = style)}
					>
						{label}
					</button>
				{/each}
			</div>
			<button
				type="button"
				aria-pressed={settings.wrap}
				class="rounded-md px-2.5 py-1 text-xs font-medium text-muted hover:bg-raised hover:text-fg aria-pressed:bg-raised aria-pressed:text-fg"
				title="Wrap long lines"
				onclick={() => (settings.wrap = !settings.wrap)}
			>
				Wrap
			</button>
		{/snippet}
	</SiteHeader>

	{#if session.phase === 'diff' && session.files}
		<div class="h-0.5 shrink-0 bg-raised" role="progressbar" aria-label="Comparing files" aria-valuemin={0} aria-valuemax={session.files.length} aria-valuenow={session.diffed}>
			<div class="h-full bg-accent transition-[width]" style:width="{(session.diffed / Math.max(1, session.files.length)) * 100}%"></div>
		</div>
	{/if}

	{#if session.error}
		{@const error = session.error}
		<div class="grid flex-1 place-items-center p-6">
			<div class="max-w-md text-center" role="alert">
				<h1 class="text-lg font-semibold">
					{error.code === 'not-found' ? 'Not found' : error.code === 'limit' ? 'This package is too large' : 'The comparison failed'}
				</h1>
				<p class="mt-2 text-muted">{error.message}</p>
				{#if error.code === 'limit'}
					<p class="mt-2 text-sm text-faint">Without limits the tab may use a lot of memory, slow down or crash.</p>
				{/if}
				<div class="mt-5 flex justify-center gap-2">
					{#if error.code === 'limit' && !request.unlimited}
						<a class="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90" href={comparePath({ ...request, unlimited: true })}>
							Compare without limits
						</a>
					{:else if error.code === 'failed'}
						<button type="button" class="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90" onclick={() => invalidateAll()}>
							Try again
						</button>
					{/if}
					<a class="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-raised" href={pickerPath(registry.id, request.name)}>
						Pick other versions
					</a>
				</div>
			</div>
		</div>
	{:else if !session.files}
		<CompareProgress {session} />
	{:else if session.files.length === 0}
		<div class="grid flex-1 place-items-center p-6 text-center">
			<div>
				<h1 class="text-lg font-semibold">No differences</h1>
				<p class="mt-2 text-muted">
					<span class="font-mono">{request.from}</span> and <span class="font-mono">{request.to}</span> ship identical files.
				</p>
			</div>
		</div>
	{:else}
		{#key session}
			<div class="flex min-h-0 flex-1">
				<aside class="w-80 shrink-0 border-r border-border bg-surface max-lg:w-64 max-md:hidden" aria-label="Changed files">
					<FileTree files={session.files} {active} onSelect={(path) => viewer?.scrollToFile(path)} />
				</aside>
				<main class="flex min-w-0 flex-1 flex-col">
					<DiffViewer bind:this={viewer} {session} onActiveFile={(path) => (active = path)} />
				</main>
			</div>
		{/key}
	{/if}
</div>
