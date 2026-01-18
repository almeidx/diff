<script lang="ts">
	interface Props {
		currentStep: 'fetching-v1' | 'fetching-v2' | 'computing' | 'done';
		fromVersion: string;
		toVersion: string;
	}

	let { currentStep, fromVersion, toVersion }: Props = $props();

	let steps = $derived([
		{ id: 'fetching-v1', label: `Fetching ${fromVersion}` },
		{ id: 'fetching-v2', label: `Fetching ${toVersion}` },
		{ id: 'computing', label: 'Computing diff' }
	]);

	function getStepStatus(
		stepId: string
	): 'pending' | 'active' | 'complete' {
		const currentIndex = steps.findIndex((s) => s.id === currentStep);
		const stepIndex = steps.findIndex((s) => s.id === stepId);

		if (currentStep === 'done' || stepIndex < currentIndex) {
			return 'complete';
		}
		if (stepIndex === currentIndex) {
			return 'active';
		}
		return 'pending';
	}
</script>

<div class="flex items-center justify-center gap-2 p-6 max-md:flex-col max-md:gap-3">
	{#each steps as step, index (step.id)}
		{@const status = getStepStatus(step.id)}
		<div
			class="flex items-center gap-2"
			class:text-text-muted={status === 'pending'}
			class:text-link={status === 'active'}
			class:text-diff-add-text={status === 'complete'}
		>
			<div
				class="flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium"
				class:bg-bg-tertiary={status === 'pending'}
				class:bg-link={status === 'active'}
				class:bg-diff-add-text={status === 'complete'}
				class:text-white={status === 'active' || status === 'complete'}
			>
				{#if status === 'complete'}
					<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
						<path
							d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 111.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"
						/>
					</svg>
				{:else if status === 'active'}
					<div class="w-3.5 h-3.5 border-2 border-transparent border-t-current rounded-full animate-spin"></div>
				{:else}
					<span>{index + 1}</span>
				{/if}
			</div>
			<span class="text-[13px] font-medium">{step.label}</span>
		</div>
		{#if index < steps.length - 1}
			<div
				class="w-10 h-0.5 max-md:w-0.5 max-md:h-5"
				class:bg-border={status !== 'complete'}
				class:bg-diff-add-text={status === 'complete'}
			></div>
		{/if}
	{/each}
</div>
