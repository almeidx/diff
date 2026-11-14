<script lang="ts">
	import { formatAge } from '#lib/format.js';
	import type { PackageVersion } from '#lib/registries/index.js';
	import Combobox from './Combobox.svelte';

	interface Props {
		id: string;
		label: string;
		versions: readonly PackageVersion[];
		value: string;
		onSelect: (version: string) => void;
		/** The version picked on the other side, marked in the list. */
		other?: string;
		disabled?: boolean;
		loading?: boolean;
		compact?: boolean;
		class?: string;
	}

	let { id, label, versions, value, onSelect, other, disabled, loading, compact, class: className }: Props = $props();

	const MAX_SHOWN = 100;
	let query = $state('');

	const matches = $derived.by(() => {
		const needle = query.trim().toLowerCase();
		return needle ? versions.filter((entry) => entry.version.toLowerCase().includes(needle)) : versions;
	});
</script>

<Combobox
	{id}
	{label}
	{value}
	{disabled}
	{loading}
	{compact}
	class={className}
	items={matches.slice(0, MAX_SHOWN)}
	toValue={(entry) => entry.version}
	placeholder={loading ? 'Loading…' : 'Select a version'}
	emptyText="No matching versions"
	footer={matches.length > MAX_SHOWN ? `${matches.length - MAX_SHOWN} older versions, type to filter` : undefined}
	onQuery={(text) => (query = text)}
	onSelect={(version) => {
		query = '';
		onSelect(version);
	}}
>
	{#snippet item(entry, state)}
		<div class="flex items-center gap-2">
			<span class="font-mono text-sm" class:line-through={entry.deprecated} class:text-faint={entry.deprecated} class:font-semibold={state.selected}>
				{entry.version}
			</span>
			{#each entry.tags as tag (tag)}
				<span class="rounded bg-accent/15 px-1.5 text-[11px] font-medium text-accent">{tag}</span>
			{/each}
			{#if entry.version === other}
				<span class="text-[11px] text-faint">other side</span>
			{/if}
			<span class="ml-auto shrink-0 pl-2 text-xs text-faint">{formatAge(entry.publishedAt)}</span>
		</div>
	{/snippet}
</Combobox>
