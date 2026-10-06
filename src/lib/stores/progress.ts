import { writable } from "svelte/store";
import type { LoadDiffPageResult } from "#lib/diff/load-diff-page.js";
import type { CompareProgress, PackageType } from "#lib/types/index.js";
import type { ArchiveLimits } from "#lib/archive/limits.js";
import { compare } from "#lib/compare/client.js";

export type ProgressStepStatus = "pending" | "active" | "done";

export interface ProgressStep {
	id: string;
	lead: string;
	emphasis: string;
	status: ProgressStepStatus;
	/** 0-100 while the step reports measurable progress; null when indeterminate. */
	percent: number | null;
}

interface CompareProgressState {
	active: boolean;
	steps: ProgressStep[];
}

const STEP_DEFS: Array<Pick<ProgressStep, "id" | "lead" | "emphasis">> = [
	{ id: "metadata", lead: "Fetching", emphasis: "package metadata" },
	{ id: "download-from", lead: "Downloading", emphasis: "previous version" },
	{ id: "download-to", lead: "Downloading", emphasis: "new version" },
	{ id: "diff", lead: "Extracting and computing", emphasis: "the diff" },
];

function idleSteps(): ProgressStep[] {
	return STEP_DEFS.map((def) => ({ ...def, status: "pending" as const, percent: null }));
}

export const compareProgress = writable<CompareProgressState>({ active: false, steps: idleSteps() });

/** Maps a pipeline progress event onto the step list; stages may overlap (downloads run in parallel). */
export function applyCompareProgress(progress: CompareProgress): void {
	compareProgress.update((state) => ({
		active: true,
		steps: state.steps.map((step): ProgressStep => {
			if (progress.stage === "metadata") {
				return step.id === "metadata" ? { ...step, status: progress.done ? "done" : "active" } : step;
			}

			if (progress.stage === "download") {
				const stepId = progress.side === "from" ? "download-from" : "download-to";
				if (step.id !== stepId) return step;
				if (progress.done) return { ...step, status: "done", percent: null };
				const percent =
					progress.bytes !== undefined && progress.totalBytes
						? Math.min(100, Math.floor((progress.bytes / progress.totalBytes) * 100))
						: null;
				return { ...step, status: "active", percent };
			}

			return step.id === "diff" ? { ...step, status: "active" } : step;
		}),
	}));
}

export function beginCompareProgress(): void {
	compareProgress.set({ active: true, steps: idleSteps() });
}

export function endCompareProgress(): void {
	compareProgress.set({ active: false, steps: idleSteps() });
}

/** Runs a comparison while driving the shared progress panel shown during navigation. */
export async function compareWithProgress(
	type: PackageType,
	name: string,
	fromVersion: string,
	toVersion: string,
	limits?: ArchiveLimits,
): Promise<LoadDiffPageResult> {
	beginCompareProgress();
	try {
		return await compare(type, name, fromVersion, toVersion, applyCompareProgress, limits);
	} finally {
		endCompareProgress();
	}
}
