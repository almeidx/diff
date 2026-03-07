import { writable } from "svelte/store";

export type ViewMode = "unified" | "split";
export type Theme = "light" | "dark";

export const viewMode = writable<ViewMode>("unified");
export const theme = writable<Theme>("dark");
export const wordWrap = writable<boolean>(false);
export const collapsedFiles = writable<Set<string>>(new Set());

export function toggleFileCollapse(path: string): void {
	collapsedFiles.update((set) => {
		const newSet = new Set(set);
		if (newSet.has(path)) {
			newSet.delete(path);
		} else {
			newSet.add(path);
		}
		return newSet;
	});
}

export function setCollapsedFiles(paths: Iterable<string>): void {
	collapsedFiles.set(new Set(paths));
}
