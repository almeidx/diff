<script lang="ts">
	interface Props {
		versions: string[];
		value: string;
		onchange: (version: string) => void;
		label: string;
		id: string;
	}

	let { versions, value, onchange, label, id }: Props = $props();

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
		if (event.key === 'Escape') {
			isOpen = false;
			showManualInput = false;
		}
	}
</script>

<div class="version-selector" onkeydown={handleKeydown} role="group">
	<label for={id}>{label}</label>

	{#if showManualInput}
		<div class="manual-input">
			<input
				type="text"
				bind:value={manualValue}
				placeholder="Enter version..."
				onkeydown={(e) => e.key === 'Enter' && handleManualSubmit()}
			/>
			<button type="button" onclick={handleManualSubmit}>OK</button>
			<button type="button" class="cancel" onclick={() => (showManualInput = false)}>
				Cancel
			</button>
		</div>
	{:else}
		<div class="dropdown-container">
			<button
				type="button"
				class="dropdown-trigger"
				{id}
				onclick={() => (isOpen = !isOpen)}
				aria-expanded={isOpen}
			>
				<span class="selected-value">{value || 'Select version'}</span>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
					<path
						d="M4.427 9.573l3.396-3.396a.25.25 0 01.354 0l3.396 3.396a.25.25 0 01-.177.427H4.604a.25.25 0 01-.177-.427z"
					/>
				</svg>
			</button>

			{#if isOpen}
				<div class="dropdown-menu">
					<div class="search-container">
						<input
							type="text"
							class="search-input"
							placeholder="Search versions..."
							bind:value={search}
						/>
					</div>
					<ul class="version-list">
						{#each filteredVersions.slice(0, 50) as version (version)}
							<li>
								<button
									type="button"
									class="version-option"
									class:selected={version === value}
									onclick={() => selectVersion(version)}
								>
									{version}
								</button>
							</li>
						{/each}
						{#if filteredVersions.length > 50}
							<li class="more-indicator">
								+{filteredVersions.length - 50} more...
							</li>
						{/if}
						{#if filteredVersions.length === 0}
							<li class="no-results">No matching versions</li>
						{/if}
					</ul>
					<button
						type="button"
						class="manual-entry-btn"
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

<style>
	.version-selector {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	label {
		font-size: 12px;
		font-weight: 500;
		color: var(--text-secondary);
	}

	.dropdown-container {
		position: relative;
	}

	.dropdown-trigger {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 8px 12px;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		background: var(--bg-primary);
		color: var(--text-primary);
		font-size: 14px;
		text-align: left;
	}

	.dropdown-trigger:hover {
		border-color: var(--text-muted);
	}

	.dropdown-trigger svg {
		transform: rotate(180deg);
		transition: transform 0.15s ease;
	}

	.dropdown-trigger[aria-expanded='true'] svg {
		transform: rotate(0deg);
	}

	.selected-value {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.dropdown-menu {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		max-height: 300px;
		display: flex;
		flex-direction: column;
		background: var(--bg-primary);
		border: 1px solid var(--border-color);
		border-radius: 6px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
		z-index: 100;
		overflow: hidden;
	}

	.search-container {
		padding: 8px;
		border-bottom: 1px solid var(--border-color);
	}

	.search-input {
		width: 100%;
		padding: 6px 10px;
		border: 1px solid var(--border-color);
		border-radius: 4px;
		background: var(--bg-secondary);
		color: var(--text-primary);
	}

	.version-list {
		list-style: none;
		overflow-y: auto;
		flex: 1;
	}

	.version-option {
		display: block;
		width: 100%;
		padding: 8px 12px;
		border: none;
		background: transparent;
		color: var(--text-primary);
		text-align: left;
		cursor: pointer;
	}

	.version-option:hover {
		background: var(--bg-secondary);
	}

	.version-option.selected {
		background: var(--bg-tertiary);
		font-weight: 500;
	}

	.more-indicator,
	.no-results {
		padding: 8px 12px;
		color: var(--text-muted);
		font-size: 12px;
		text-align: center;
	}

	.manual-entry-btn {
		padding: 10px 12px;
		border: none;
		border-top: 1px solid var(--border-color);
		background: var(--bg-secondary);
		color: var(--link-color);
		text-align: left;
		cursor: pointer;
	}

	.manual-entry-btn:hover {
		background: var(--bg-tertiary);
	}

	.manual-input {
		display: flex;
		gap: 8px;
	}

	.manual-input input {
		flex: 1;
		padding: 8px 12px;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		background: var(--bg-primary);
		color: var(--text-primary);
	}

	.manual-input button {
		padding: 8px 16px;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		background: var(--bg-secondary);
		color: var(--text-primary);
	}

	.manual-input button:hover {
		background: var(--bg-tertiary);
	}

	.manual-input button.cancel {
		background: transparent;
	}
</style>
