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

<div class="progress-steps">
	{#each steps as step, index (step.id)}
		{@const status = getStepStatus(step.id)}
		<div class="step" class:active={status === 'active'} class:complete={status === 'complete'}>
			<div class="step-indicator">
				{#if status === 'complete'}
					<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
						<path
							d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 111.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"
						/>
					</svg>
				{:else if status === 'active'}
					<div class="spinner"></div>
				{:else}
					<span class="step-number">{index + 1}</span>
				{/if}
			</div>
			<span class="step-label">{step.label}</span>
		</div>
		{#if index < steps.length - 1}
			<div class="step-connector" class:complete={status === 'complete'}></div>
		{/if}
	{/each}
</div>

<style>
	.progress-steps {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 24px;
	}

	.step {
		display: flex;
		align-items: center;
		gap: 8px;
		color: var(--text-muted);
	}

	.step.active {
		color: var(--link-color);
	}

	.step.complete {
		color: var(--diff-add-text);
	}

	.step-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: var(--bg-tertiary);
		font-size: 12px;
		font-weight: 500;
	}

	.step.active .step-indicator {
		background: var(--link-color);
		color: white;
	}

	.step.complete .step-indicator {
		background: var(--diff-add-text);
		color: white;
	}

	.spinner {
		width: 14px;
		height: 14px;
		border: 2px solid transparent;
		border-top-color: currentColor;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.step-label {
		font-size: 13px;
		font-weight: 500;
	}

	.step-connector {
		width: 40px;
		height: 2px;
		background: var(--border-color);
	}

	.step-connector.complete {
		background: var(--diff-add-text);
	}

	@media (max-width: 600px) {
		.progress-steps {
			flex-direction: column;
			gap: 12px;
		}

		.step-connector {
			width: 2px;
			height: 20px;
		}
	}
</style>
