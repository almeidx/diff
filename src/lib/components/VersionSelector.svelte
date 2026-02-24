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

	const MAX_VISIBLE_OPTIONS = 50;

	let { versions, value, onchange, label, id, disabledVersion, loading = false }: Props = $props();

	let search = $state('');
	let isOpen = $state(false);
	let showManualInput = $state(false);
	let manualValue = $state('');
	let highlightedIndex = $state(-1);

	let rootElement = $state<HTMLDivElement | null>(null);
	let searchInput = $state<HTMLInputElement | null>(null);

	const listboxId = $derived(`${id}-listbox`);

	let filteredVersions = $derived(
		search
			? versions.filter((v) => v.toLowerCase().includes(search.toLowerCase()))
			: versions
	);
	let visibleVersions = $derived(filteredVersions.slice(0, MAX_VISIBLE_OPTIONS));

	function selectVersion(version: string) {
		if (version === disabledVersion) return;
		onchange(version);
		closeDropdown();
	}

	function closeDropdown() {
		isOpen = false;
		search = '';
		highlightedIndex = -1;
	}

	function openDropdown() {
		if (loading) return;
		isOpen = true;
		if (visibleVersions.length === 0) {
			highlightedIndex = -1;
			return;
		}

		const selectedIndex = visibleVersions.findIndex((version) => version === value);
		highlightedIndex = selectedIndex >= 0 ? selectedIndex : 0;
	}

	function handleManualSubmit() {
		if (manualValue.trim()) {
			onchange(manualValue.trim());
			showManualInput = false;
			manualValue = '';
		}
	}

	function optionId(version: string, index: number): string {
		const safeVersion = version.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
		return `${id}-option-${safeVersion}-${index}`;
	}

	function moveHighlight(delta: number) {
		if (!isOpen || visibleVersions.length === 0) return;

		if (highlightedIndex < 0 || highlightedIndex >= visibleVersions.length) {
			highlightedIndex = 0;
			return;
		}

		highlightedIndex =
			(highlightedIndex + delta + visibleVersions.length) % visibleVersions.length;

		queueMicrotask(() => {
			if (typeof document === 'undefined') return;
			const version = visibleVersions[highlightedIndex];
			if (!version) return;
			document
				.getElementById(optionId(version, highlightedIndex))
				?.scrollIntoView({ block: 'nearest' });
		});
	}

	function selectHighlighted() {
		if (highlightedIndex < 0 || highlightedIndex >= visibleVersions.length) return;
		const version = visibleVersions[highlightedIndex];
		if (version !== undefined) {
			selectVersion(version);
		}
	}

	function handleTriggerKeydown(event: KeyboardEvent) {
		if (loading) return;

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			if (!isOpen) {
				openDropdown();
			} else {
				moveHighlight(1);
			}
			return;
		}

		if (event.key === 'ArrowUp') {
			event.preventDefault();
			if (!isOpen) {
				openDropdown();
			} else {
				moveHighlight(-1);
			}
			return;
		}

		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			if (!isOpen) {
				openDropdown();
			} else {
				selectHighlighted();
			}
		}
	}

	function handleSearchKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			moveHighlight(1);
			return;
		}

		if (event.key === 'ArrowUp') {
			event.preventDefault();
			moveHighlight(-1);
			return;
		}

		if (event.key === 'Enter') {
			event.preventDefault();
			selectHighlighted();
			return;
		}

		if (event.key === 'Escape') {
			event.preventDefault();
			closeDropdown();
		}
	}

	function handleWindowKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && (isOpen || showManualInput)) {
			closeDropdown();
			showManualInput = false;
		}
	}

	$effect(() => {
		if (!isOpen || typeof document === 'undefined') return;

		function handlePointerDown(event: MouseEvent | TouchEvent) {
			const target = event.target;
			if (rootElement && target instanceof Node && !rootElement.contains(target)) {
				closeDropdown();
			}
		}

		document.addEventListener('mousedown', handlePointerDown);
		document.addEventListener('touchstart', handlePointerDown, { passive: true });

		return () => {
			document.removeEventListener('mousedown', handlePointerDown);
			document.removeEventListener('touchstart', handlePointerDown);
		};
	});

	$effect(() => {
		if (!isOpen) return;

		if (visibleVersions.length === 0) {
			highlightedIndex = -1;
			return;
		}

		if (highlightedIndex < 0 || highlightedIndex >= visibleVersions.length) {
			highlightedIndex = 0;
		}
	});

	$effect(() => {
		if (!isOpen || loading) return;
		queueMicrotask(() => searchInput?.focus());
	});
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<div class="version-selector flex flex-col gap-1.5 min-w-0" bind:this={rootElement}>
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
				id={id}
				class="flex items-center justify-between w-full px-3 py-2 border border-border rounded-md text-sm text-left transition-colors"
				class:bg-bg-primary={!loading}
				class:bg-bg-secondary={loading}
				class:text-text-primary={!loading}
				class:hover:border-text-muted={!loading}
				class:opacity-70={loading}
				class:cursor-not-allowed={loading}
				onclick={() => (isOpen ? closeDropdown() : openDropdown())}
				onkeydown={handleTriggerKeydown}
				aria-expanded={isOpen}
				aria-haspopup="listbox"
				aria-controls={listboxId}
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
							bind:this={searchInput}
							type="text"
							class="w-full px-2.5 py-1.5 border border-border rounded bg-bg-secondary text-text-primary"
							placeholder="Search versions..."
							bind:value={search}
							onkeydown={handleSearchKeydown}
						/>
					</div>
					<ul
						class="list-none overflow-y-auto flex-1"
						id={listboxId}
						role="listbox"
						aria-label={`${label} versions`}
					>
						{#each visibleVersions as version, index (version)}
							{@const isDisabled = version === disabledVersion}
							{@const isSelected = version === value}
							{@const isHighlighted = index === highlightedIndex}
							<li>
								<button
									type="button"
									id={optionId(version, index)}
									role="option"
									aria-selected={isSelected}
									class="flex items-center justify-between w-full px-3 py-2 border-none bg-transparent text-left cursor-pointer"
									class:text-text-primary={!isDisabled}
									class:hover:bg-bg-secondary={!isDisabled}
									class:bg-bg-tertiary={isSelected}
									class:bg-bg-secondary={isHighlighted && !isSelected && !isDisabled}
									class:font-medium={isSelected}
									class:text-text-muted={isDisabled}
									class:cursor-not-allowed={isDisabled}
									class:opacity-60={isDisabled}
									onclick={() => selectVersion(version)}
									onmouseenter={() => (highlightedIndex = index)}
									disabled={isDisabled}
								>
									{version}
									{#if isDisabled}
										<span class="text-[11px] text-text-muted">(selected in other)</span>
									{/if}
								</button>
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
					<button
						type="button"
						class="px-3 py-2.5 border-none border-t border-border bg-bg-secondary text-link text-left cursor-pointer hover:bg-bg-tertiary"
						onclick={() => {
							showManualInput = true;
							closeDropdown();
						}}
					>
						Enter version manually...
					</button>
				</div>
			{/if}
		</div>
	{/if}
</div>
