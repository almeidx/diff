<script lang="ts">
	import { viewMode, wordWrap, type ViewMode } from '$lib/stores/ui';

	function setMode(mode: ViewMode) {
		viewMode.set(mode);
	}

	function toggleWordWrap() {
		wordWrap.update((v) => !v);
	}
</script>

<div class="flex items-center gap-3 max-md:gap-1.5">
	<button
		type="button"
		class="flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-xs font-medium transition-all max-md:px-2 max-md:py-1 max-md:text-[11px]"
		class:border-border={!$wordWrap}
		class:bg-bg-secondary={!$wordWrap}
		class:text-text-secondary={!$wordWrap}
		class:border-link={$wordWrap}
		class:bg-[color-mix(in_srgb,var(--link-color)_10%,transparent)]={$wordWrap}
		class:text-link={$wordWrap}
		onclick={toggleWordWrap}
		aria-pressed={$wordWrap}
		title="Toggle word wrap"
	>
		<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
			<path d="M2 4h12v1H2V4zm0 3h9v1H2V7zm0 3h5v1H2v-1zm9.5-1.5a2.5 2.5 0 010 5h-1v-1h1a1.5 1.5 0 000-3H9v2L6 9l3-2.5v2h2.5z"/>
		</svg>
		Wrap
	</button>
	<div class="flex border border-border rounded-md overflow-hidden" role="radiogroup" aria-label="Diff view mode">
		<button
			type="button"
			class="flex items-center gap-1.5 px-3 py-1.5 border-none text-xs font-medium transition-all border-r border-border max-md:px-2 max-md:py-1 max-md:text-[11px]"
			class:bg-bg-secondary={$viewMode !== 'unified'}
			class:text-text-secondary={$viewMode !== 'unified'}
			class:bg-bg-tertiary={$viewMode === 'unified'}
			class:text-text-primary={$viewMode === 'unified'}
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
			class="flex items-center gap-1.5 px-3 py-1.5 border-none text-xs font-medium transition-all max-md:px-2 max-md:py-1 max-md:text-[11px]"
			class:bg-bg-secondary={$viewMode !== 'split'}
			class:text-text-secondary={$viewMode !== 'split'}
			class:bg-bg-tertiary={$viewMode === 'split'}
			class:text-text-primary={$viewMode === 'split'}
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
</div>
