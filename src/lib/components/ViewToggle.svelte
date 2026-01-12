<script lang="ts">
	import { viewMode, type ViewMode } from '$lib/stores/ui';

	function setMode(mode: ViewMode) {
		viewMode.set(mode);
	}
</script>

<div class="view-toggle" role="radiogroup" aria-label="Diff view mode">
	<button
		type="button"
		class="toggle-btn"
		class:active={$viewMode === 'unified'}
		onclick={() => setMode('unified')}
		role="radio"
		aria-checked={$viewMode === 'unified'}
	>
		<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
			<path
				d="M2 3.75C2 2.784 2.784 2 3.75 2h8.5c.966 0 1.75.784 1.75 1.75v8.5A1.75 1.75 0 0112.25 14h-8.5A1.75 1.75 0 012 12.25v-8.5zm1.75-.25a.25.25 0 00-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 00.25-.25v-8.5a.25.25 0 00-.25-.25h-8.5z"
			/>
		</svg>
		Unified
	</button>
	<button
		type="button"
		class="toggle-btn"
		class:active={$viewMode === 'split'}
		onclick={() => setMode('split')}
		role="radio"
		aria-checked={$viewMode === 'split'}
	>
		<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
			<path
				d="M2 3.75C2 2.784 2.784 2 3.75 2h8.5c.966 0 1.75.784 1.75 1.75v8.5A1.75 1.75 0 0112.25 14h-8.5A1.75 1.75 0 012 12.25v-8.5zM8 3.5v9h4.25a.25.25 0 00.25-.25v-8.5a.25.25 0 00-.25-.25H8zm-1.5 9v-9H3.75a.25.25 0 00-.25.25v8.5c0 .138.112.25.25.25H6.5z"
			/>
		</svg>
		Split
	</button>
</div>

<style>
	.view-toggle {
		display: flex;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		overflow: hidden;
	}

	.toggle-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		border: none;
		background: var(--bg-secondary);
		color: var(--text-secondary);
		font-size: 12px;
		font-weight: 500;
		transition: all 0.15s ease;
	}

	.toggle-btn:first-child {
		border-right: 1px solid var(--border-color);
	}

	.toggle-btn:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.toggle-btn.active {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}
</style>
