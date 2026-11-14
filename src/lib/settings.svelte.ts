import { browser } from "$app/env";

export type Theme = "light" | "dark";
export type DiffStyle = "unified" | "split";

function read<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
	if (!browser) return fallback;
	try {
		const value = localStorage.getItem(key);
		return allowed.includes(value as T) ? (value as T) : fallback;
	} catch {
		return fallback;
	}
}

function write(key: string, value: string): void {
	try {
		localStorage.setItem(key, value);
	} catch {
		// Storage can be disabled; the setting still applies for this page.
	}
}

/** Viewer preferences, persisted per browser. `static/theme-init.js` applies the theme before first paint. */
class Settings {
	#theme = $state<Theme>(browser && document.documentElement.dataset.theme === "light" ? "light" : "dark");
	#diffStyle = $state<DiffStyle>(read("diff-style", ["unified", "split"], "split"));
	#wrap = $state(read("wrap", ["on", "off"], "off") === "on");

	get theme(): Theme {
		return this.#theme;
	}

	set theme(value: Theme) {
		this.#theme = value;
		document.documentElement.dataset.theme = value;
		write("theme", value);
	}

	get diffStyle(): DiffStyle {
		return this.#diffStyle;
	}

	set diffStyle(value: DiffStyle) {
		this.#diffStyle = value;
		write("diff-style", value);
	}

	get wrap(): boolean {
		return this.#wrap;
	}

	set wrap(value: boolean) {
		this.#wrap = value;
		write("wrap", value ? "on" : "off");
	}
}

export const settings = new Settings();
