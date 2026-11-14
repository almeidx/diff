<script lang="ts">
	import { goto } from '$app/navigation';
	import { getPackage, searchPackages } from '#lib/compare/client.js';
	import Combobox from '#lib/components/Combobox.svelte';
	import SiteHeader from '#lib/components/SiteHeader.svelte';
	import VersionRange from '#lib/components/VersionRange.svelte';
	import { getRegistry, registries, type PackageInfo, type PackageSuggestion } from '#lib/registries/index.js';
	import { defaultRange } from '#lib/registries/versions.js';
	import { comparePath, parsePickerPath } from '#lib/url.js';
	import { onMount } from 'svelte';

	const SEARCH_DEBOUNCE_MS = 200;

	let registry = $state(registries[0]);
	let name = $state('');
	let suggestions = $state.raw<PackageSuggestion[]>([]);
	let searching = $state(false);
	let info = $state.raw<PackageInfo | null>(null);
	let loadingInfo = $state(false);
	let error = $state<string | null>(null);
	let from = $state('');
	let to = $state('');

	let searchController: AbortController | null = null;
	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	let infoController: AbortController | null = null;

	const canCompare = $derived(info !== null && from !== '' && to !== '' && from !== to);

	function reset() {
		searchController?.abort();
		infoController?.abort();
		clearTimeout(searchTimer);
		name = '';
		suggestions = [];
		searching = false;
		info = null;
		loadingInfo = false;
		error = null;
		from = '';
		to = '';
	}

	function search(query: string) {
		clearTimeout(searchTimer);
		searchController?.abort();
		const text = query.trim();
		// npm rejects one-character queries, and they are too broad to be useful anyway.
		if (text.length < 2) {
			suggestions = [];
			searching = false;
			return;
		}

		searching = true;
		const target = registry;
		searchTimer = setTimeout(async () => {
			const controller = (searchController = new AbortController());
			try {
				suggestions = await searchPackages(target.id, text, controller.signal);
			} catch {
				// Suggestions are a convenience; typing a full name still works.
				if (!controller.signal.aborted) suggestions = [];
			} finally {
				if (!controller.signal.aborted) searching = false;
			}
		}, SEARCH_DEBOUNCE_MS);
	}

	async function choose(value: string) {
		const target = registry;
		const packageName = value.trim();
		searchController?.abort();
		clearTimeout(searchTimer);
		searching = false;
		infoController?.abort();

		name = packageName;
		info = null;
		from = '';
		to = '';
		error = null;
		if (!target.isValidName(packageName)) {
			error = `"${packageName}" is not a valid ${target.nameLabel.toLowerCase()} name.`;
			return;
		}

		const controller = (infoController = new AbortController());
		loadingInfo = true;
		try {
			const loaded = await getPackage(target.id, packageName, controller.signal);
			const range = defaultRange(loaded);
			info = loaded;
			from = range?.from ?? '';
			to = range?.to ?? loaded.versions[0]?.version ?? '';
			if (!range) error = `${packageName} has only one published version.`;
		} catch (caught) {
			if (!controller.signal.aborted) error = caught instanceof Error ? caught.message : String(caught);
		} finally {
			if (!controller.signal.aborted) loadingInfo = false;
		}
	}

	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (canCompare) void goto(comparePath({ registry: registry.id, name, from, to, unlimited: false }));
	}

	onMount(() => {
		const preset = parsePickerPath(new URLSearchParams(location.search));
		registry = getRegistry(preset.registry ?? '') ?? registry;
		if (preset.name) void choose(preset.name);
	});
</script>

<svelte:head>
	<title>diff · Compare package releases</title>
	<meta name="description" content="See exactly what changed between two releases of an npm package or WordPress plugin." />
</svelte:head>

<div class="flex min-h-full flex-col">
	<SiteHeader />

	<main class="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-5 pb-24 pt-10">
		<h1 class="text-3xl font-semibold tracking-tight">Compare package releases</h1>
		<p class="mt-2 text-muted">See exactly what changed between two versions. Everything runs in your browser.</p>

		<form class="mt-8 flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5" onsubmit={submit}>
			<fieldset class="flex gap-1 rounded-lg bg-raised p-1">
				<legend class="sr-only">Registry</legend>
				{#each registries as option (option.id)}
					<label
						class="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted transition-colors has-checked:bg-bg has-checked:text-fg has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-accent"
					>
						<input
							type="radio"
							name="registry"
							class="sr-only"
							value={option.id}
							checked={registry.id === option.id}
							onchange={() => {
								registry = option;
								reset();
							}}
						/>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={option.icon} /></svg>
						{option.label}
					</label>
				{/each}
			</fieldset>

			{#key registry.id}
				<Combobox
					id="package-{registry.id}"
					label={registry.nameLabel}
					items={suggestions}
					toValue={(suggestion) => suggestion.name}
					value={name}
					placeholder={registry.namePlaceholder}
					loading={searching || loadingInfo}
					allowCustomValue
					onQuery={search}
					onSelect={choose}
				>
					{#snippet item(suggestion)}
						<div class="flex items-baseline gap-2">
							<span class="truncate font-mono text-sm">{suggestion.name}</span>
							{#if suggestion.version}
								<span class="shrink-0 font-mono text-xs text-faint">{suggestion.version}</span>
							{/if}
						</div>
						{#if suggestion.description}
							<p class="truncate text-xs text-muted">{suggestion.description}</p>
						{/if}
					{/snippet}
				</Combobox>
			{/key}

			<VersionRange
				versions={info?.versions ?? []}
				{from}
				{to}
				disabled={!info}
				onChange={(nextFrom, nextTo) => {
					from = nextFrom;
					to = nextTo;
				}}
			/>

			{#if error}
				<p class="rounded-lg border border-deleted/30 bg-deleted/10 px-3 py-2 text-sm text-deleted" role="alert">{error}</p>
			{/if}

			<button
				type="submit"
				class="h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
				disabled={!canCompare}
			>
				{#if canCompare}
					Compare <span class="font-mono">{from}</span> → <span class="font-mono">{to}</span>
				{:else}
					Compare
				{/if}
			</button>
		</form>
	</main>
</div>
