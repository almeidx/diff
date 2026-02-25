<script lang="ts">
	import * as combobox from '@zag-js/combobox';
	import { normalizeProps, useMachine } from '@zag-js/svelte';

	interface Props {
		versions: string[];
		value: string;
		onchange: (version: string) => void;
		label: string;
		id: string;
		disabledVersion?: string;
		loading?: boolean;
	}

	interface VersionItem {
		label: string;
		value: string;
		disabled: boolean;
	}

	const MAX_VISIBLE_OPTIONS = 50;
	const machineId = $props.id();

	let { versions, value, onchange, label, id, disabledVersion, loading = false }: Props = $props();
	let query = $state('');

	const filteredVersions = $derived(
		query ? versions.filter((version) => version.toLowerCase().includes(query.toLowerCase())) : versions,
	);

	const visibleItems = $derived(
		filteredVersions.slice(0, MAX_VISIBLE_OPTIONS).map((version) => ({
			label: version,
			value: version,
			disabled: version === disabledVersion,
		})),
	);

	const versionCollection = $derived(
		combobox.collection<VersionItem>({
			items: visibleItems,
			itemToValue: (item) => item.value,
			itemToString: (item) => item.label,
			isItemDisabled: (item) => item.disabled,
		}),
	);

	const hasCustomOption = $derived.by(() => {
		const custom = query.trim();
		if (!custom) return false;
		if (disabledVersion && custom === disabledVersion) return false;
		return !versions.some((version) => version.toLowerCase() === custom.toLowerCase());
	});

	const service = useMachine(combobox.machine, () => ({
		id: `version-selector-${machineId}-${id}`,
		collection: versionCollection,
		value: value ? [value] : [],
		inputValue: query,
		selectionBehavior: 'replace' as const,
		openOnClick: true,
		allowCustomValue: true,
		closeOnSelect: true,
		disabled: loading,
		onInputValueChange: ({ inputValue }) => {
			query = inputValue;
		},
		onOpenChange: ({ open }) => {
			if (!open) {
				query = value;
			}
		},
		onValueChange: ({ value: nextValue }) => {
			const selected = nextValue[0];
			if (!selected) return;
			onchange(selected);
			query = selected;
		},
	}));

	const api = $derived(combobox.connect(service, normalizeProps));

	$effect(() => {
		const current = api.value[0] ?? '';
		if (current !== value) {
			api.setValue(value ? [value] : []);
		}
		if (!api.open && query !== value) {
			query = value;
		}
	});

	function selectCustomValue() {
		const custom = query.trim();
		if (!custom || (disabledVersion && custom === disabledVersion)) return;
		onchange(custom);
		api.setValue([custom]);
		api.setOpen(false, 'script');
		query = custom;
	}

	function handleInputKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && api.highlightedValue == null && hasCustomOption) {
			event.preventDefault();
			selectCustomValue();
		}
	}
</script>

<div class="version-selector flex flex-col gap-1.5 min-w-0" {...api.getRootProps()}>
	<label class="text-xs font-medium text-text-secondary" {...api.getLabelProps()}>{label}</label>

	<div class="relative">
		<div
			class="flex items-center w-full px-3 py-2 border border-border rounded-md text-sm transition-colors"
			class:bg-bg-primary={!loading}
			class:bg-bg-secondary={loading}
			class:text-text-primary={!loading}
			class:opacity-70={loading}
			class:cursor-not-allowed={loading}
			{...api.getControlProps()}
		>
			<input
				id={id}
				class="flex-1 min-w-0 bg-transparent border-none outline-none text-text-primary placeholder:text-text-muted"
				placeholder={loading ? 'Loading...' : 'Select version'}
				onkeydown={handleInputKeydown}
				{...api.getInputProps()}
			/>
			<button
				type="button"
				class="shrink-0 ml-2 border-none bg-transparent text-text-muted hover:text-text-primary disabled:cursor-not-allowed"
				disabled={loading}
				{...api.getTriggerProps()}
				aria-label={`Toggle ${label}`}
			>
				{#if loading}
					<span class="w-3.5 h-3.5 border-2 border-border border-t-link rounded-full animate-spin inline-block"></span>
				{:else}
					<svg
						width="16"
						height="16"
						viewBox="0 0 16 16"
						fill="currentColor"
						class="transition-transform duration-150"
						class:rotate-180={api.open}
					>
						<path
							d="M4.427 6.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396a.25.25 0 00-.177-.427H4.604a.25.25 0 00-.177.427z"
						/>
					</svg>
				{/if}
			</button>
		</div>

		<div class="absolute top-[calc(100%+4px)] left-0 right-0 z-[100]" {...api.getPositionerProps()}>
			<div
				class="max-h-[300px] flex flex-col bg-bg-primary border border-border rounded-md shadow-xl overflow-hidden"
				{...api.getContentProps()}
			>
				<ul class="list-none overflow-y-auto flex-1" {...api.getListProps()}>
					{#each visibleItems as item (item.value)}
						{@const itemState = api.getItemState({ item })}
						<li>
							<div
								class="flex items-center justify-between w-full px-3 py-2 text-left"
								class:text-text-primary={!item.disabled}
								class:hover:bg-bg-secondary={!item.disabled}
								class:bg-bg-tertiary={itemState.selected}
								class:bg-bg-secondary={itemState.highlighted && !itemState.selected && !item.disabled}
								class:font-medium={itemState.selected}
								class:text-text-muted={item.disabled}
								class:cursor-not-allowed={item.disabled}
								class:opacity-60={item.disabled}
								{...api.getItemProps({ item })}
							>
								<span {...api.getItemTextProps({ item })}>{item.label}</span>
								{#if item.disabled}
									<span class="text-[11px] text-text-muted">(selected in other)</span>
								{:else if itemState.selected}
									<span class="text-link" {...api.getItemIndicatorProps({ item })}>✓</span>
								{/if}
							</div>
						</li>
					{/each}
					{#if filteredVersions.length > MAX_VISIBLE_OPTIONS}
						<li class="px-3 py-2 text-text-muted text-xs text-center">
							+{filteredVersions.length - MAX_VISIBLE_OPTIONS} more...
						</li>
					{/if}
					{#if filteredVersions.length === 0}
						<li class="px-3 py-2 text-text-muted text-xs text-center">No matching versions</li>
					{/if}
				</ul>
				{#if hasCustomOption}
					<button
						type="button"
						class="px-3 py-2.5 border-none border-t border-border bg-bg-secondary text-link text-left cursor-pointer hover:bg-bg-tertiary"
						onclick={selectCustomValue}
					>
						Use "{query.trim()}"
					</button>
				{/if}
			</div>
		</div>
	</div>
</div>
