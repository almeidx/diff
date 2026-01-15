import { writable } from 'svelte/store';

export type ViewMode = 'unified' | 'split';
export type Theme = 'light' | 'dark';

export const viewMode = writable<ViewMode>('unified');
export const theme = writable<Theme>('dark');
export const wordWrap = writable<boolean>(false);
export const expandedPaths = writable<Set<string>>(new Set());
export const collapsedFiles = writable<Set<string>>(new Set());

export function togglePath(path: string): void {
	expandedPaths.update((set) => {
		const newSet = new Set(set);
		if (newSet.has(path)) {
			newSet.delete(path);
		} else {
			newSet.add(path);
		}
		return newSet;
	});
}

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

export function expandAllPaths(paths: string[]): void {
	expandedPaths.update(() => new Set(paths));
}

export function collapseAllPaths(): void {
	expandedPaths.update(() => new Set());
}
