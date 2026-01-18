<script lang="ts">
	import { goto } from "$app/navigation";
	import ThemeToggle from "$lib/components/ThemeToggle.svelte";
	import VersionSelector from "$lib/components/VersionSelector.svelte";

	let packageType = $state<"npm" | "wp">("npm");
	let packageName = $state("");
	let fromVersion = $state("");
	let toVersion = $state("");
	let isLoading = $state(false);
	let isLoadingVersions = $state(false);
	let versions = $state<string[]>([]);
	let error = $state<string | null>(null);

	function getCsrfToken(): string {
		const match = document.cookie.match(/csrf_token=([^;]+)/);
		return match ? match[1] : "";
	}

	$effect(() => {
		packageType;
		versions = [];
		fromVersion = "";
		toVersion = "";
	});

	async function loadVersions() {
		if (!packageName.trim()) {
			error = "Please enter a package name";
			return;
		}

		error = null;
		isLoadingVersions = true;
		versions = [];

		try {
			const response = await fetch(`/api/versions?type=${packageType}&name=${encodeURIComponent(packageName.trim())}`, {
				headers: {
					"x-csrf-token": getCsrfToken(),
				},
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.message || "Failed to fetch versions");
			}

			const data = await response.json();
			versions = data.versions;

			if (versions.length >= 2) {
				toVersion = versions[0];
				fromVersion = versions[1];
			} else if (versions.length === 1) {
				toVersion = versions[0];
			}
		} catch (e) {
			error = e instanceof Error ? e.message : "Failed to fetch versions";
		} finally {
			isLoadingVersions = false;
		}
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = null;

		if (!packageName.trim()) {
			error = "Please enter a package name";
			return;
		}

		if (!fromVersion.trim() || !toVersion.trim()) {
			error = "Please enter both versions";
			return;
		}

		isLoading = true;

		try {
			if (packageType === "npm") {
				await goto(`/npm/${packageName.trim()}/${fromVersion.trim()}...${toVersion.trim()}`);
			} else {
				await goto(`/wp/${packageName.trim()}/${fromVersion.trim()}...${toVersion.trim()}`);
			}
		} catch {
			error = "Failed to navigate. Please check the package name and versions.";
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Diff - Compare package versions</title>
	<meta name="description" content="Compare different versions of npm packages and WordPress plugins" />
</svelte:head>

<div class="min-h-screen flex flex-col">
	<a href="#main-content" class="absolute -top-full left-4 px-4 py-2 bg-link text-white rounded no-underline font-medium z-[1000] transition-[top] duration-200 focus:top-4">Skip to main content</a>

	<header class="flex items-center justify-between px-6 py-4 border-b border-border">
		<span class="text-2xl font-bold text-text-primary">diff</span>
		<div class="flex items-center gap-2">
			<a href="https://github.com/almeidx/diff" class="flex items-center justify-center w-9 h-9 rounded-md text-text-secondary transition-all hover:bg-bg-secondary hover:text-text-primary hover:no-underline" target="_blank" rel="noopener" title="GitHub">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
					<path
						d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"
					/>
				</svg>
			</a>
			<a href="https://almeidx.dev" class="flex items-center justify-center w-9 h-9 rounded-md text-text-secondary transition-all hover:bg-bg-secondary hover:text-text-primary hover:no-underline" target="_blank" rel="noopener" title="almeidx.dev">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
					<path
						d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
					/>
				</svg>
			</a>
			<ThemeToggle />
		</div>
	</header>

	<main id="main-content" class="flex-1 flex flex-col items-center px-6 py-12 max-w-[600px] mx-auto w-full">
		<div class="text-center mb-8">
			<h1 class="text-3xl font-bold mb-2">Compare package versions</h1>
			<p class="text-text-secondary text-base">View the diff between two versions of npm packages or WordPress plugins</p>
		</div>

		<form class="w-full flex flex-col gap-5" onsubmit={handleSubmit}>
			<div class="flex gap-2 max-[480px]:flex-col">
				<button
					type="button"
					class="flex-1 flex items-center justify-center gap-2 px-4 py-3 border rounded-lg text-sm font-medium transition-all"
					class:border-border={packageType !== "npm"}
					class:bg-bg-secondary={packageType !== "npm"}
					class:text-text-secondary={packageType !== "npm"}
					class:hover:border-text-muted={packageType !== "npm"}
					class:hover:text-text-primary={packageType !== "npm"}
					class:border-link={packageType === "npm"}
					class:bg-[color-mix(in_srgb,var(--link-color)_10%,transparent)]={packageType === "npm"}
					class:text-link={packageType === "npm"}
					onclick={() => (packageType = "npm")}
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
						<path
							d="M0 7.334v8h6.666v1.332H12v-1.332h12v-8H0zm6.666 6.664H5.334v-4H3.999v4H1.335V8.667h5.331v5.331zm4 0v1.336H8.001V8.667h5.334v5.332h-2.669v-.001zm12.001 0h-1.33v-4h-1.336v4h-1.335v-4h-1.33v4h-2.671V8.667h8.002v5.331z"
						/>
					</svg>
					npm
				</button>
				<button
					type="button"
					class="flex-1 flex items-center justify-center gap-2 px-4 py-3 border rounded-lg text-sm font-medium transition-all"
					class:border-border={packageType !== "wp"}
					class:bg-bg-secondary={packageType !== "wp"}
					class:text-text-secondary={packageType !== "wp"}
					class:hover:border-text-muted={packageType !== "wp"}
					class:hover:text-text-primary={packageType !== "wp"}
					class:border-link={packageType === "wp"}
					class:bg-[color-mix(in_srgb,var(--link-color)_10%,transparent)]={packageType === "wp"}
					class:text-link={packageType === "wp"}
					onclick={() => (packageType = "wp")}
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
						<path
							d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zM3.443 12c0-1.156.238-2.256.659-3.262l3.63 9.939A8.564 8.564 0 013.443 12zm8.557 8.557c-.883 0-1.736-.122-2.546-.348l2.703-7.858 2.768 7.585c.018.044.039.085.063.123a8.508 8.508 0 01-2.988.498zm1.172-12.584c.542-.028 1.03-.085 1.03-.085.485-.057.428-.77-.057-.742 0 0-1.458.114-2.4.114-.884 0-2.37-.114-2.37-.114-.485-.028-.542.713-.057.742 0 0 .459.057.943.085l1.401 3.838-1.968 5.901-3.274-9.739c.542-.028 1.03-.085 1.03-.085.485-.057.428-.77-.057-.742 0 0-1.458.114-2.4.114-.169 0-.367-.004-.58-.01A8.538 8.538 0 0112 3.443c2.258 0 4.318.874 5.855 2.3-.037-.002-.072-.008-.11-.008-.884 0-1.512.77-1.512 1.598 0 .742.428 1.37.884 2.113.343.599.742 1.37.742 2.483 0 .77-.296 1.663-.685 2.908l-.898 2.998-3.104-9.239zm4.534 10.946l2.748-7.946c.514-1.284.685-2.31.685-3.224 0-.332-.021-.64-.061-.927a8.558 8.558 0 01-3.372 12.097z"
						/>
					</svg>
					WordPress
				</button>
			</div>

			<div class="flex gap-3 items-end max-[480px]:flex-col max-[480px]:items-stretch">
				<div class="flex flex-col gap-1.5 flex-1">
					<label for="package-name" class="text-xs font-medium text-text-secondary">
						{packageType === "npm" ? "Package name" : "Plugin slug"}
					</label>
					<input
						type="text"
						id="package-name"
						bind:value={packageName}
						placeholder={packageType === "npm" ? "e.g. lodash, @types/node" : "e.g. akismet, jetpack"}
						onkeydown={(e) => e.key === "Enter" && (e.preventDefault(), loadVersions())}
						class="px-3.5 py-2.5 border border-border rounded-lg bg-bg-primary text-text-primary text-sm focus:border-link focus:outline-none"
					/>
				</div>
				<button
					type="button"
					class="flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-lg bg-bg-secondary text-text-primary text-sm font-medium whitespace-nowrap transition-all hover:border-link hover:text-link disabled:opacity-60 disabled:cursor-not-allowed"
					onclick={loadVersions}
					disabled={isLoadingVersions || !packageName.trim()}
				>
					{#if isLoadingVersions}
						<span class="w-4 h-4 border-2 border-transparent border-t-current rounded-full animate-spin"></span>
						Loading...
					{:else}
						Load versions
					{/if}
				</button>
			</div>

			<div class="flex items-end gap-3 max-[480px]:flex-col max-[480px]:items-stretch">
				{#if versions.length > 0}
					<div class="flex-1 min-w-0">
						<VersionSelector
							{versions}
							value={fromVersion}
							onchange={(v) => (fromVersion = v)}
							label="From version"
							id="from-version"
							disabledVersion={toVersion}
							loading={isLoading}
						/>
					</div>
					<span class="pb-3 text-text-muted text-lg max-[480px]:hidden">→</span>
					<div class="flex-1 min-w-0">
						<VersionSelector
							{versions}
							value={toVersion}
							onchange={(v) => (toVersion = v)}
							label="To version"
							id="to-version"
							disabledVersion={fromVersion}
							loading={isLoading}
						/>
					</div>
				{:else}
					<div class="flex flex-col gap-1.5 flex-1 min-w-0">
						<label for="from-version" class="text-xs font-medium text-text-secondary">From version</label>
						<input
							type="text"
							id="from-version"
							bind:value={fromVersion}
							placeholder="e.g. 1.0.0"
							class="px-3.5 py-2.5 border border-border rounded-lg bg-bg-primary text-text-primary text-sm focus:border-link focus:outline-none"
						/>
					</div>
					<span class="pb-3 text-text-muted text-lg max-[480px]:hidden">→</span>
					<div class="flex flex-col gap-1.5 flex-1 min-w-0">
						<label for="to-version" class="text-xs font-medium text-text-secondary">To version</label>
						<input
							type="text"
							id="to-version"
							bind:value={toVersion}
							placeholder="e.g. 2.0.0"
							class="px-3.5 py-2.5 border border-border rounded-lg bg-bg-primary text-text-primary text-sm focus:border-link focus:outline-none"
						/>
					</div>
				{/if}
			</div>

			{#if error}
				<div class="px-4 py-3 bg-diff-delete-bg border border-diff-delete-text rounded-lg text-diff-delete-text text-sm">{error}</div>
			{/if}

			<button
				type="submit"
				class="flex items-center justify-center gap-2 px-6 py-3 border-none rounded-lg bg-link text-white text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
				disabled={isLoading}
			>
				{#if isLoading}
					<span class="w-4 h-4 border-2 border-transparent border-t-current rounded-full animate-spin"></span>
					Loading...
				{:else}
					Compare versions
				{/if}
			</button>
		</form>

		<div class="mt-8 p-4 bg-bg-secondary border border-border rounded-lg text-center">
			<p class="text-sm text-text-secondary m-0">Need to compare larger packages? Run locally to bypass size limits.</p>
			<p class="text-sm text-text-secondary m-0 mt-2"><a href="https://github.com/almeidx/diff" target="_blank" rel="noopener" class="text-link no-underline hover:underline">View on GitHub</a></p>
		</div>
	</main>
</div>
