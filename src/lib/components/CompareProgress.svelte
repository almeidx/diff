<script lang="ts">
	import { fly } from 'svelte/transition';
	import { compareProgress } from '#lib/stores/progress.js';

	let open = $state(true);

	const progress = $derived($compareProgress);
	const doneCount = $derived(progress.steps.filter((step) => step.status === 'done').length);
	const hasActive = $derived(progress.steps.some((step) => step.status === 'active'));
</script>

{#if progress.active}
	<div
		class="fixed right-4 bottom-4 z-[200] w-80 max-w-[calc(100vw-2rem)] max-md:right-3 max-md:bottom-3"
		in:fly={{ y: 16, duration: 180 }}
		out:fly={{ y: 16, duration: 120 }}
	>
		<div class="rounded-xl border border-border bg-bg-secondary shadow-2xl p-4" role="status" aria-label="Loading diff progress">
			<div class="flex items-center gap-2.5">
				{#if hasActive}
					<span class="w-4 h-4 shrink-0 border-2 border-border border-t-link rounded-full animate-spin inline-block"></span>
				{:else}
					<svg viewBox="0 0 16 16" class="w-4 h-4 shrink-0 text-text-muted" aria-hidden="true">
						<circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2.5 2.5" stroke-linecap="round" />
					</svg>
				{/if}
				<span class="flex-1 text-sm font-semibold text-text-primary">Loading diff</span>
				<span class="text-sm text-text-muted tabular-nums">{doneCount}/{progress.steps.length}</span>
				<button
					type="button"
					class="shrink-0 border-none bg-transparent text-text-muted hover:text-text-primary transition-colors p-0.5 -m-0.5"
					aria-expanded={open}
					aria-label={open ? 'Collapse progress details' : 'Expand progress details'}
					onclick={() => (open = !open)}
				>
					<svg viewBox="0 0 16 16" class="w-4 h-4 transition-transform {open ? '' : 'rotate-180'}" aria-hidden="true">
						<path d="M3.5 6l4.5 4.5L12.5 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</button>
			</div>

			{#if open}
				<ul class="list-none flex flex-col gap-2.5 mt-3.5" role="list">
					{#each progress.steps as step (step.id)}
						<li class="flex items-center gap-2.5 text-sm min-w-0" class:opacity-60={step.status === 'done'}>
							{#if step.status === 'active'}
								<span class="w-3.5 h-3.5 shrink-0 border-2 border-border border-t-link rounded-full animate-spin inline-block"></span>
							{:else if step.status === 'done'}
								<svg viewBox="0 0 16 16" class="w-3.5 h-3.5 shrink-0 text-link" aria-hidden="true">
									<circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.5" />
									<path d="M5.2 8.2l2 2 3.6-4.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
								</svg>
							{:else}
								<svg viewBox="0 0 16 16" class="w-3.5 h-3.5 shrink-0 text-text-muted" aria-hidden="true">
									<circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2.5 2.5" stroke-linecap="round" />
								</svg>
							{/if}
							<span class="min-w-0 truncate">
								<span class="text-text-muted">{step.lead}</span>
								<span class="text-text-primary font-medium" class:text-text-muted={step.status === 'done'}>{step.emphasis}</span>
							</span>
							{#if step.status === 'active' && step.percent !== null}
								<span class="shrink-0 ml-auto px-1.5 py-0.5 bg-bg-tertiary rounded text-[11px] font-mono text-text-secondary tabular-nums">
									{step.percent}%
								</span>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
{/if}
