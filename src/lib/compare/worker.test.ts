import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LoadDiffPageResult } from "#lib/diff/load-diff-page.js";
import type { CompareProgress } from "#lib/types/index.js";
import * as core from "./core.js";
import { handleRequest } from "./worker.js";

vi.mock("./core.js", () => ({ versions: vi.fn(), compare: vi.fn(), fileContents: vi.fn() }));

const compareMock = vi.mocked(core.compare);
const versionsMock = vi.mocked(core.versions);

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

describe("worker request handling", () => {
	beforeEach(() => {
		compareMock.mockReset();
	});

	it("forwards compare progress events as protocol messages", async () => {
		compareMock.mockImplementation((_type, _name, _from, _to, onProgress) => {
			onProgress?.({ stage: "metadata" });
			onProgress?.({ stage: "download", side: "from", bytes: 10, totalBytes: 20 });
			return Promise.resolve(result());
		});

		const emitted: CompareProgress[] = [];
		const response = await handleRequest(
			{ id: 7, kind: "compare", type: "npm", name: "pkg", fromVersion: "1.0.0", toVersion: "2.0.0" },
			(progress) => emitted.push(progress),
		);

		expect(emitted).toEqual([{ stage: "metadata" }, { stage: "download", side: "from", bytes: 10, totalBytes: 20 }]);
		expect(response).toMatchObject({ id: 7, kind: "result" });
	});

	it("does not emit progress for versions requests", async () => {
		versionsMock.mockResolvedValue(["1.0.0"]);

		const emitted: CompareProgress[] = [];
		const response = await handleRequest({ id: 3, kind: "versions", type: "npm", name: "pkg" }, (progress) =>
			emitted.push(progress),
		);

		expect(emitted).toEqual([]);
		expect(response).toMatchObject({ id: 3, kind: "result", value: ["1.0.0"] });
	});
});
