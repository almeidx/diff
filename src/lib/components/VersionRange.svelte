<script lang="ts">
	import type { PackageVersion } from '#lib/registries/index.js';
	import VersionSelect from './VersionSelect.svelte';

	interface Props {
		versions: readonly PackageVersion[];
		from: string;
		to: string;
		onChange: (from: string, to: string) => void;
		disabled?: boolean;
		loading?: boolean;
		compact?: boolean;
		class?: string;
	}

	let { versions, from, to, onChange, disabled = false, loading = false, compact = false, class: className = '' }: Props = $props();
</script>

<div class="flex {compact ? 'items-center gap-1.5' : 'items-end gap-2'} {className}">
	<VersionSelect
		id="from-version"
		label="From"
		class={compact ? 'w-36' : 'flex-1'}
		{versions}
		value={from}
		other={to}
		{disabled}
		{loading}
		{compact}
		onSelect={(version) => onChange(version, to)}
	/>
	<button
		type="button"
		class="grid shrink-0 place-items-center rounded-md text-muted hover:bg-raised hover:text-fg disabled:opacity-40 {compact ? 'size-7' : 'mb-1 size-8'}"
		aria-label="Swap versions"
		title="Swap versions"
		{disabled}
		onclick={() => onChange(to, from)}
	>
		<svg width={compact ? 14 : 16} height={compact ? 14 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d="M7 7h13l-4-4M17 17H4l4 4" />
		</svg>
	</button>
	<VersionSelect
		id="to-version"
		label="To"
		class={compact ? 'w-36' : 'flex-1'}
		{versions}
		value={to}
		other={from}
		{disabled}
		{loading}
		{compact}
		onSelect={(version) => onChange(from, version)}
	/>
</div>
