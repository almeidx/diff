import { writable, derived } from 'svelte/store';
import type { DiffFile } from '$lib/types/index.js';

export const files = writable<DiffFile[]>([]);
export const currentFileIndex = writable(0);
export const currentHunkIndex = writable(0);

export const currentFile = derived([files, currentFileIndex], ([$files, $index]) => {
	return $files[$index] ?? null;
});

export const currentHunk = derived(
	[currentFile, currentHunkIndex],
	([$file, $hunkIndex]) => {
		return $file?.hunks[$hunkIndex] ?? null;
	}
);

export function nextFile(): void {
	files.subscribe(($files) => {
		currentFileIndex.update((i) => Math.min(i + 1, $files.length - 1));
		currentHunkIndex.set(0);
	})();
}

export function prevFile(): void {
	currentFileIndex.update((i) => Math.max(i - 1, 0));
	currentHunkIndex.set(0);
}

export function nextHunk(): void {
	currentFile.subscribe(($file) => {
		if ($file) {
			currentHunkIndex.update((i) => Math.min(i + 1, $file.hunks.length - 1));
		}
	})();
}

export function prevHunk(): void {
	currentHunkIndex.update((i) => Math.max(i - 1, 0));
}

export function goToFile(index: number): void {
	currentFileIndex.set(index);
	currentHunkIndex.set(0);
}

export function setFiles(newFiles: DiffFile[]): void {
	files.set(newFiles);
	currentFileIndex.set(0);
	currentHunkIndex.set(0);
}
