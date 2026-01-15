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
				disabled={loading}
			/>
			<button type="button" onclick={handleManualSubmit} disabled={loading}>OK</button>
			<button type="button" class="cancel" onclick={() => (showManualInput = false)} disabled={loading}>
				Cancel
			</button>
		</div>
	{:else}
		<div class="dropdown-container">
			<button
				type="button"
				class="dropdown-trigger"
				class:loading
				{id}
				onclick={() => !loading && (isOpen = !isOpen)}
				aria-expanded={isOpen}
				disabled={loading}
			>
				{#if loading}
					<span class="loading-content">
						<span class="spinner"></span>
						<span class="selected-value">Loading...</span>
					</span>
				{:else}
					<span class="selected-value">{value || 'Select version'}</span>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
						<path
							d="M4.427 9.573l3.396-3.396a.25.25 0 01.354 0l3.396 3.396a.25.25 0 01-.177.427H4.604a.25.25 0 01-.177-.427z"
						/>
					</svg>
				{/if}
			</button>

			{#if isOpen && !loading}
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
									class:disabled={version === disabledVersion}
									onclick={() => selectVersion(version)}
									disabled={version === disabledVersion}
								>
									{version}
									{#if version === disabledVersion}
										<span class="disabled-hint">(selected in other)</span>
									{/if}
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
		min-width: 0;
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

	.dropdown-trigger:hover:not(:disabled) {
		border-color: var(--text-muted);
	}

	.dropdown-trigger:disabled {
		cursor: not-allowed;
		opacity: 0.7;
	}

	.dropdown-trigger.loading {
		background: var(--bg-secondary);
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

	.loading-content {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.spinner {
		width: 14px;
		height: 14px;
		border: 2px solid var(--border-color);
		border-top-color: var(--link-color);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
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
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 8px 12px;
		border: none;
		background: transparent;
		color: var(--text-primary);
		text-align: left;
		cursor: pointer;
	}

	.version-option:hover:not(:disabled) {
		background: var(--bg-secondary);
	}

	.version-option.selected {
		background: var(--bg-tertiary);
		font-weight: 500;
	}

	.version-option.disabled,
	.version-option:disabled {
		color: var(--text-muted);
		cursor: not-allowed;
		opacity: 0.6;
	}

	.disabled-hint {
		font-size: 11px;
		color: var(--text-muted);
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

	.manual-input input:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.manual-input button {
		padding: 8px 16px;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		background: var(--bg-secondary);
		color: var(--text-primary);
	}

	.manual-input button:hover:not(:disabled) {
		background: var(--bg-tertiary);
	}

	.manual-input button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.manual-input button.cancel {
		background: transparent;
	}
</style>
