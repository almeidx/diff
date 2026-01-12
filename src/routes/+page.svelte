<script lang="ts">
	import { goto } from '$app/navigation';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	let packageType = $state<'npm' | 'wp'>('npm');
	let packageName = $state('');
	let fromVersion = $state('');
	let toVersion = $state('');
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = null;

		if (!packageName.trim()) {
			error = 'Please enter a package name';
			return;
		}

		if (!fromVersion.trim() || !toVersion.trim()) {
			error = 'Please enter both versions';
			return;
		}

		isLoading = true;

		try {
			if (packageType === 'npm') {
				await goto(`/npm/${packageName.trim()}/${fromVersion.trim()}...${toVersion.trim()}`);
			} else {
				await goto(`/wp/${packageName.trim()}/${fromVersion.trim()}...${toVersion.trim()}`);
			}
		} catch {
			error = 'Failed to navigate. Please check the package name and versions.';
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Diff - Compare package versions</title>
	<meta name="description" content="Compare different versions of npm packages and WordPress plugins" />
</svelte:head>

<div class="home">
	<header class="header">
		<span class="logo">diff</span>
		<ThemeToggle />
	</header>

	<main class="main">
		<div class="hero">
			<h1>Compare package versions</h1>
			<p>View the diff between two versions of npm packages or WordPress plugins</p>
		</div>

		<form class="compare-form" onsubmit={handleSubmit}>
			<div class="type-selector">
				<button
					type="button"
					class="type-btn"
					class:active={packageType === 'npm'}
					onclick={() => (packageType = 'npm')}
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
						<path d="M0 7.334v8h6.666v1.332H12v-1.332h12v-8H0zm6.666 6.664H5.334v-4H3.999v4H1.335V8.667h5.331v5.331zm4 0v1.336H8.001V8.667h5.334v5.332h-2.669v-.001zm12.001 0h-1.33v-4h-1.336v4h-1.335v-4h-1.33v4h-2.671V8.667h8.002v5.331z" />
					</svg>
					npm
				</button>
				<button
					type="button"
					class="type-btn"
					class:active={packageType === 'wp'}
					onclick={() => (packageType = 'wp')}
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zM3.443 12c0-1.156.238-2.256.659-3.262l3.63 9.939A8.564 8.564 0 013.443 12zm8.557 8.557c-.883 0-1.736-.122-2.546-.348l2.703-7.858 2.768 7.585c.018.044.039.085.063.123a8.508 8.508 0 01-2.988.498zm1.172-12.584c.542-.028 1.03-.085 1.03-.085.485-.057.428-.77-.057-.742 0 0-1.458.114-2.4.114-.884 0-2.37-.114-2.37-.114-.485-.028-.542.713-.057.742 0 0 .459.057.943.085l1.401 3.838-1.968 5.901-3.274-9.739c.542-.028 1.03-.085 1.03-.085.485-.057.428-.77-.057-.742 0 0-1.458.114-2.4.114-.169 0-.367-.004-.58-.01A8.538 8.538 0 0112 3.443c2.258 0 4.318.874 5.855 2.3-.037-.002-.072-.008-.11-.008-.884 0-1.512.77-1.512 1.598 0 .742.428 1.37.884 2.113.343.599.742 1.37.742 2.483 0 .77-.296 1.663-.685 2.908l-.898 2.998-3.104-9.239zm4.534 10.946l2.748-7.946c.514-1.284.685-2.31.685-3.224 0-.332-.021-.64-.061-.927a8.558 8.558 0 01-3.372 12.097z" />
					</svg>
					WordPress
				</button>
			</div>

			<div class="form-group">
				<label for="package-name">
					{packageType === 'npm' ? 'Package name' : 'Plugin slug'}
				</label>
				<input
					type="text"
					id="package-name"
					bind:value={packageName}
					placeholder={packageType === 'npm' ? 'e.g. lodash, @types/node' : 'e.g. akismet, jetpack'}
				/>
			</div>

			<div class="version-inputs">
				<div class="form-group">
					<label for="from-version">From version</label>
					<input
						type="text"
						id="from-version"
						bind:value={fromVersion}
						placeholder="e.g. 1.0.0"
					/>
				</div>
				<span class="arrow">→</span>
				<div class="form-group">
					<label for="to-version">To version</label>
					<input
						type="text"
						id="to-version"
						bind:value={toVersion}
						placeholder="e.g. 2.0.0"
					/>
				</div>
			</div>

			{#if error}
				<div class="error">{error}</div>
			{/if}

			<button type="submit" class="submit-btn" disabled={isLoading}>
				{#if isLoading}
					<span class="spinner"></span>
					Loading...
				{:else}
					Compare versions
				{/if}
			</button>
		</form>

		<div class="examples">
			<h2>Examples</h2>
			<div class="example-list">
				<a href="/npm/lodash/4.17.20...4.17.21" class="example">
					<span class="example-type">npm</span>
					<span class="example-name">lodash 4.17.20 → 4.17.21</span>
				</a>
				<a href="/npm/@types/node/18.0.0...20.0.0" class="example">
					<span class="example-type">npm</span>
					<span class="example-name">@types/node 18.0.0 → 20.0.0</span>
				</a>
				<a href="/wp/akismet/5.0...5.1" class="example">
					<span class="example-type">wp</span>
					<span class="example-name">akismet 5.0 → 5.1</span>
				</a>
			</div>
		</div>
	</main>

	<footer class="footer">
		<p>
			Keyboard shortcuts: <kbd>j</kbd>/<kbd>k</kbd> navigate files, <kbd>n</kbd>/<kbd>p</kbd> navigate hunks
		</p>
	</footer>
</div>

<style>
	.home {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 24px;
		border-bottom: 1px solid var(--border-color);
	}

	.logo {
		font-size: 24px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.main {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 48px 24px;
		max-width: 600px;
		margin: 0 auto;
		width: 100%;
	}

	.hero {
		text-align: center;
		margin-bottom: 32px;
	}

	.hero h1 {
		font-size: 32px;
		font-weight: 700;
		margin-bottom: 8px;
	}

	.hero p {
		color: var(--text-secondary);
		font-size: 16px;
	}

	.compare-form {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.type-selector {
		display: flex;
		gap: 8px;
	}

	.type-btn {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 12px 16px;
		border: 1px solid var(--border-color);
		border-radius: 8px;
		background: var(--bg-secondary);
		color: var(--text-secondary);
		font-size: 14px;
		font-weight: 500;
		transition: all 0.15s ease;
	}

	.type-btn:hover {
		border-color: var(--text-muted);
		color: var(--text-primary);
	}

	.type-btn.active {
		border-color: var(--link-color);
		background: color-mix(in srgb, var(--link-color) 10%, transparent);
		color: var(--link-color);
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.form-group label {
		font-size: 12px;
		font-weight: 500;
		color: var(--text-secondary);
	}

	.form-group input {
		padding: 10px 14px;
		border: 1px solid var(--border-color);
		border-radius: 8px;
		background: var(--bg-primary);
		color: var(--text-primary);
		font-size: 14px;
	}

	.form-group input:focus {
		border-color: var(--link-color);
		outline: none;
	}

	.version-inputs {
		display: flex;
		align-items: flex-end;
		gap: 12px;
	}

	.version-inputs .form-group {
		flex: 1;
	}

	.arrow {
		padding-bottom: 12px;
		color: var(--text-muted);
		font-size: 18px;
	}

	.error {
		padding: 12px 16px;
		background: var(--diff-delete-bg);
		border: 1px solid var(--diff-delete-text);
		border-radius: 8px;
		color: var(--diff-delete-text);
		font-size: 14px;
	}

	.submit-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 12px 24px;
		border: none;
		border-radius: 8px;
		background: var(--link-color);
		color: white;
		font-size: 14px;
		font-weight: 500;
		transition: opacity 0.15s ease;
	}

	.submit-btn:hover:not(:disabled) {
		opacity: 0.9;
	}

	.submit-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.spinner {
		width: 16px;
		height: 16px;
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

	.examples {
		margin-top: 48px;
		width: 100%;
	}

	.examples h2 {
		font-size: 14px;
		font-weight: 500;
		color: var(--text-secondary);
		margin-bottom: 12px;
	}

	.example-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.example {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		border: 1px solid var(--border-color);
		border-radius: 8px;
		color: var(--text-primary);
		text-decoration: none;
		transition: all 0.15s ease;
	}

	.example:hover {
		border-color: var(--link-color);
		background: var(--bg-secondary);
	}

	.example-type {
		padding: 2px 8px;
		background: var(--bg-tertiary);
		border-radius: 4px;
		font-size: 11px;
		font-weight: 500;
		color: var(--text-muted);
		text-transform: uppercase;
	}

	.example-name {
		font-family: ui-monospace, monospace;
		font-size: 13px;
	}

	.footer {
		padding: 16px 24px;
		border-top: 1px solid var(--border-color);
		text-align: center;
	}

	.footer p {
		font-size: 12px;
		color: var(--text-muted);
	}

	.footer kbd {
		display: inline-block;
		padding: 2px 6px;
		margin: 0 2px;
		background: var(--bg-tertiary);
		border: 1px solid var(--border-color);
		border-radius: 4px;
		font-family: ui-monospace, monospace;
		font-size: 11px;
	}

	@media (max-width: 480px) {
		.version-inputs {
			flex-direction: column;
		}

		.arrow {
			display: none;
		}

		.type-selector {
			flex-direction: column;
		}
	}
</style>
