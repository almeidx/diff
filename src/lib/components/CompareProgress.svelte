<script lang="ts">
	import type { CompareSession, DownloadProgress } from '#lib/compare/session.svelte.js';
	import { formatBytes } from '#lib/format.js';

	let { session }: { session: CompareSession } = $props();

	type StepState = 'pending' | 'active' | 'done';

	function downloadState(progress: DownloadProgress): StepState {
		if (progress.done) return 'done';
		return session.phase === 'download' ? 'active' : 'pending';
	}

	function downloadDetail(progress: DownloadProgress): string {
		if (progress.loaded === 0) return '';
		return progress.total ? `${formatBytes(progress.loaded)} of ${formatBytes(progress.total)}` : formatBytes(progress.loaded);
	}

	const steps = $derived.by(() => {
		const { from, to } = session.request;
		const total = session.files?.length ?? 0;
		return [
			{
				label: 'Resolving versions',
				state: (session.phase === 'metadata' ? 'active' : 'done') as StepState,
				detail: '',
				fraction: null,
			},
			...(['from', 'to'] as const).map((side) => {
				const progress = session.downloads[side];
				return {
					label: `Downloading ${side === 'from' ? from : to}`,
					state: downloadState(progress),
					detail: downloadDetail(progress),
					fraction: progress.done ? 1 : progress.total ? progress.loaded / progress.total : null,
				};
			}),
			{
				label: 'Comparing files',
				state: (session.phase === 'diff' ? 'active' : session.phase === 'done' ? 'done' : 'pending') as StepState,
				detail: total ? `${session.diffed} of ${total}` : '',
				fraction: total ? session.diffed / total : null,
			},
		];
	});
</script>

<div class="grid flex-1 place-items-center p-6">
	<ol class="w-full max-w-sm space-y-4" aria-label="Comparison progress" aria-live="polite">
		{#each steps as step (step.label)}
			<li class="text-sm" class:text-faint={step.state === 'pending'}>
				<div class="flex items-center gap-2.5">
					{#if step.state === 'active'}
						<span class="spinner shrink-0 text-sm" aria-hidden="true"></span>
					{:else if step.state === 'done'}
						<svg class="size-3.5 shrink-0 text-added" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
							<path d="M3 8.5l3 3 7-7" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
					{:else}
						<span class="grid size-3.5 shrink-0 place-items-center" aria-hidden="true"><span class="size-1.5 rounded-full bg-current"></span></span>
					{/if}
					<span class="min-w-0 truncate" class:text-muted={step.state === 'done'}>{step.label}</span>
					<span class="ml-auto shrink-0 font-mono text-xs text-muted tabular-nums">{step.detail}</span>
				</div>
				{#if step.state === 'active' && step.fraction !== null}
					<div class="ml-6 mt-2 h-1 overflow-hidden rounded-full bg-raised">
						<div class="h-full rounded-full bg-accent transition-[width] duration-150" style:width="{Math.round(step.fraction * 100)}%"></div>
					</div>
				{/if}
			</li>
		{/each}
	</ol>
</div>
