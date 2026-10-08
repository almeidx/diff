import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "#lib/compare/client.js";
import type { LoadDiffPageResult } from "#lib/diff/load-diff-page.js";
import type { CompareProgress } from "#lib/types/index.js";
import type { ProgressStep } from "./progress.js";
import {
	applyCompareProgress,
	beginCompareProgress,
	compareProgress,
	compareWithProgress,
	endCompareProgress,
} from "./progress.js";

vi.mock("#lib/compare/client.js", () => ({ compare: vi.fn() }));

const compareMock = vi.mocked(client.compare);

interface ProgressSnapshot {
	active: boolean;
	steps: Pick<ProgressStep, "id" | "status" | "percent">[];
}

function getSnapshot(): ProgressSnapshot {
	let snapshot!: ProgressSnapshot;
	const unsubscribe = compareProgress.subscribe((state) => {
		snapshot = {
			active: state.active,
			steps: state.steps.map((step) => ({ id: step.id, status: step.status, percent: step.percent })),
		};
	});
	unsubscribe();
	return snapshot;
}

function result(): LoadDiffPageResult {
	return {
		diff: {
			packageType: "npm",
			packageName: "pkg",
			fromVersion: "1.0.0",
			toVersion: "2.0.0",
			files: [],
			stats: { files: 0, insertions: 0, deletions: 0 },
		},
		versions: [],
	};
}

describe("compare progress store", () => {
	beforeEach(() => {
		compareMock.mockReset();
		endCompareProgress();
	});

	it("maps metadata, download, and diff events onto steps", () => {
		beginCompareProgress();

		let state = getSnapshot();
		expect(state.active).toBe(true);
		expect(state.steps.map((s) => s.status)).toEqual(["pending", "pending", "pending", "pending"]);

		applyCompareProgress({ stage: "metadata" });
		state = getSnapshot();
		expect(state.steps[0]).toMatchObject({ id: "metadata", status: "active" });

		applyCompareProgress({ stage: "metadata", done: true });
		state = getSnapshot();
		expect(state.steps[0].status).toBe("done");

		applyCompareProgress({ stage: "download", side: "from", bytes: 42, totalBytes: 100 });
		state = getSnapshot();
		expect(state.steps[1]).toMatchObject({ id: "download-from", status: "active", percent: 42 });

		applyCompareProgress({ stage: "download", side: "to", bytes: 5, totalBytes: 10 });
		state = getSnapshot();
		expect(state.steps[2]).toMatchObject({ id: "download-to", status: "active", percent: 50 });

		applyCompareProgress({ stage: "download", side: "from", done: true });
		state = getSnapshot();
		expect(state.steps[1]).toMatchObject({ status: "done", percent: null });

		applyCompareProgress({ stage: "diff" });
		state = getSnapshot();
		expect(state.steps[3]).toMatchObject({ id: "diff", status: "active" });
	});

	it("treats missing content-length as indeterminate", () => {
		beginCompareProgress();
		applyCompareProgress({ stage: "download", side: "to", bytes: 1234, totalBytes: null });

		const state = getSnapshot();
		expect(state.steps[2]).toMatchObject({ status: "active", percent: null });
	});

	it("caps percent at 100", () => {
		beginCompareProgress();
		applyCompareProgress({ stage: "download", side: "from", bytes: 250, totalBytes: 100 });

		const state = getSnapshot();
		expect(state.steps[1].percent).toBe(100);
	});

	it("shows the panel for the duration of compareWithProgress and resets afterwards", async () => {
		let releaseCompare!: (value: LoadDiffPageResult) => void;
		compareMock.mockImplementation(
			(_type, _name, _from, _to, onProgress) =>
				new Promise<LoadDiffPageResult>((resolve) => {
					releaseCompare = (value) => {
						onProgress?.({ stage: "metadata", done: true } satisfies CompareProgress);
						resolve(value);
					};
				}),
		);

		const pending = compareWithProgress("npm", "pkg", "1.0.0", "2.0.0");

		let state = getSnapshot();
		expect(state.active).toBe(true);

		releaseCompare(result());
		await pending;

		state = getSnapshot();
		expect(state.active).toBe(false);
		expect(state.steps.every((step) => step.status === "pending")).toBe(true);
	});

	it("resets the panel when compare throws", async () => {
		compareMock.mockRejectedValue(new Error('Package "pkg" not found on npm'));

		await expect(compareWithProgress("npm", "pkg", "1.0.0", "2.0.0")).rejects.toThrow("not found");

		const state = getSnapshot();
		expect(state.active).toBe(false);
	});
});
