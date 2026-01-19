<script lang="ts">
	interface Props {
		versions: string[];
		value: string;
		onchange: (version: string) => void;
		label: string;
		id: string;
		disabledVersion?: string;
		loading?: boolean;
	}

	let { versions, value, onchange, label, id, disabledVersion, loading = false }: Props = $props();

	let search = $state('');
	let isOpen = $state(false);
	let showManualInput = $state(false);
	let manualValue = $state('');

	let filteredVersions = $derived(
		search
			? versions.filter((v) => v.toLowerCase().includes(search.toLowerCase()))
			: versions
	);

	function selectVersion(version: string) {
		if (version === disabledVersion) return;
		onchange(version);
		isOpen = false;
		search = '';
	}

	function handleManualSubmit() {
		if (manualValue.trim()) {
			onchange(manualValue.trim());
			showManualInput = false;
			manualValue = '';
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && (isOpen || showManualInput)) {
			isOpen = false;
			showManualInput = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="version-selector flex flex-col gap-1.5 min-w-0">
	<label for={id} class="text-xs font-medium text-text-secondary">{label}</label>

	{#if showManualInput}
		<div class="flex gap-2">
			<input
				type="text"
				bind:value={manualValue}
				placeholder="Enter version..."
				onkeydown={(e) => e.key === 'Enter' && handleManualSubmit()}
				disabled={loading}
				class="flex-1 px-3 py-2 border border-border rounded-md bg-bg-primary text-text-primary disabled:opacity-70 disabled:cursor-not-allowed"
			/>
			<button
				type="button"
				onclick={handleManualSubmit}
				disabled={loading}
				class="px-4 py-2 border border-border rounded-md bg-bg-secondary text-text-primary hover:bg-bg-tertiary disabled:opacity-70 disabled:cursor-not-allowed"
			>
				OK
			</button>
			<button
				type="button"
				onclick={() => (showManualInput = false)}
				disabled={loading}
				class="px-4 py-2 border border-border rounded-md bg-transparent text-text-primary hover:bg-bg-tertiary disabled:opacity-70 disabled:cursor-not-allowed"
			>
				Cancel
			</button>
		</div>
	{:else}
		<div class="relative">
			<button
				type="button"
				class="flex items-center justify-between w-full px-3 py-2 border border-border rounded-md text-sm text-left transition-colors"
				class:bg-bg-primary={!loading}
				class:bg-bg-secondary={loading}
				class:text-text-primary={!loading}
				class:hover:border-text-muted={!loading}
				class:opacity-70={loading}
				class:cursor-not-allowed={loading}
				{id}
				onclick={() => !loading && (isOpen = !isOpen)}
				aria-expanded={isOpen}
				disabled={loading}
			>
				{#if loading}
					<span class="flex items-center gap-2">
						<span class="w-3.5 h-3.5 border-2 border-border border-t-link rounded-full animate-spin"></span>
						<span class="overflow-hidden text-ellipsis whitespace-nowrap">Loading...</span>
					</span>
				{:else}
					<span class="overflow-hidden text-ellipsis whitespace-nowrap">{value || 'Select version'}</span>
					<svg
						width="16"
						height="16"
						viewBox="0 0 16 16"
						fill="currentColor"
						class="transition-transform duration-150"
						class:rotate-0={isOpen}
						class:rotate-180={!isOpen}
					>
						<path
							d="M4.427 9.573l3.396-3.396a.25.25 0 01.354 0l3.396 3.396a.25.25 0 01-.177.427H4.604a.25.25 0 01-.177-.427z"
						/>
					</svg>
				{/if}
			</button>

			{#if isOpen && !loading}
				<div class="absolute top-[calc(100%+4px)] left-0 right-0 max-h-[300px] flex flex-col bg-bg-primary border border-border rounded-md shadow-xl z-[100] overflow-hidden">
					<div class="p-2 border-b border-border">
						<input
							type="text"
							class="w-full px-2.5 py-1.5 border border-border rounded bg-bg-secondary text-text-primary"
							placeholder="Search versions..."
							bind:value={search}
						/>
					</div>
					<ul class="list-none overflow-y-auto flex-1">
						{#each filteredVersions.slice(0, 50) as version (version)}
							<li>
								<button
									type="button"
									class="flex items-center justify-between w-full px-3 py-2 border-none bg-transparent text-left cursor-pointer"
									class:text-text-primary={version !== disabledVersion}
									class:hover:bg-bg-secondary={version !== disabledVersion}
									class:bg-bg-tertiary={version === value}
									class:font-medium={version === value}
									class:text-text-muted={version === disabledVersion}
									class:cursor-not-allowed={version === disabledVersion}
									class:opacity-60={version === disabledVersion}
									onclick={() => selectVersion(version)}
									disabled={version === disabledVersion}
								>
									{version}
									{#if version === disabledVersion}
										<span class="text-[11px] text-text-muted">(selected in other)</span>
									{/if}
								</button>
							</li>
						{/each}
						{#if filteredVersions.length > 50}
							<li class="px-3 py-2 text-text-muted text-xs text-center">
								+{filteredVersions.length - 50} more...
							</li>
						{/if}
						{#if filteredVersions.length === 0}
							<li class="px-3 py-2 text-text-muted text-xs text-center">No matching versions</li>
						{/if}
					</ul>
					<button
						type="button"
						class="px-3 py-2.5 border-none border-t border-border bg-bg-secondary text-link text-left cursor-pointer hover:bg-bg-tertiary"
						onclick={() => {
							showManualInput = true;
							isOpen = false;
						}}
					>
						Enter version manually...
					</button>
				</div>
			{/if}
		</div>
	{/if}
</div>
