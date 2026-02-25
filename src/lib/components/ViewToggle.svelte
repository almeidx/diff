<script lang="ts">
	import * as zagSwitch from '@zag-js/switch';
	import * as radioGroup from '@zag-js/radio-group';
	import { normalizeProps, useMachine } from '@zag-js/svelte';
	import { viewMode, wordWrap, type ViewMode } from '$lib/stores/ui';

	const machineId = $props.id();

	const wrapService = useMachine(zagSwitch.machine, () => ({
		id: `word-wrap-${machineId}`,
		label: 'Toggle word wrap',
		checked: $wordWrap,
		onCheckedChange: ({ checked }) => {
			wordWrap.set(checked);
		},
	}));

	const wrapApi = $derived(zagSwitch.connect(wrapService, normalizeProps));

	const viewService = useMachine(radioGroup.machine, () => ({
		id: `view-mode-${machineId}`,
		name: 'view-mode',
		value: $viewMode,
		orientation: 'horizontal' as const,
		onValueChange: ({ value }) => {
			if (value === 'unified' || value === 'split') {
				viewMode.set(value as ViewMode);
			}
		},
	}));

	const viewApi = $derived(radioGroup.connect(viewService, normalizeProps));

	const modes: Array<{ value: ViewMode; label: string; icon: string }> = [
		{
			value: 'unified',
			label: 'Unified',
			icon: 'M2 3.75C2 2.784 2.784 2 3.75 2h8.5c.966 0 1.75.784 1.75 1.75v8.5A1.75 1.75 0 0112.25 14h-8.5A1.75 1.75 0 012 12.25v-8.5zm1.75-.25a.25.25 0 00-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 00.25-.25v-8.5a.25.25 0 00-.25-.25h-8.5z',
		},
		{
			value: 'split',
			label: 'Split',
			icon: 'M2 3.75C2 2.784 2.784 2 3.75 2h8.5c.966 0 1.75.784 1.75 1.75v8.5A1.75 1.75 0 0112.25 14h-8.5A1.75 1.75 0 012 12.25v-8.5zM8 3.5v9h4.25a.25.25 0 00.25-.25v-8.5a.25.25 0 00-.25-.25H8zm-1.5 9v-9H3.75a.25.25 0 00-.25.25v8.5c0 .138.112.25.25.25H6.5z',
		},
	];

	$effect(() => {
		if (wrapApi.checked !== $wordWrap) {
			wrapApi.setChecked($wordWrap);
		}
	});

	$effect(() => {
		if (viewApi.value !== $viewMode) {
			viewApi.setValue($viewMode);
		}
	});
</script>

<div class="flex items-center gap-3 max-md:gap-1.5">
	<label {...wrapApi.getRootProps()} class="inline-flex items-center">
		<input {...wrapApi.getHiddenInputProps()} />
		<span
			{...wrapApi.getControlProps()}
			class="flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-xs font-medium transition-all max-md:px-2 max-md:py-1 max-md:text-[11px]"
			class:border-border={!$wordWrap}
			class:bg-bg-secondary={!$wordWrap}
			class:text-text-secondary={!$wordWrap}
			class:border-link={$wordWrap}
			class:bg-[color-mix(in_srgb,var(--link-color)_10%,transparent)]={$wordWrap}
			class:text-link={$wordWrap}
			title="Toggle word wrap"
		>
			<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
				<path d="M2 4h12v1H2V4zm0 3h9v1H2V7zm0 3h5v1H2v-1zm9.5-1.5a2.5 2.5 0 010 5h-1v-1h1a1.5 1.5 0 000-3H9v2L6 9l3-2.5v2h2.5z"/>
			</svg>
			Wrap
		</span>
	</label>

	<div {...viewApi.getRootProps()} class="flex border border-border rounded-md overflow-hidden">
		<span class="sr-only" {...viewApi.getLabelProps()}>Diff view mode</span>
		{#each modes as mode}
			{@const state = viewApi.getItemState({ value: mode.value })}
			<label
				{...viewApi.getItemProps({ value: mode.value })}
				class="flex items-center gap-1.5 px-3 py-1.5 border-none text-xs font-medium transition-all max-md:px-2 max-md:py-1 max-md:text-[11px]"
				class:border-r={mode.value === 'unified'}
				class:border-border={mode.value === 'unified'}
				class:bg-bg-secondary={!state.checked}
				class:text-text-secondary={!state.checked}
				class:bg-bg-tertiary={state.checked}
				class:text-text-primary={state.checked}
			>
				<input {...viewApi.getItemHiddenInputProps({ value: mode.value })} />
				<span {...viewApi.getItemControlProps({ value: mode.value })} class="inline-flex items-center gap-1.5">
					<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
						<path d={mode.icon} />
					</svg>
					<span {...viewApi.getItemTextProps({ value: mode.value })}>{mode.label}</span>
				</span>
			</label>
		{/each}
	</div>
</div>
